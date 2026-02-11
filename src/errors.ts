/**
 * Error classes for webhook-client
 * @module errors
 */

/**
 * Base API error class
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Rate limit exceeded error
 */
export class RateLimitError extends ApiError {
  constructor(
    public retryAfter: number,
    public limit: number,
    public remaining: number
  ) {
    super('Rate limit exceeded', 429);
    this.name = 'RateLimitError';
    Object.setPrototypeOf(this, RateLimitError.prototype);
  }
}

/**
 * Validation error
 */
export class ValidationError extends Error {
  constructor(
    public field: string,
    message: string,
    public code: string
  ) {
    super(message);
    this.name = 'ValidationError';
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/**
 * Webhook signature verification failed
 */
export class SignatureVerificationError extends Error {
  constructor(message = 'Webhook signature verification failed') {
    super(message);
    this.name = 'SignatureVerificationError';
    Object.setPrototypeOf(this, SignatureVerificationError.prototype);
  }
}

/**
 * Webhook expired (replay attack prevention)
 */
export class WebhookExpiredError extends Error {
  constructor(message = 'Webhook expired (timestamp too old)') {
    super(message);
    this.name = 'WebhookExpiredError';
    Object.setPrototypeOf(this, WebhookExpiredError.prototype);
  }
}
