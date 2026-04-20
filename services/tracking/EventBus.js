const MetaAdapter = require("./adapters/MetaAdapter");
const TikTokAdapter = require("./adapters/TikTokAdapter");
const GA4Adapter = require("./adapters/GA4Adapter");
const CircuitBreaker = require("./CircuitBreaker");
const EventLogger = require("./EventLogger");
const { getSettings } = require("./TrackingSettings");

const breakers = {
  meta: new CircuitBreaker("meta", { failureThreshold: 5, cooldownMs: 3 * 60_000 }),
  tiktok: new CircuitBreaker("tiktok", { failureThreshold: 5, cooldownMs: 3 * 60_000 }),
  ga4: new CircuitBreaker("ga4", { failureThreshold: 5, cooldownMs: 3 * 60_000 }),
};

async function dispatchOne(platform, adapter, event, meta) {
  const { ip, userAgent, orderId } = meta;

  if (!breakers[platform].isAllowed()) {
    await EventLogger.logEvent({
      eventType: event.eventType,
      platform,
      status: "skipped",
      orderId,
      ip,
      userAgent,
      errorMessage: `Circuit breaker OPEN for ${platform}`,
    });
    return { platform, status: "skipped" };
  }

  try {
    const result = await adapter.send(event);
    breakers[platform].onSuccess();
    await EventLogger.logEvent({
      eventType: event.eventType,
      platform,
      status: "success",
      orderId,
      payload: result.payload,
      response: result.response,
      ip,
      userAgent,
    });
    return { platform, status: "success" };
  } catch (err) {
    breakers[platform].onFailure();

    const logId = await EventLogger.logEvent({
      eventType: event.eventType,
      platform,
      status: "failed",
      orderId,
      payload: null,
      errorMessage: err?.response?.data
        ? JSON.stringify(err.response.data)
        : err.message,
      ip,
      userAgent,
    });

    // Schedule retry
    if (logId) await EventLogger.scheduleRetry(logId, 0);

    return { platform, status: "failed", error: err.message };
  }
}

async function fireEvent(eventType, eventData, reqContext = {}) {
  const settings = await getSettings();
  const { order, user } = eventData;
  const { ip, userAgent, cookies = {}, clientId } = reqContext;

  const event = {
    eventType,
    order,
    user,
    ip,
    userAgent,
    cookies,
    clientId,
    timestamp: Math.floor(Date.now() / 1000),
  };

  const meta = { ip, userAgent, orderId: order?.orderId };

  const dispatches = [];

  if (settings.meta?.enabled && settings.eventsToTrack?.[eventType] !== false) {
    const adapter = new MetaAdapter(settings.meta);
    dispatches.push(dispatchOne("meta", adapter, event, meta));
  }
  if (settings.tiktok?.enabled && settings.eventsToTrack?.[eventType] !== false) {
    const adapter = new TikTokAdapter(settings.tiktok);
    dispatches.push(dispatchOne("tiktok", adapter, event, meta));
  }
  if (settings.ga4?.enabled && settings.eventsToTrack?.[eventType] !== false) {
    const adapter = new GA4Adapter(settings.ga4);
    dispatches.push(dispatchOne("ga4", adapter, event, meta));
  }

  if (dispatches.length === 0) return;

  await Promise.allSettled(dispatches);
}

function getHealthStatus() {
  return Object.entries(breakers).map(([platform, cb]) => ({
    platform,
    ...cb.getStats(),
  }));
}

module.exports = { fireEvent, getHealthStatus };
