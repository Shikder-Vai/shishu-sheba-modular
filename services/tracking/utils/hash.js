const crypto = require("crypto");

function sha256(value) {
  if (!value) return null;
  const normalized = String(value).trim().toLowerCase();
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

function normalizePhone(phone) {
  if (!phone) return null;
  let p = String(phone).replace(/\D/g, "");
  if (p.startsWith("880")) p = "+" + p;
  else if (p.startsWith("0")) p = "+88" + p;
  else if (!p.startsWith("+")) p = "+88" + p;
  return p;
}

function hashPhone(phone) {
  const normalized = normalizePhone(phone);
  return sha256(normalized);
}

function hashEmail(email) {
  return sha256(email);
}

function hashName(name) {
  return sha256(name);
}

function buildEventId(eventType, orderId) {
  const raw = `${eventType}_${orderId}_ss`;
  return crypto.createHash("md5").update(raw).digest("hex");
}

module.exports = { sha256, hashPhone, hashEmail, hashName, normalizePhone, buildEventId };
