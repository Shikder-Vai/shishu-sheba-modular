/**
 * Server Tracking — public entry point.
 * Import this in app.js and order.controller.js.
 */
const EventBus       = require("./EventBus");
const RetryWorker    = require("./RetryWorker");
const EventLogger    = require("./EventLogger");
const TrackingSettings = require("./TrackingSettings");

module.exports = {
  // Fire a server-side event (call from controllers)
  fireEvent: EventBus.fireEvent,

  // Circuit breaker health
  getHealthStatus: EventBus.getHealthStatus,

  // Admin dashboard helpers
  getLogs:        EventLogger.getLogs,
  getMetrics:     EventLogger.getMetrics,
  deleteOldLogs:  EventLogger.deleteOldLogs,
  ensureIndexes:  EventLogger.ensureIndexes,

  // Settings
  getSettings:    TrackingSettings.getSettings,
  updateSettings: TrackingSettings.updateSettings,
  bustCache:      TrackingSettings.bustCache,

  // Retry worker lifecycle
  startRetryWorker: RetryWorker.start,
  stopRetryWorker:  RetryWorker.stop,
};
