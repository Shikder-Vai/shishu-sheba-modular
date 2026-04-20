const axios = require("axios");
const { hashPhone, hashEmail, buildEventId } = require("../utils/hash");

const TIKTOK_API_URL = "https://business-api.tiktok.com/open_api/v1.3/pixel/track/";

class TikTokAdapter {
  constructor(settings) {
    this.pixelId = settings.pixelId;
    this.accessToken = settings.accessToken;
  }

  mapEventName(eventType) {
    const map = {
      purchase: "PlaceAnOrder",
      view_content: "ViewContent",
      add_to_cart: "AddToCart",
      initiate_checkout: "InitiateCheckout",
      search: "Search",
    };
    return map[eventType] || "PlaceAnOrder";
  }

  buildPayload(event) {
    const { eventType, order, user, ip, userAgent, timestamp } = event;

    const context = {
      ip: ip || null,
      user_agent: userAgent || null,
      user: {},
    };
    if (user?.mobile) context.user.phone_number = hashPhone(user.mobile);
    if (user?.email) context.user.email = hashEmail(user.email);

    const properties = { currency: "BDT" };

    if (eventType === "purchase" && order) {
      properties.value = order.total || 0;
      properties.order_id = order.orderId;
      properties.contents = (order.items || []).map((item) => ({
        content_id: String(item.sku || item._id || ""),
        content_name: item.name || "",
        quantity: item.quantity || 1,
        price: item.price || 0,
        content_type: "product",
      }));
    }

    return {
      pixel_code: this.pixelId,
      event: this.mapEventName(eventType),
      event_id: buildEventId(eventType, order?.orderId || Date.now()),
      timestamp: new Date(timestamp ? timestamp * 1000 : Date.now()).toISOString(),
      properties,
      context,
    };
  }

  async send(event) {
    const payload = this.buildPayload(event);
    const response = await axios.post(TIKTOK_API_URL, payload, {
      timeout: 8000,
      headers: {
        "Content-Type": "application/json",
        "Access-Token": this.accessToken,
      },
    });
    return { platform: "tiktok", payload, response: response.data };
  }
}

module.exports = TikTokAdapter;
