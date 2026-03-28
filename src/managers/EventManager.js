const { EventEmitter } = require('events');

/**
 * EventManager
 * Async Event Queue Pipeline.
 * Protects the anti-nuke from freezing due to Discord API lag when 100+ channels are deleted.
 * Instead of firing validations linearly and blocking the event loop, it queues validation promises.
 */
class EventManager extends EventEmitter {
  constructor() {
    super();
    this.queue = [];
    this.processing = false;
  }

  /**
   * Pushes a verification task into the defensive pipeline
   * @param {Function} task - A Promise-returning task function (e.g., Layer 1 -> Layer 6 check)
   */
  enqueue(task) {
    this.queue.push(task);
    this._process();
  }

  async _process() {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      try {
        await task();
      } catch (err) {
        console.error('[TorqueAntiNuke:EventManager] Error in defense pipeline:', err.message);
      }
      
      // Yield to the event loop exactly 0ms (just long enough to process incoming micro-tasks like audit log fetches)
      await new Promise(r => setImmediate(r));
    }

    this.processing = false;
  }
}

module.exports = EventManager;
