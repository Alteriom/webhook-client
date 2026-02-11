/**
 * Webhook receiver middleware with HMAC-SHA256 verification
 * @module receiver
 */

import * as crypto from 'crypto';
import type { SubscriptionDelivery } from './types';
import { SignatureVerificationError, WebhookExpiredError } from './errors';

/**
 * Receiver configuration
 */
export interface ReceiverConfig {
  secret: string;
  onDelivery: (delivery: SubscriptionDelivery) => Promise<void> | void;
  onSuccess?: (delivery: SubscriptionDelivery) => void;
  onError?: (error: Error) => void;
  maxAge?: number; // Default: 300000 (5 minutes)
  maxPayloadSize?: number; // Default: 10 MB
  skipVerification?: boolean; // Development only
  logger?: {
    debug: (msg: string, meta?: unknown) => void;
    error: (msg: string, meta?: unknown) => void;
  };
}

/**
 * Webhook signature generator (for testing)
 */
export function generateWebhookSignature(
  payload: unknown,
  secret: string,
  timestamp?: string
): { signature: string; timestamp: string } {
  const ts = timestamp ?? Date.now().toString();
  const data = `${ts}.${JSON.stringify(payload)}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);

  return {
    signature: `sha256=${hmac.digest('hex')}`,
    timestamp: ts,
  };
}

/**
 * Compute HMAC-SHA256 signature
 */
function computeSignature(
  payload: string,
  timestamp: string,
  secret: string
): string {
  const data = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(data);
  return `sha256=${hmac.digest('hex')}`;
}

/**
 * Timing-safe signature comparison
 */
function timingSafeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Duplicate delivery detection cache
 */
class DeliveryCache {
  private processed = new Set<string>();

  isDuplicate(delivery: SubscriptionDelivery): boolean {
    const deliveryId = `${delivery.subscription_id}:${delivery.aggregate?.id || 'unknown'}`;

    if (this.processed.has(deliveryId)) {
      return true;
    }

    this.processed.add(deliveryId);

    // Auto-cleanup after 1 hour
    setTimeout(() => this.processed.delete(deliveryId), 3600000);

    return false;
  }
}

/**
 * Generic webhook receiver middleware
 */
export function webhookReceiver(config: ReceiverConfig) {
  const maxAge = config.maxAge ?? 300000; // 5 minutes
  const maxPayloadSize = config.maxPayloadSize ?? 10 * 1024 * 1024; // 10 MB
  const cache = new DeliveryCache();

  return async (req: {
    headers: Record<string, string | string[] | undefined>;
    body: unknown;
  }, res: {
    status: (code: number) => { json: (data: unknown) => void };
  }) => {
    // 1. Check payload size
    const contentLength = parseInt(String(req.headers['content-length'] || '0'));
    if (contentLength > maxPayloadSize) {
      res.status(413).json({ error: 'Payload too large' });
      return;
    }

    // 2. Extract headers
    const signature = req.headers['x-connector-signature-256'];
    const timestamp = req.headers['x-connector-timestamp'];

    if (!signature || !timestamp) {
      res.status(401).json({ error: 'Missing signature headers' });
      return;
    }

    // 3. Verify timestamp (replay attack prevention)
    const age = Date.now() - parseInt(String(timestamp));
    if (age > maxAge) {
      res.status(401).json({ error: 'Webhook expired' });
      config.logger?.error('Webhook expired', { age, maxAge });
      return;
    }

    // 4. Verify signature (timing-safe)
    if (!config.skipVerification) {
      const payload = JSON.stringify(req.body);
      const expectedSig = computeSignature(payload, String(timestamp), config.secret);

      if (!timingSafeEqual(String(signature), expectedSig)) {
        res.status(401).json({ error: 'Invalid signature' });
        config.logger?.error('Invalid signature');
        return;
      }
    } else if (process.env.NODE_ENV !== 'development') {
      res.status(500).json({ error: 'skipVerification only allowed in development' });
      return;
    }

    // 5. Parse and validate delivery
    const delivery = req.body as SubscriptionDelivery;

    // 6. Check for duplicate delivery
    if (cache.isDuplicate(delivery)) {
      config.logger?.debug('Duplicate delivery detected', {
        subscriptionId: delivery.subscription_id,
        aggregateId: delivery.aggregate?.id,
      });
      res.status(200).json({ received: true, duplicate: true });
      return;
    }

    // 7. Respond immediately (async processing)
    res.status(200).json({ received: true });

    // 8. Process delivery (async)
    try {
      config.logger?.debug('Processing delivery', {
        subscriptionId: delivery.subscription_id,
        mode: delivery.delivery_mode,
        aggregateId: delivery.aggregate?.id,
      });

      await config.onDelivery(delivery);

      if (config.onSuccess) {
        config.onSuccess(delivery);
      }
    } catch (error) {
      if (config.onError) {
        config.onError(error as Error);
      }

      config.logger?.error('Webhook processing error', { error });
    }
  };
}
