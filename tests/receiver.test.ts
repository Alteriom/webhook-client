/**
 * Tests for webhook receiver
 * @jest-environment node
 */

import { webhookReceiver, generateWebhookSignature } from '../src/receiver';
import { SignatureVerificationError } from '../src/errors';
import type { SubscriptionDelivery } from '../src/types';

describe('generateWebhookSignature', () => {
  it('should generate valid signature', () => {
    const payload = { test: 'data' };
    const secret = 'my-secret';
    
    const { signature, timestamp } = generateWebhookSignature(payload, secret);
    
    expect(signature).toMatch(/^sha256=[a-f0-9]{64}$/);
    expect(timestamp).toMatch(/^\d+$/);
  });

  it('should use provided timestamp', () => {
    const payload = { test: 'data' };
    const secret = 'my-secret';
    const timestamp = '1234567890';
    
    const result = generateWebhookSignature(payload, secret, timestamp);
    
    expect(result.timestamp).toBe(timestamp);
  });

  it('should generate different signatures for different payloads', () => {
    const secret = 'my-secret';
    const timestamp = '1234567890';
    
    const sig1 = generateWebhookSignature({ a: 1 }, secret, timestamp);
    const sig2 = generateWebhookSignature({ b: 2 }, secret, timestamp);
    
    expect(sig1.signature).not.toBe(sig2.signature);
  });
});

