/**
 * REST API client for Alteriom Webhook Connector
 * @module client
 * @version 0.1.0
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import type {
  // Core types
  WebhookEvent,
  TypedAggregate,
  Enrichment,
  Delivery,
  Subscriber,
  PaginatedResponse,
  EventListParams,
  AggregateListParams,
  AggregateStatsResponse,
  CreateSubscriberRequest,
  UpdateSubscriberRequest,
  // Security types
  DependabotAlert,
  CodeScanningAlert,
  SecretScanningAlert,
  SecurityAdvisory,
  RemediationQueueItem,
  RepositoryRiskLevel,
  BadgeCounts,
  AlertStats,
  SecurityAlertFilters,
  TriageRequest,
  // Repository types
  Repository,
  RepositoryUpdateRequest,
  // HTTP Subscriber types
  HttpSubscriber,
  HttpSubscriberCreateRequest,
  HttpSubscriberUpdateRequest,
  HttpSubscriberTestResult,
  // API Key types
  ApiKey,
  ApiKeyCreateRequest,
  ApiKeyUpdateRequest,
  ApiKeyRotationResult,
  // Audit types
  AuditEvent,
  // Health types
  HealthStatus,
  HandlerConfig,
  PendingEvents,
  // Dashboard types
  DashboardStats,
  TimeSeriesPoint,
  // Pipeline types
  PipelineStatus,
  // Query Log types
  QueryLog,
  // Subscription types
  AgentSubscription,
  AgentSubscriptionCreateRequest,
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
        'X-Client-Version': '1.0.0',
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
        const { data } = await this.http.get('/api/events', { params });
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
        const { data } = await this.http.get(`/api/events/${id}`);
        return data;
      });
    },
  };

  /**
   * Aggregates API
   */
  public readonly aggregates = {
    /**
     * List aggregates with server-side filtering and pagination
     */
    list: async (params?: AggregateListParams): Promise<PaginatedResponse<TypedAggregate>> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/aggregates', { params });
        return {
          data: data.data,
          total: data.pagination?.total || data.data.length,
          page: params?.cursor ? 0 : 1, // Cursor-based pagination doesn't have page numbers
          limit: params?.limit ?? 50,
          hasMore: data.pagination?.has_more || false,
          cursor: data.pagination?.next_cursor, // Include next cursor
        };
      });
    },

    /**
     * Get aggregate statistics
     */
    stats: async (): Promise<AggregateStatsResponse> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/aggregates/stats');
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
        const { data } = await this.http.post('/api/v1/enrichment/enrich', { aggregate_id: aggregateId });
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
        const { data } = await this.http.get('/api/v1/deliveries/all', { params });
        return {
          data: data.deliveries || data.data,
          total: data.total || data.pagination?.total || 0,
          page: params?.page ?? 1,
          limit: params?.limit ?? 50,
          hasMore: (data.deliveries || data.data).length === (params?.limit ?? 50),
        };
      });
    },

    /**
     * Get delivery statistics
     */
    stats: async (): Promise<Record<string, unknown>> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/deliveries/stats');
        return data;
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
        const { data } = await this.http.get('/api/subscribers');
        return data;
      });
    },

    /**
     * Create subscriber
     */
    create: async (request: CreateSubscriberRequest): Promise<Subscriber> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.post('/api/subscribers', request);
        return data;
      });
    },

    /**
     * Update subscriber
     */
    update: async (id: string, request: UpdateSubscriberRequest): Promise<Subscriber> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.put(`/api/subscribers/${id}`, request);
        return data;
      });
    },

    /**
     * Delete subscriber
     */
    delete: async (id: string): Promise<void> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        await this.http.delete(`/api/subscribers/${id}`);
      });
    },
  };

  /**
   * Security Dashboard API
   */
  public readonly security = {
    /**
     * Get remediation queue (top critical/high priority alerts)
     */
    getRemediationQueue: async (limit: number = 20): Promise<RemediationQueueItem[]> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/security/remediation-queue', { params: { limit } });
        return data.data || data;
      });
    },

    /**
     * Get repository risk levels
     */
    getRepositories: async (): Promise<RepositoryRiskLevel[]> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/security/repositories');
        return data.data || data;
      });
    },

    /**
     * Get overall security badge counts
     */
    getBadgeCounts: async (): Promise<BadgeCounts> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/security/badge-counts');
        return data;
      });
    },
  };

  /**
   * Dependabot Alerts API
   */
  public readonly dependabotAlerts = {
    /**
     * List dependabot alerts with filters
     */
    list: async (filters?: SecurityAlertFilters): Promise<PaginatedResponse<DependabotAlert>> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/dependabot-alerts', { params: filters });
        return {
          data: data.data,
          total: data.pagination.total,
          page: Math.floor((filters?.offset || 0) / (filters?.limit || 50)) + 1,
          limit: filters?.limit || 50,
          hasMore: data.pagination.count === (filters?.limit || 50),
        };
      });
    },

    /**
     * Get dependabot alert by ID
     */
    get: async (id: string): Promise<DependabotAlert> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get(`/api/v1/dependabot-alerts/${id}`);
        return data;
      });
    },

    /**
     * Get alert statistics
     */
    stats: async (repository?: string): Promise<AlertStats> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/dependabot-alerts/stats', { params: { repository } });
        return data;
      });
    },

    /**
     * Export alerts to CSV
     */
    export: async (filters?: SecurityAlertFilters): Promise<string> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/dependabot-alerts/export', {
          params: filters,
          responseType: 'text',
        });
        return data;
      });
    },
  };

  /**
   * Code Scanning Alerts API
   */
  public readonly codeScanningAlerts = {
    /**
     * List code scanning alerts with filters
     */
    list: async (filters?: SecurityAlertFilters): Promise<PaginatedResponse<CodeScanningAlert>> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/code-scanning-alerts', { params: filters });
        return {
          data: data.data,
          total: data.pagination.total,
          page: Math.floor((filters?.offset || 0) / (filters?.limit || 50)) + 1,
          limit: filters?.limit || 50,
          hasMore: data.pagination.count === (filters?.limit || 50),
        };
      });
    },

    /**
     * Get code scanning alert by ID
     */
    get: async (id: string): Promise<CodeScanningAlert> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get(`/api/v1/code-scanning-alerts/${id}`);
        return data;
      });
    },

    /**
     * Get alert statistics
     */
    stats: async (repository?: string): Promise<AlertStats> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/code-scanning-alerts/stats', { params: { repository } });
        return data;
      });
    },

    /**
     * Export alerts to CSV
     */
    export: async (filters?: SecurityAlertFilters): Promise<string> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/code-scanning-alerts/export', {
          params: filters,
          responseType: 'text',
        });
        return data;
      });
    },
  };

  /**
   * Secret Scanning Alerts API
   */
  public readonly secretScanningAlerts = {
    /**
     * List secret scanning alerts with filters
     */
    list: async (filters?: SecurityAlertFilters): Promise<PaginatedResponse<SecretScanningAlert>> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/secret-scanning-alerts', { params: filters });
        return {
          data: data.data,
          total: data.pagination.total,
          page: Math.floor((filters?.offset || 0) / (filters?.limit || 50)) + 1,
          limit: filters?.limit || 50,
          hasMore: data.pagination.count === (filters?.limit || 50),
        };
      });
    },

    /**
     * Get secret scanning alert by ID
     */
    get: async (id: string): Promise<SecretScanningAlert> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get(`/api/v1/secret-scanning-alerts/${id}`);
        return data;
      });
    },

    /**
     * Get alert statistics
     */
    stats: async (repository?: string): Promise<AlertStats> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/secret-scanning-alerts/stats', { params: { repository } });
        return data;
      });
    },

    /**
     * Export alerts to CSV
     */
    export: async (filters?: SecurityAlertFilters): Promise<string> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/secret-scanning-alerts/export', {
          params: filters,
          responseType: 'text',
        });
        return data;
      });
    },
  };

  /**
   * Security Advisories API
   */
  public readonly securityAdvisories = {
    /**
     * List security advisories with filters
     */
    list: async (filters?: SecurityAlertFilters): Promise<PaginatedResponse<SecurityAdvisory>> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/security-advisories', { params: filters });
        return {
          data: data.data,
          total: data.pagination.total,
          page: Math.floor((filters?.offset || 0) / (filters?.limit || 50)) + 1,
          limit: filters?.limit || 50,
          hasMore: data.pagination.count === (filters?.limit || 50),
        };
      });
    },

    /**
     * Get security advisory by ID
     */
    get: async (id: string): Promise<SecurityAdvisory> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get(`/api/v1/security-advisories/${id}`);
        return data;
      });
    },

    /**
     * Get advisory statistics
     */
    stats: async (): Promise<AlertStats> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/security-advisories/stats');
        return data;
      });
    },

    /**
     * Triage security advisory
     */
    triage: async (id: string, request: TriageRequest): Promise<SecurityAdvisory> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.post(`/api/v1/security-advisories/${id}/triage`, request);
        return data;
      });
    },
  };

  /**
   * Repositories API
   */
  public readonly repositories = {
    /**
     * List repositories
     */
    list: async (filters?: { scan_enabled?: boolean }): Promise<Repository[]> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/repositories', { params: filters });
        return data.repositories || data.data || data;
      });
    },

    /**
     * Get repository by owner/name
     */
    get: async (owner: string, repo: string): Promise<Repository> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get(`/api/v1/repositories/${owner}/${repo}`);
        return data;
      });
    },

    /**
     * Update repository settings
     */
    update: async (owner: string, repo: string, request: RepositoryUpdateRequest): Promise<Repository> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.put(`/api/v1/repositories/${owner}/${repo}`, request);
        return data;
      });
    },

    /**
     * Delete repository
     */
    delete: async (owner: string, repo: string): Promise<void> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        await this.http.delete(`/api/v1/repositories/${owner}/${repo}`);
      });
    },
  };

  /**
   * HTTP Subscribers API
   */
  public readonly httpSubscribers = {
    /**
     * List HTTP webhook subscribers
     */
    list: async (): Promise<HttpSubscriber[]> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/http-subscribers');
        return data.data || data;
      });
    },

    /**
     * Create HTTP subscriber
     */
    create: async (request: HttpSubscriberCreateRequest): Promise<HttpSubscriber> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.post('/api/v1/http-subscribers', request);
        return data;
      });
    },

    /**
     * Update HTTP subscriber
     */
    update: async (id: string, request: HttpSubscriberUpdateRequest): Promise<HttpSubscriber> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.put(`/api/v1/http-subscribers/${id}`, request);
        return data;
      });
    },

    /**
     * Delete HTTP subscriber
     */
    delete: async (id: string): Promise<void> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        await this.http.delete(`/api/v1/http-subscribers/${id}`);
      });
    },

    /**
     * Test HTTP subscriber webhook delivery
     */
    test: async (id: string): Promise<HttpSubscriberTestResult> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.post(`/api/v1/http-subscribers/${id}/test`);
        return data;
      });
    },
  };

  /**
   * API Keys API
   */
  public readonly apiKeys = {
    /**
     * List API keys
     */
    list: async (): Promise<ApiKey[]> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/keys');
        return data.data || data;
      });
    },

    /**
     * Create API key
     */
    create: async (request: ApiKeyCreateRequest): Promise<{ key: ApiKey; secret: string }> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.post('/api/v1/keys', request);
        return data;
      });
    },

    /**
     * Update API key
     */
    update: async (id: string, request: ApiKeyUpdateRequest): Promise<ApiKey> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.put(`/api/v1/keys/${id}`, request);
        return data;
      });
    },

    /**
     * Delete API key
     */
    delete: async (id: string): Promise<void> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        await this.http.delete(`/api/v1/keys/${id}`);
      });
    },

    /**
     * Rotate API key
     */
    rotate: async (id: string): Promise<ApiKeyRotationResult> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.post(`/api/v1/keys/${id}/rotate`);
        return data;
      });
    },
  };

  /**
   * Audit Logs API
   */
  public readonly audit = {
    /**
     * List audit events
     */
    list: async (params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<AuditEvent>> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/audit', { params });
        return {
          data: data.data,
          total: data.pagination?.total || data.data.length,
          page: Math.floor((params?.offset || 0) / (params?.limit || 50)) + 1,
          limit: params?.limit || 50,
          hasMore: data.data.length === (params?.limit || 50),
        };
      });
    },

    /**
     * Get audit event by ID
     */
    get: async (id: string): Promise<AuditEvent> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get(`/api/v1/audit/${id}`);
        return data;
      });
    },
  };

  /**
   * Health API
   */
  public readonly health = {
    /**
     * Get system health status
     */
    status: async (): Promise<HealthStatus> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/health');
        return data;
      });
    },

    /**
     * Get handler configurations
     */
    handlers: async (): Promise<HandlerConfig[]> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/health/handlers');
        return data.data || data;
      });
    },

    /**
     * Get pending events summary
     */
    pendingEvents: async (): Promise<PendingEvents> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/health/pending-events');
        return data;
      });
    },
  };

  /**
   * Dashboard API
   */
  public readonly dashboard = {
    /**
     * Get dashboard statistics
     */
    stats: async (): Promise<DashboardStats> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/dashboard/stats');
        return data;
      });
    },

    /**
     * Get time-series data
     */
    timeSeries: async (metric: string, interval?: string): Promise<TimeSeriesPoint[]> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/dashboard/timeseries', {
          params: { metric, interval },
        });
        return data.data || data;
      });
    },
  };

  /**
   * Pipelines API
   */
  public readonly pipelines = {
    /**
     * List pipeline statuses
     */
    list: async (repository?: string): Promise<PipelineStatus[]> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/pipelines', { params: { repository } });
        return data.data || data;
      });
    },

    /**
     * Get pipeline status for repository
     */
    get: async (owner: string, repo: string): Promise<PipelineStatus[]> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get(`/api/v1/pipelines/${owner}/${repo}`);
        return data.data || data;
      });
    },
  };

  /**
   * Query Logs API
   */
  public readonly queryLogs = {
    /**
     * List query logs
     */
    list: async (params?: { limit?: number; offset?: number }): Promise<PaginatedResponse<QueryLog>> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/query-logs', { params });
        return {
          data: data.data,
          total: data.pagination?.total || data.data.length,
          page: Math.floor((params?.offset || 0) / (params?.limit || 50)) + 1,
          limit: params?.limit || 50,
          hasMore: data.data.length === (params?.limit || 50),
        };
      });
    },
  };

  /**
   * Agent Subscriptions API
   */
  public readonly subscriptions = {
    /**
     * List agent subscriptions
     */
    list: async (): Promise<AgentSubscription[]> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.get('/api/v1/subscriptions');
        return data.data || data;
      });
    },

    /**
     * Create agent subscription
     */
    create: async (request: AgentSubscriptionCreateRequest): Promise<AgentSubscription> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        const { data } = await this.http.post('/api/v1/subscriptions', request);
        return data;
      });
    },

    /**
     * Delete agent subscription
     */
    delete: async (id: string): Promise<void> => {
      await this.rateLimiter.acquire();
      return this.retryLogic.execute(async () => {
        await this.http.delete(`/api/v1/subscriptions/${id}`);
      });
    },
  };
}
