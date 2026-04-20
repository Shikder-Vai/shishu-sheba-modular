const client = require("../../config/db");

const db = () => client.db("sishuSheba");
const eventsCol = () => db().collection("server_events");

async function logEvent({
  eventType, platform, status, orderId, payload, response,
  errorMessage, ip, userAgent, retryCount = 0, originalEventId = null,
}) {
  try {
    const result = await eventsCol().insertOne({
      eventType,
      platform,
      status,
      orderId: orderId || null,
      payload: payload || null,
      response: response || null,
      errorMessage: errorMessage || null,
      ip: ip || null,
      userAgent: userAgent || null,
      retryCount,
      originalEventId,
      nextRetryAt: null,
      timestamp: new Date(),
    });
    return result.insertedId;
  } catch (err) {
    console.error("[EventLogger] Failed to write log:", err.message);
    return null;
  }
}


const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 15 * 60_000];

async function scheduleRetry(eventId, retryCount) {
  const delayMs = RETRY_DELAYS_MS[retryCount] ?? null;
  if (!delayMs) {
    await eventsCol().updateOne(
      { _id: eventId },
      { $set: { status: "dead_letter", nextRetryAt: null, updatedAt: new Date() } }
    );
    return;
  }
  const nextRetryAt = new Date(Date.now() + delayMs);
  await eventsCol().updateOne(
    { _id: eventId },
    { $set: { nextRetryAt, status: "pending_retry", updatedAt: new Date() } }
  );
}

async function getPendingRetries() {
  return eventsCol()
    .find({
      status: "pending_retry",
      nextRetryAt: { $lte: new Date() },
      retryCount: { $lt: RETRY_DELAYS_MS.length },
    })
    .limit(50)
    .toArray();
}

async function getLogs({ platform, status, startDate, endDate, orderId, page = 1, limit = 50 }) {
  const filter = {};
  if (platform) filter.platform = platform;
  if (status) filter.status = status;
  if (orderId) filter.orderId = orderId;
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }

  const skip = (page - 1) * limit;
  const [logs, total] = await Promise.all([
    eventsCol()
      .find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
    eventsCol().countDocuments(filter),
  ]);

  return { logs, total, page, totalPages: Math.ceil(total / limit) };
}

async function getMetrics() {
  const now = new Date();
  const last24h = new Date(now - 24 * 60 * 60 * 1000);
  const last7d = new Date(now - 7 * 24 * 60 * 60 * 1000);

  const [summary, byPlatform, byDay] = await Promise.all([
    // Overall summary
    eventsCol()
      .aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),

    // Events by platform in last 7 days
    eventsCol()
      .aggregate([
        { $match: { timestamp: { $gte: last7d } } },
        {
          $group: {
            _id: { platform: "$platform", status: "$status" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),

    // Daily event counts for chart (last 7 days)
    eventsCol()
      .aggregate([
        { $match: { timestamp: { $gte: last7d } } },
        {
          $group: {
            _id: {
              date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } },
              platform: "$platform",
              status: "$status",
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.date": 1 } },
      ])
      .toArray(),
  ]);

  const totalEvents = summary.reduce((s, r) => s + r.count, 0);
  const successCount = summary.find((r) => r._id === "success")?.count || 0;
  const failedCount = summary.find((r) => r._id === "failed")?.count || 0;
  const successRate = totalEvents > 0 ? ((successCount / totalEvents) * 100).toFixed(1) : "0.0";

  return {
    summary: { totalEvents, successCount, failedCount, successRate },
    byPlatform,
    byDay,
    period: { last24h, last7d },
  };
}

async function deleteOldLogs(daysOld = 30) {
  const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
  const result = await eventsCol().deleteMany({ timestamp: { $lt: cutoff } });
  return result.deletedCount;
}

async function ensureIndexes() {
  try {
    await eventsCol().createIndex({ timestamp: -1 });
    await eventsCol().createIndex({ platform: 1, status: 1 });
    await eventsCol().createIndex({ orderId: 1 });
    await eventsCol().createIndex({ status: 1, nextRetryAt: 1 });
  } catch (err) {
    console.warn("[EventLogger] Index creation warning:", err.message);
  }
}

module.exports = {
  logEvent,
  scheduleRetry,
  getPendingRetries,
  getLogs,
  getMetrics,
  deleteOldLogs,
  ensureIndexes,
};
