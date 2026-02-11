/**
 * Framework adapters for webhook receiver
 * @module adapters
 */

import { webhookReceiver, ReceiverConfig } from './receiver';

/**
 * Express.js adapter
 * @example
 * ```typescript
 * import express from 'express';
 * import { expressReceiver } from '@alteriom/webhook-client/adapters';
 * 
 * const app = express();
 * app.use(express.json());
 * 
 * app.use('/webhook', expressReceiver({
 *   secret: process.env.WEBHOOK_SECRET!,
 *   onDelivery: async (delivery) => {
 *     console.log('Received:', delivery);
 *   },
 * }));
 * ```
 */
export function expressReceiver(config: ReceiverConfig) {
  const handler = webhookReceiver(config);

  return (req: any, res: any, next: any) => {
    handler(req, res).catch(next);
  };
}

/**
 * Fastify adapter
 * @example
 * ```typescript
 * import fastify from 'fastify';
 * import { fastifyReceiver } from '@alteriom/webhook-client/adapters';
 * 
 * const app = fastify();
 * 
 * app.post('/webhook', fastifyReceiver({
 *   secret: process.env.WEBHOOK_SECRET!,
 *   onDelivery: async (delivery) => {
 *     console.log('Received:', delivery);
 *   },
 * }));
 * ```
 */
export function fastifyReceiver(config: ReceiverConfig) {
  const handler = webhookReceiver(config);

  return async (request: any, reply: any) => {
    await handler(
      {
        headers: request.headers,
        body: request.body,
      },
      reply
    );
  };
}

/**
 * Next.js API route adapter
 * @example
 * ```typescript
 * // pages/api/webhook.ts
 * import { nextjsReceiver } from '@alteriom/webhook-client/adapters';
 * 
 * export default nextjsReceiver({
 *   secret: process.env.WEBHOOK_SECRET!,
 *   onDelivery: async (delivery) => {
 *     console.log('Received:', delivery);
 *   },
 * });
 * ```
 */
export function nextjsReceiver(config: ReceiverConfig) {
  const handler = webhookReceiver(config);

  return async (req: any, res: any) => {
    await handler(req, res);
  };
}
