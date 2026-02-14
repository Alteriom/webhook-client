/**
 * REST API client for Alteriom Webhook Connector
 * @module client
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  WebhookEvent,
  EventAggregate,
  Enrichment,
  Delivery,
  Subscriber,
  EventListParams,
  CreateSubscriberRequest,
  UpdateSubscriberRequest,
  PaginatedResponse,
} from './types';
import { ApiError, RateLimitError } from './errors';

/**
 * Client configuration
 */
export interface ClientConfig {
  baseURL: string;
  apiKey: string;
  timeout?: number; // Default: 30000ms
  retry?: {
    maxRetries?: number; // Default: 3
    backoffBase?: number; // Default: 1000ms
    backoffMultiplier?: number; // Default: 2
  };
  rateLimit?: {
    maxRequests?: number; // Default: 100
    perMs?: number; // Default: 60000ms (1 minute)
  };
}

/**
 * Token bucket rate limiter
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private config: {
      maxRequests: number;
      perMs: number;
    }
  ) {
    this.tokens = config.maxRequests;
    this.lastRefill = Date.now();
  }

  async acquire(): Promise<void> {
    this.refillTokens();

    if (this.tokens <= 0) {
      const waitTime = this.config.perMs - (Date.now() - this.lastRefill);
      await this.sleep(waitTime);
      this.refillTokens();
    }

    this.tokens--;
  }

  private refillTokens(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;

    if (elapsed >= this.config.perMs) {
      this.tokens = this.config.maxRequests;
      this.lastRefill = now;
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

/**
 * Retry logic with exponential backoff
 */
class RetryLogic {
  constructor(
    private config: {
      maxRetries: number;
      backoffBase: number;
      backoffMultiplier: number;
    }
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error as Error;

        // Don't retry 4xx errors (except 429)
        if (error instanceof AxiosError && error.response) {
          const status = error.response.status;
          if (status >= 400 && status < 500 && status !== 429) {
            throw this.createApiError(error);
          }
        }

        // Check Retry-After header
        if (error instanceof AxiosError && error.response) {
          const retryAfter = error.response.headers['retry-after'];
          const delay = retryAfter
            ? parseInt(retryAfter) * 1000
            : this.calculateBackoff(attempt);

          if (attempt < this.config.maxRetries) {
            await this.sleep(delay);
          }
        } else if (attempt < this.config.maxRetries) {
          await this.sleep(this.calculateBackoff(attempt));
        }
      }
    }

    throw lastError!;
  }

  private calculateBackoff(attempt: number): number {
    return (
      this.config.backoffBase *
      Math.pow(this.config.backoffMultiplier, attempt)
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private createApiError(error: AxiosError): Error {
    if (error.response) {
      const status = error.response.status;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = error.response.data as any;

      if (status === 429) {
        return new RateLimitError(
          parseInt(error.response.headers['retry-after'] || '60'),
          parseInt(error.response.headers['x-ratelimit-limit'] || '100'),
          parseInt(error.response.headers['x-ratelimit-remaining'] || '0')
        );
      }

      return new ApiError(
        data?.error || error.message,
        status,
        data?.details
      );
    }

    return error;
  }
}

/**
 * Main webhook client class
 */
export class AlteriomWebhookClient {
  private http: AxiosInstance;
  private retryLogic: RetryLogic;
  private rateLimiter: RateLimiter;

  constructor(config: ClientConfig) {
    this.http = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout ?? 30000,
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Client-Version': '0.0.1',
        'X-API-Version': '1.0',
      },
    });

    this.retryLogic = new RetryLogic({
      maxRetries: config.retry?.maxRetries ?? 3,
      backoffBase: config.retry?.backoffBase ?? 1000,
      backoffMultiplier: config.retry?.backoffMultiplier ?? 2,
    });

    this.rateLimiter = new RateLimiter({
      maxRequests: config.rateLimit?.maxRequests ?? 100,
      perMs: config.rateLimit?.perMs ?? 60000,
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor: Add correlation ID
    this.http.interceptors.request.use((config) => {
      config.headers['X-Request-ID'] = crypto.randomUUID();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (config as any).meta = { startTime: Date.now() };
      return config;
    });

    // Response interceptor: Log performance  
    this.http.interceptors.response.use(
      (response) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const duration = Date.now() - (response.config as any).meta.startTime;
        console.debug('API call', {
          method: response.config.method,
          url: response.config.url,
          status: response.status,
          duration,
        });
        return response;
      },
      (error) => {
        console.error('API error', {
          url: error.config?.url,
          status: error.response?.status,
          message: error.message,
        });
        throw error;
      }
    );
  }

  /**
   * Events API
   */
  public readonly events = {
    /**
     * List events with optional filters
     */
    list: async (params?: EventListParams): Promise<PaginatedResponse<WebhookEvent>> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/events', { params });
        return {
          data: data.events,
          total: data.total,
          page: params?.page ?? 1,
          limit: params?.limit ?? 50,
          hasMore: data.events.length === (params?.limit ?? 50),
        };
      });
    },

    /**
     * Get event by ID
     */
    get: async (id: string): Promise<WebhookEvent> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get(`/api/v1/events/${id}`);
        return data;
      });
    },
  };

  /**
   * Aggregates API
   */
  public readonly aggregates = {
    /**
     * List aggregates
     */
    list: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<EventAggregate>> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/aggregates', { params });
        return {
          data: data.aggregates,
          total: data.total,
          page: params?.page ?? 1,
          limit: params?.limit ?? 50,
          hasMore: data.aggregates.length === (params?.limit ?? 50),
        };
      });
    },

    /**
     * Get aggregate by ID
     */
    get: async (id: string): Promise<EventAggregate> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get(`/api/v1/aggregates/${id}`);
        return data;
      });
    },
  };

  /**
   * Enrichment API
   */
  public readonly enrichment = {
    /**
     * Trigger AI enrichment for an aggregate
     */
    enrich: async (aggregateId: string): Promise<Enrichment> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data} = await this.http.post(`/api/v1/aggregates/${aggregateId}/enrich`);
        return data;
      });
    },
  };

  /**
   * Deliveries API
   */
  public readonly deliveries = {
    /**
     * List deliveries
     */
    list: async (params?: { page?: number; limit?: number }): Promise<PaginatedResponse<Delivery>> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/deliveries', { params });
        return {
          data: data.deliveries,
          total: data.total,
          page: params?.page ?? 1,
          limit: params?.limit ?? 50,
          hasMore: data.deliveries.length === (params?.limit ?? 50),
        };
      });
    },
  };

  /**
   * Subscribers API
   */
  public readonly subscribers = {
    /**
     * List subscribers
     */
    list: async (): Promise<Subscriber[]> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/subscribers');
        return data;
      });
    },

    /**
     * Create subscriber
     */
    create: async (request: CreateSubscriberRequest): Promise<Subscriber> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.post('/api/v1/subscribers', request);
        return data;
      });
    },

    /**
     * Update subscriber
     */
    update: async (id: string, request: UpdateSubscriberRequest): Promise<Subscriber> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.put(`/api/v1/subscribers/${id}`, request);
        return data;
      });
    },

    /**
     * Delete subscriber
     */
    delete: async (id: string): Promise<void> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        await this.http.delete(`/api/v1/subscribers/${id}`);
      });
    },
  };
}
