const client = require("../config/db");

const orderCollection = client.db("sishuSheba").collection("orders");

const MAX_ORDERS = 2;
const WINDOW_MS = 60 * 60 * 1000;
const IS_DEV = process.env.NODE_ENV !== "production";

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"]?.split(",")[0].trim();
  const ip = forwarded || req.ip || "unknown";

  return ip.replace("::ffff:", "");
}

const orderRateLimiter = async (req, res, next) => {
  const ip = getClientIp(req);

  if (IS_DEV) {
    console.log(`[OrderRateLimiter] IP detected: "${ip}" (dev mode)`);
  }
  if (!ip || ip === "unknown") {
    req.clientIp = "unknown";
    return next();
  }

  try {
    const windowStart = new Date(Date.now() - WINDOW_MS);

    const recentCount = await orderCollection.countDocuments({
      clientIp: ip,
      createdAt: { $gte: windowStart },
    });

    if (IS_DEV) {
      console.log(`[OrderRateLimiter] IP "${ip}" → ${recentCount}/${MAX_ORDERS} orders in last hour`);
    }

    if (recentCount >= MAX_ORDERS) {
      const resetAt = new Date(Date.now() + WINDOW_MS);
      console.warn(`[OrderRateLimiter] BLOCKED IP "${ip}" — ${recentCount} orders in last hour`);
      return res.status(429).json({
        success: false,
        error: "Too many orders",
        message: `আপনি ১ ঘণ্টায় সর্বোচ্চ ${MAX_ORDERS}টি অর্ডার করতে পারবেন। ${resetAt.toLocaleTimeString("bn-BD", { hour: "2-digit", minute: "2-digit" })} এর পরে আবার চেষ্টা করুন।`,
        retryAfter: Math.ceil(WINDOW_MS / 1000),
      });
    }

    req.clientIp = ip;
    next();
  } catch (err) {
    console.error("[OrderRateLimiter] DB check failed, failing open:", err.message);
    req.clientIp = ip;
    next();
  }
};

module.exports = { orderRateLimiter };

orderCollection
  .createIndex({ clientIp: 1, createdAt: -1 })
  .catch((e) => console.warn("[OrderRateLimiter] Index warning:", e.message));

