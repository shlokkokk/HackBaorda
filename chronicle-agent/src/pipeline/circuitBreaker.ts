import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';

export class CircuitBreaker {
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private failureCount = 0;
  private lastFailureTime = 0;

  public getState() {
    return this.state;
  }

  public canRequest(): boolean {
    if (this.state === 'CLOSED') return true;

    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.lastFailureTime;
      if (elapsed > config.circuitBreakerTimeoutMs) {
        this.state = 'HALF_OPEN';
        logger.info('Circuit Breaker entering HALF_OPEN state. Testing connection...');
        return true;
      }
      return false;
    }

    // HALF_OPEN allows test request
    return true;
  }

  public recordSuccess() {
    this.failureCount = 0;
    if (this.state !== 'CLOSED') {
      logger.info(`Circuit Breaker recovered. Entering CLOSED state.`);
      this.state = 'CLOSED';
    }
  }

  public recordFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    logger.warn(`Circuit Breaker observed failure (${this.failureCount}/${config.circuitBreakerThreshold})`);

    if (this.failureCount >= config.circuitBreakerThreshold && this.state !== 'OPEN') {
      logger.warn(`Circuit Breaker tripped to OPEN. Webhook requests suspended for ${config.circuitBreakerTimeoutMs / 1000}s`);
      this.state = 'OPEN';
    }
  }
}
