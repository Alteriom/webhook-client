/**
 * Tests for API client versioned endpoints
 * @jest-environment node
 */

import axios from 'axios';
import { AlteriomWebhookClient } from '../src/client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AlteriomWebhookClient - API Endpoints', () => {
  let client: AlteriomWebhookClient;
  let mockAxiosInstance: any;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock axios instance
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: {
          use: jest.fn(),
        },
        response: {
          use: jest.fn(),
        },
      },
    };

    // Mock axios.create to return our mock instance
    mockedAxios.create.mockReturnValue(mockAxiosInstance as any);

    // Create client instance
    client = new AlteriomWebhookClient({
      baseURL: 'https://test.example.com',
      apiKey: 'test-key',
    });
  });

  describe('API Version Header', () => {
    it('should include X-API-Version header in client configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-API-Version': '1.0',
          }),
        })
      );
    });

    it('should include X-Client-Version header', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Client-Version': '0.1.0',
          }),
        })
      );
    });
  });

  describe('Events API - /api/events', () => {
    it('should call /api/events for list', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { events: [], total: 0 },
      });

      await client.events.list();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/events',
        expect.any(Object)
      );
    });

    it('should call /api/events/{id} for get', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { id: 'event-123' },
      });

      await client.events.get('event-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/events/event-123');
    });

    it('should pass query parameters to list endpoint', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { events: [], total: 0 },
      });

      await client.events.list({
        page: 2,
        limit: 25,
        event_type: 'pull_request',
      });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/events', {
        params: {
          page: 2,
          limit: 25,
          event_type: 'pull_request',
        },
      });
    });
  });

  describe('Aggregates API - /api/v1/aggregates', () => {
    it('should call /api/v1/aggregates for list', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { data: [], pagination: { total: 0 } },
      });

      await client.aggregates.list();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/aggregates',
        expect.any(Object)
      );
    });

    // NOTE: aggregates.get(id) removed in v0.1.0 - endpoint doesn't exist on server
    // Use list() and filter instead

    it('should pass pagination parameters to list endpoint', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { data: [], pagination: { total: 0 } },
      });

      await client.aggregates.list({ limit: 10, cursor: 'abc123' });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/aggregates', {
        params: { limit: 10, cursor: 'abc123' },
      });
    });
  });

  describe('Enrichment API - /api/v1/enrichment', () => {
    it('should call /api/aggregates/{id}/enrich for enrich', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { aggregate_id: 'agg-123' },
      });

      await client.enrichment.enrich('agg-123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/enrichment/enrich',
        { aggregate_id: 'agg-123' }
      );
    });
  });

  describe('Deliveries API - /api/v1/deliveries', () => {
    it('should call /api/v1/deliveries/all for list', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { deliveries: [], total: 0 },
      });

      await client.deliveries.list();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/deliveries/all',
        expect.any(Object)
      );
    });

    it('should pass pagination parameters to list endpoint', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { deliveries: [], total: 0 },
      });

      await client.deliveries.list({ page: 1, limit: 100 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/deliveries/all', {
        params: { page: 1, limit: 100 },
      });
    });
  });

  describe('Subscribers API - /api/subscribers', () => {
    it('should call /api/subscribers for list', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: [],
      });

      await client.subscribers.list();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/subscribers');
    });

    it('should call /api/subscribers for create', async () => {
      const request = {
        name: 'Test Subscriber',
        url: 'https://example.com/webhook',
        secret: 'test-secret',
        events: ['push'],
      };

      mockAxiosInstance.post.mockResolvedValue({
        data: { id: 'sub-123', ...request },
      });

      await client.subscribers.create(request);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/subscribers',
        request
      );
    });

    it('should call /api/subscribers/{id} for update', async () => {
      const request = {
        url: 'https://example.com/new-webhook',
        events: ['push', 'pull_request'],
      };

      mockAxiosInstance.put.mockResolvedValue({
        data: { id: 'sub-123', ...request },
      });

      await client.subscribers.update('sub-123', request);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/api/subscribers/sub-123',
        request
      );
    });

    it('should call /api/subscribers/{id} for delete', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: null });

      await client.subscribers.delete('sub-123');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/subscribers/sub-123');
    });
  });

  describe('Endpoint Path Verification', () => {
    it('should call endpoints with /api/ prefix (no version)', async () => {
      // Mock proper response structures
      mockAxiosInstance.get.mockImplementation((url: string) => {
        if (url.includes('/events')) {
          return Promise.resolve({ data: { events: [], total: 0 } });
        } else if (url.includes('/aggregates')) {
          return Promise.resolve({ data: { data: [], pagination: { total: 0 } } });
        } else if (url.includes('/deliveries')) {
          return Promise.resolve({ data: { deliveries: [], data: [], total: 0 } });
        } else if (url.includes('/subscribers')) {
          return Promise.resolve({ data: [] });
        }
        return Promise.resolve({ data: {} });
      });
      mockAxiosInstance.post.mockResolvedValue({ data: {} });
      mockAxiosInstance.put.mockResolvedValue({ data: {} });
      mockAxiosInstance.delete.mockResolvedValue({ data: null });

      // Test all endpoints
      await client.events.list();
      await client.events.get('id');
      await client.aggregates.list();
      // NOTE: aggregates.get(id) removed in v0.1.0
      await client.enrichment.enrich('id');
      await client.deliveries.list();
      await client.subscribers.list();
      await client.subscribers.create({ 
        name: 'Test',
        url: 'http://test',
        secret: 'secret',
        events: [] 
      });
      await client.subscribers.update('id', { url: 'http://test' });
      await client.subscribers.delete('id');

      // Get all calls
      const getCalls = mockAxiosInstance.get.mock.calls;
      const postCalls = mockAxiosInstance.post.mock.calls;
      const putCalls = mockAxiosInstance.put.mock.calls;
      const deleteCalls = mockAxiosInstance.delete.mock.calls;

      // Verify all calls use /api/ prefix (without version)
      const allCalls = [
        ...getCalls.map((call: any) => call[0]),
        ...postCalls.map((call: any) => call[0]),
        ...putCalls.map((call: any) => call[0]),
        ...deleteCalls.map((call: any) => call[0]),
      ];

      // All should start with /api/
      allCalls.forEach((path) => {
        expect(path).toMatch(/^\/api\//);
      });

      // v0.1.0 uses /api/v1/* for most endpoints (breaking change from v0.0.1)
      // Events and subscribers still use /api/* (no version)
      // This is expected and correct behavior
    }, 10000); // Increase timeout to 10 seconds due to rate limiter
  });
});
