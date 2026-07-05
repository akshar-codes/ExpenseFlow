export class AIProvider {
  constructor(config = {}) {
    if (new.target === AIProvider) {
      throw new TypeError(
        "AIProvider is abstract — extend it, do not instantiate it directly.",
      );
    }
    this.config = config;
  }

  // eslint-disable-next-line no-unused-vars
  async generateInsights(systemPrompt, userPrompt, options = {}) {
    throw new Error(
      `${this.constructor.name} must implement generateInsights()`,
    );
  }

  async healthCheck() {
    throw new Error(`${this.constructor.name} must implement healthCheck()`);
  }

  get name() {
    throw new Error(`${this.constructor.name} must expose a name getter`);
  }
}
