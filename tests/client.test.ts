/**
 * Tests for API client versioned endpoints
 * @jest-environment node
 */

import axios from 'axios';
import { AlteriomWebhookClient } from '../src/client';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AlteriomWebhookClient - Versioned Endpoints', () => {
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
            'X-Client-Version': '0.0.1',
          }),
        })
      );
    });
  });

  describe('Events API - /api/v1/events', () => {
    it('should call /api/v1/events for list', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { events: [], total: 0 },
      });

      await client.events.list();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/events',
        expect.any(Object)
      );
    });

    it('should call /api/v1/events/{id} for get', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { id: 'event-123' },
      });

      await client.events.get('event-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/events/event-123');
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

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/events', {
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
        data: { aggregates: [], total: 0 },
      });

      await client.aggregates.list();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/aggregates',
        expect.any(Object)
      );
    });

    it('should call /api/v1/aggregates/{id} for get', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { id: 'agg-123' },
      });

      await client.aggregates.get('agg-123');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/aggregates/agg-123');
    });

    it('should pass pagination parameters to list endpoint', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { aggregates: [], total: 0 },
      });

      await client.aggregates.list({ page: 3, limit: 10 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/aggregates', {
        params: { page: 3, limit: 10 },
      });
    });
  });

  describe('Enrichment API - /api/v1/aggregates/{id}/enrich', () => {
    it('should call /api/v1/aggregates/{id}/enrich for enrich', async () => {
      mockAxiosInstance.post.mockResolvedValue({
        data: { aggregate_id: 'agg-123' },
      });

      await client.enrichment.enrich('agg-123');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith(
        '/api/v1/aggregates/agg-123/enrich'
      );
    });
  });

  describe('Deliveries API - /api/v1/deliveries', () => {
    it('should call /api/v1/deliveries for list', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { deliveries: [], total: 0 },
      });

      await client.deliveries.list();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith(
        '/api/v1/deliveries',
        expect.any(Object)
      );
    });

    it('should pass pagination parameters to list endpoint', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { deliveries: [], total: 0 },
      });

      await client.deliveries.list({ page: 1, limit: 100 });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/deliveries', {
        params: { page: 1, limit: 100 },
      });
    });
  });

  describe('Subscribers API - /api/v1/subscribers', () => {
    it('should call /api/v1/subscribers for list', async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: [],
      });

      await client.subscribers.list();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/v1/subscribers');
    });

    it('should call /api/v1/subscribers for create', async () => {
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
        '/api/v1/subscribers',
        request
      );
    });

    it('should call /api/v1/subscribers/{id} for update', async () => {
      const request = {
        url: 'https://example.com/new-webhook',
        events: ['push', 'pull_request'],
      };

      mockAxiosInstance.put.mockResolvedValue({
        data: { id: 'sub-123', ...request },
      });

      await client.subscribers.update('sub-123', request);

      expect(mockAxiosInstance.put).toHaveBeenCalledWith(
        '/api/v1/subscribers/sub-123',
        request
      );
    });

    it('should call /api/v1/subscribers/{id} for delete', async () => {
      mockAxiosInstance.delete.mockResolvedValue({ data: null });

      await client.subscribers.delete('sub-123');

      expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/api/v1/subscribers/sub-123');
    });
  });

  describe('Endpoint Version Verification', () => {
    it('should never call endpoints without v1 prefix', async () => {
      // Mock proper response structures
      mockAxiosInstance.get.mockImplementation((url: string) => {
        if (url.includes('/events')) {
          return Promise.resolve({ data: { events: [], total: 0 } });
        } else if (url.includes('/aggregates')) {
          return Promise.resolve({ data: { aggregates: [], total: 0 } });
        } else if (url.includes('/deliveries')) {
          return Promise.resolve({ data: { deliveries: [], total: 0 } });
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
      await client.aggregates.get('id');
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

      // Verify all calls use /api/v1/ prefix
      const allCalls = [
        ...getCalls.map((call: any) => call[0]),
        ...postCalls.map((call: any) => call[0]),
        ...putCalls.map((call: any) => call[0]),
        ...deleteCalls.map((call: any) => call[0]),
      ];

      // All should start with /api/v1/
      allCalls.forEach((path) => {
        expect(path).toMatch(/^\/api\/v1\//);
      });

      // None should be /api/ without version
      allCalls.forEach((path) => {
        expect(path).not.toMatch(/^\/api\/[^v]/);
      });
    }, 10000); // Increase timeout to 10 seconds due to rate limiter
  });
});
