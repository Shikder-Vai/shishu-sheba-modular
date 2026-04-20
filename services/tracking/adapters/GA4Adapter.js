const axios = require("axios");
const { buildEventId } = require("../utils/hash");

const GA4_MP_URL = "https://www.google-analytics.com/mp/collect";

class GA4Adapter {
  constructor(settings) {
    this.measurementId = settings.measurementId;
    this.apiSecret = settings.apiSecret;
  }

  mapEventName(eventType) {
    const map = {
      purchase: "purchase",
      view_content: "view_item",
      add_to_cart: "add_to_cart",
      initiate_checkout: "begin_checkout",
      search: "search",
    };
    return map[eventType] || eventType;
  }

  buildPayload(event) {
    const { eventType, order, clientId, timestamp } = event;

    const resolvedClientId = clientId || `server_${order?.orderId || Date.now()}`;

    const params = {};

    if (eventType === "purchase" && order) {
      params.transaction_id = order.orderId;
      params.currency = "BDT";
      params.value = order.total || 0;
      params.shipping = order.shippingCost || 0;
      params.tax = 0;
      params.items = (order.items || []).map((item, idx) => ({
        item_id: item.sku || String(item._id || ""),
        item_name: item.name || "",
        price: item.price || 0,
        quantity: item.quantity || 1,
        index: idx,
      }));
    }

    return {
      client_id: resolvedClientId,
      timestamp_micros: timestamp ? timestamp * 1_000_000 : Date.now() * 1000,
      events: [
        {
          name: this.mapEventName(eventType),
          params: {
            ...params,
            engagement_time_msec: 100,
            session_id: buildEventId(eventType, order?.orderId || Date.now()).slice(0, 10),
          },
        },
      ],
    };
  }

  async send(event) {
    const payload = this.buildPayload(event);
    const url = `${GA4_MP_URL}?measurement_id=${this.measurementId}&api_secret=${this.apiSecret}`;
    const response = await axios.post(url, payload, {
      timeout: 8000,
      headers: { "Content-Type": "application/json" },
    });
    return { platform: "ga4", payload, response: response.data };
  }
}

module.exports = GA4Adapter;
