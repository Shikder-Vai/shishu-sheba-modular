const client = require("../../config/db");

const db = () => client.db("sishuSheba");
const col = () => db().collection("tracking_settings");

const DEFAULT_SETTINGS = {
  _id: "default",
  meta: {
    enabled: false,
    pixelId: "",
    accessToken: "",
    testEventCode: "",
  },
  tiktok: {
    enabled: false,
    pixelId: "",
    accessToken: "",
  },
  ga4: {
    enabled: false,
    measurementId: "",
    apiSecret: "",
  },
  eventsToTrack: {
    purchase: true,
    view_content: false,
    add_to_cart: false,
    initiate_checkout: false,
  },
  updatedAt: null,
};

let _cache = null;
let _cacheTs = 0;
const CACHE_TTL_MS = 60_000;

async function getSettings(forceRefresh = false) {
  const now = Date.now();
  if (_cache && !forceRefresh && now - _cacheTs < CACHE_TTL_MS) {
    return _cache;
  }
  const doc = await col().findOne({ _id: "default" });
  _cache = doc || DEFAULT_SETTINGS;
  _cacheTs = now;
  return _cache;
}

async function updateSettings(updates) {
  const updateDoc = { ...updates, updatedAt: new Date() };
  delete updateDoc._id;

  const result = await col().updateOne(
    { _id: "default" },
    { $set: updateDoc },
    { upsert: true }
  );

  // Bust cache
  _cache = null;
  _cacheTs = 0;

  return result;
}

function bustCache() {
  _cache = null;
  _cacheTs = 0;
}

module.exports = { getSettings, updateSettings, bustCache, DEFAULT_SETTINGS };
