const STATES = { CLOSED: "CLOSED", OPEN: "OPEN", HALF_OPEN: "HALF_OPEN" };

class CircuitBreaker {
  constructor(name, { failureThreshold = 5, cooldownMs = 3 * 60 * 1000 } = {}) {
    this.name = name;
    this.failureThreshold = failureThreshold;
    this.cooldownMs = cooldownMs;
    this.state = STATES.CLOSED;
    this.failures = 0;
    this.openedAt = null;
  }

  isAllowed() {
    if (this.state === STATES.CLOSED) return true;
    if (this.state === STATES.OPEN) {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.cooldownMs) {
        this.state = STATES.HALF_OPEN;
        return true;
      }
      return false;
    }
    if (this.state === STATES.HALF_OPEN) return true;
    return false;
  }

  onSuccess() {
    this.failures = 0;
    this.state = STATES.CLOSED;
  }

  onFailure() {
    this.failures++;
    if (this.state === STATES.HALF_OPEN || this.failures >= this.failureThreshold) {
      this.state = STATES.OPEN;
      this.openedAt = Date.now();
      console.warn(`[CircuitBreaker] ${this.name} tripped to OPEN after ${this.failures} failures.`);
    }
  }

  getState() {
    return this.state;
  }

  getStats() {
    return {
      name: this.name,
      state: this.state,
      failures: this.failures,
      openedAt: this.openedAt,
      cooldownMs: this.cooldownMs,
    };
  }
}

module.exports = CircuitBreaker;
