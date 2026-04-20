const EventBus = require("./EventBus");
const EventLogger = require("./EventLogger");
const { getSettings } = require("./TrackingSettings");
const client = require("../../config/db");

const POLL_INTERVAL_MS = 60_000; // check every 60 seconds

let _timer = null;

async function runRetryBatch() {
  try {
    const pending = await EventLogger.getPendingRetries();
    if (pending.length === 0) return;

    console.log(`[RetryWorker] Processing ${pending.length} pending event(s).`);

    for (const event of pending) {
      await client
        .db("sishuSheba")
        .collection("server_events")
        .updateOne({ _id: event._id }, { $set: { status: "retrying" } });

      try {
        const settings = await getSettings();
        const platformSettings = settings[event.platform];

        if (!platformSettings?.enabled) {
          await client
            .db("sishuSheba")
            .collection("server_events")
            .updateOne({ _id: event._id }, { $set: { status: "dead_letter", errorMessage: "Platform disabled during retry" } });
          continue;
        }

        // Rebuild a minimal fire call with the logged payload
        await EventBus.fireEvent(
          event.eventType,
          { order: event.payload?.data?.[0]?.custom_data || event.payload?.properties || {}, user: {} },
          { ip: event.ip, userAgent: event.userAgent }
        );

        // Mark as resolved
        await client
          .db("sishuSheba")
          .collection("server_events")
          .updateOne({ _id: event._id }, { $set: { status: "retried_success" } });
      } catch (err) {
        const nextRetryCount = (event.retryCount || 0) + 1;
        await client
          .db("sishuSheba")
          .collection("server_events")
          .updateOne(
            { _id: event._id },
            { $set: { status: "failed", retryCount: nextRetryCount, errorMessage: err.message } }
          );
        await EventLogger.scheduleRetry(event._id, nextRetryCount);
      }
    }
  } catch (err) {
    console.error("[RetryWorker] Error during retry batch:", err.message);
  }
}

function start() {
  if (_timer) return;
  console.log("[RetryWorker] Started — polling every", POLL_INTERVAL_MS / 1000, "seconds.");
  _timer = setInterval(runRetryBatch, POLL_INTERVAL_MS);
  _timer.unref();
}

function stop() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

module.exports = { start, stop, runRetryBatch };