describe('webhookReceiver', () => {
  const mockDelivery: SubscriptionDelivery = {
    subscription_id: 'test-sub',
    delivery_mode: 'aggregate',
    aggregate: {
      id: 'agg-123',
      repository: 'Alteriom/test',
      entity_type: 'pull_request',
      entity_id: 'pr-456',
      aggregate_type: 'pr_review',
      summary: {},
      event_count: 3,
      first_event_at: '2026-02-11T00:00:00Z',
      last_event_at: '2026-02-11T01:00:00Z',
    },
    delivered_at: new Date().toISOString(),
  };

  it('should accept valid webhook', async () => {
    const secret = 'test-secret';
    const onDelivery = jest.fn();
    
    const receiver = webhookReceiver({
      secret,
      onDelivery,
    });

    const { signature, timestamp } = generateWebhookSignature(mockDelivery, secret);
    
    const mockReq = {
      headers: {
        'x-connector-signature-256': signature,
        'x-connector-timestamp': timestamp,
        'content-length': '500',
      },
      body: mockDelivery,
    };

    let responseStatus = 0;
    let responseBody: any = {};

    const mockRes = {
      status: (code: number) => {
        responseStatus = code;
        return {
          json: (data: unknown) => {
            responseBody = data;
          },
        };
      },
    };

    await receiver(mockReq, mockRes);

    expect(responseStatus).toBe(200);
    expect(responseBody).toEqual({ received: true });
    
    // Wait for async processing
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(onDelivery).toHaveBeenCalledWith(mockDelivery);
  });

  it('should reject webhook with invalid signature', async () => {
    const secret = 'test-secret';
    const onDelivery = jest.fn();
    
    const receiver = webhookReceiver({
      secret,
      onDelivery,
    });

    const mockReq = {
      headers: {
        'x-connector-signature-256': 'sha256=invalid',
        'x-connector-timestamp': Date.now().toString(),
        'content-length': '500',
      },
      body: mockDelivery,
    };

    let responseStatus = 0;
    const mockRes = {
      status: (code: number) => {
        responseStatus = code;
        return {
          json: jest.fn(),
        };
      },
    };

    await receiver(mockReq, mockRes);

    expect(responseStatus).toBe(401);
    expect(onDelivery).not.toHaveBeenCalled();
  });

  it('should reject expired webhook', async () => {
    const secret = 'test-secret';
    const onDelivery = jest.fn();
    
    const receiver = webhookReceiver({
      secret,
      onDelivery,
      maxAge: 1000, // 1 second
    });

    // Generate signature with old timestamp
    const oldTimestamp = (Date.now() - 2000).toString();
    const { signature } = generateWebhookSignature(mockDelivery, secret, oldTimestamp);

    const mockReq = {
      headers: {
        'x-connector-signature-256': signature,
        'x-connector-timestamp': oldTimestamp,
        'content-length': '500',
      },
      body: mockDelivery,
    };

    let responseStatus = 0;
    const mockRes = {
      status: (code: number) => {
        responseStatus = code;
        return {
          json: jest.fn(),
        };
      },
    };

    await receiver(mockReq, mockRes);

    expect(responseStatus).toBe(401);
    expect(onDelivery).not.toHaveBeenCalled();
  });

  it('should reject webhook with missing headers', async () => {
    const secret = 'test-secret';
    const onDelivery = jest.fn();
    
    const receiver = webhookReceiver({
      secret,
      onDelivery,
    });

    const mockReq = {
      headers: {
        'content-length': '500',
      },
      body: mockDelivery,
    };

    let responseStatus = 0;
    const mockRes = {
      status: (code: number) => {
        responseStatus = code;
        return {
          json: jest.fn(),
        };
      },
    };

    await receiver(mockReq, mockRes);

    expect(responseStatus).toBe(401);
    expect(onDelivery).not.toHaveBeenCalled();
  });

  it('should reject oversized payload', async () => {
    const secret = 'test-secret';
    const onDelivery = jest.fn();
    
    const receiver = webhookReceiver({
      secret,
      onDelivery,
      maxPayloadSize: 100, // 100 bytes
    });

    const mockReq = {
      headers: {
        'x-connector-signature-256': 'sha256=test',
        'x-connector-timestamp': Date.now().toString(),
        'content-length': '1000', // 1000 bytes
      },
      body: mockDelivery,
    };

    let responseStatus = 0;
    const mockRes = {
      status: (code: number) => {
        responseStatus = code;
        return {
          json: jest.fn(),
        };
      },
    };

    await receiver(mockReq, mockRes);

    expect(responseStatus).toBe(413);
    expect(onDelivery).not.toHaveBeenCalled();
  });

  it('should detect duplicate deliveries', async () => {
    const secret = 'test-secret';
    const onDelivery = jest.fn();
    
    const receiver = webhookReceiver({
      secret,
      onDelivery,
    });

    const { signature, timestamp } = generateWebhookSignature(mockDelivery, secret);
    
    const mockReq = {
      headers: {
        'x-connector-signature-256': signature,
        'x-connector-timestamp': timestamp,
        'content-length': '500',
      },
      body: mockDelivery,
    };

    const mockRes = () => ({
      status: (code: number) => ({
        json: jest.fn(),
      }),
    });

    // First delivery
    await receiver(mockReq, mockRes());
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(onDelivery).toHaveBeenCalledTimes(1);

    // Duplicate delivery
    await receiver(mockReq, mockRes());
    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(onDelivery).toHaveBeenCalledTimes(1); // Still 1, not 2
  });

  it('should skip verification in development mode', async () => {
    const secret = 'test-secret';
    const onDelivery = jest.fn();
    
    // Set NODE_ENV
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    
    const receiver = webhookReceiver({
      secret,
      onDelivery,
      skipVerification: true,
    });

    const mockReq = {
      headers: {
        'x-connector-signature-256': 'sha256=invalid',
        'x-connector-timestamp': Date.now().toString(),
        'content-length': '500',
      },
      body: mockDelivery,
    };

    let responseStatus = 0;
    const mockRes = {
      status: (code: number) => {
        responseStatus = code;
        return {
          json: jest.fn(),
        };
      },
    };

    await receiver(mockReq, mockRes);

    expect(responseStatus).toBe(200);
    
    // Restore NODE_ENV
    process.env.NODE_ENV = originalEnv;
  });
});
