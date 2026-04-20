/**
 * Server Tracking Controller
 * All admin endpoints for settings, logs, metrics, and health.
 */
const tracking = require("../services/tracking");
const { ObjectId } = require("mongodb");

// ─── Settings ────────────────────────────────────────────────────────────────

exports.getSettings = async (req, res) => {
  try {
    // Mask access tokens so they aren't sent to the browser in plaintext
    const settings = await tracking.getSettings();
    const masked = JSON.parse(JSON.stringify(settings));
    const mask = (v) => (v ? "•".repeat(Math.min(v.length, 20)) : "");
    if (masked.meta?.accessToken)   masked.meta.accessToken   = mask(masked.meta.accessToken);
    if (masked.tiktok?.accessToken) masked.tiktok.accessToken = mask(masked.tiktok.accessToken);
    if (masked.ga4?.apiSecret)      masked.ga4.apiSecret      = mask(masked.ga4.apiSecret);
    res.json({ success: true, data: masked });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const updates = req.body;

    // Don't overwrite tokens with mask placeholders
    const existingSettings = await tracking.getSettings(true);
    const clean = (platform, field) => {
      if (updates[platform]?.[field] && updates[platform][field].startsWith("•")) {
        updates[platform][field] = existingSettings[platform]?.[field] || "";
      }
    };
    clean("meta",   "accessToken");
    clean("tiktok", "accessToken");
    clean("ga4",    "apiSecret");

    await tracking.updateSettings(updates);
    res.json({ success: true, message: "Settings saved." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Logs ─────────────────────────────────────────────────────────────────────

exports.getLogs = async (req, res) => {
  try {
    const { platform, status, startDate, endDate, orderId, page = 1, limit = 50 } = req.query;
    const result = await tracking.getLogs({
      platform, status, startDate, endDate, orderId,
      page: parseInt(page),
      limit: Math.min(parseInt(limit), 100),
    });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteOldLogs = async (req, res) => {
  try {
    const daysOld = parseInt(req.query.days) || 30;
    const deletedCount = await tracking.deleteOldLogs(daysOld);
    res.json({ success: true, deletedCount, message: `Deleted ${deletedCount} logs older than ${daysOld} days.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Metrics ──────────────────────────────────────────────────────────────────

exports.getMetrics = async (req, res) => {
  try {
    const metrics = await tracking.getMetrics();
    res.json({ success: true, data: metrics });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Health ───────────────────────────────────────────────────────────────────

exports.getHealth = async (req, res) => {
  try {
    const health = tracking.getHealthStatus();
    res.json({ success: true, data: health });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Test Event ───────────────────────────────────────────────────────────────

exports.sendTestEvent = async (req, res) => {
  try {
    const { eventType = "purchase", platform } = req.body;

    // Build a realistic fake order for testing
    const testEvent = {
      order: {
        orderId:      `TEST-${Date.now()}`,
        total:        999,
        shippingCost: 60,
        items: [
          { sku: "TEST-SKU-001", name: "Test Product", price: 939, quantity: 1, _id: "test001" },
        ],
      },
      user: {
        name:   "Test Customer",
        mobile: "01712345678",
        email:  "test@shishuseba.com",
      },
    };

    const reqContext = {
      ip:        req.ip || "127.0.0.1",
      userAgent: req.headers["user-agent"] || "Test Agent",
      cookies:   req.cookies || {},
    };

    // Fire to all platforms (settings controlled which are enabled)
    tracking.fireEvent(eventType, testEvent, reqContext).catch(console.error);

    res.json({
      success: true,
      message: `Test ${eventType} event dispatched. Check Event Logs in ~3 seconds.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
