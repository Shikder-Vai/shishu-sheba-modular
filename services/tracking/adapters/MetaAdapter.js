const axios = require("axios");
const { hashPhone, hashEmail, hashName, buildEventId } = require("../utils/hash");

const META_API_VERSION = "v18.0";
const META_BASE_URL = `https://graph.facebook.com/${META_API_VERSION}`;

class MetaAdapter {
  constructor(settings) {
    this.pixelId = settings.pixelId;
    this.accessToken = settings.accessToken;
    this.testCode = settings.testEventCode || null;
  }

  mapEventName(eventType) {
    const map = {
      purchase: "Purchase",
      view_content: "ViewContent",
      add_to_cart: "AddToCart",
      initiate_checkout: "InitiateCheckout",
      search: "Search",
      lead: "Lead",
    };
    return map[eventType] || eventType;
  }

  buildPayload(event) {
    const { eventType, order, user, ip, userAgent, cookies = {}, timestamp } = event;

    // ── User data (hashed PII) ─────────────────────────────────────
    const userData = {
      client_ip_address: ip || null,
      client_user_agent: userAgent || null,
    };
    if (user?.mobile) userData.ph = [hashPhone(user.mobile)];
    if (user?.email) userData.em = [hashEmail(user.email)];
    if (user?.name) userData.fn = [hashName(user.name.split(" ")[0])];
    if (cookies._fbc) userData.fbc = cookies._fbc;
    if (cookies._fbp) userData.fbp = cookies._fbp;

    // ── Custom data ────────────────────────────────────────────────
    const customData = {
      currency: "BDT",
    };

    if (eventType === "purchase" && order) {
      customData.value = order.total || 0;
      customData.order_id = order.orderId;
      customData.contents = (order.items || []).map((item) => ({
        id: item.sku || item._id,
        quantity: item.quantity || 1,
        item_price: item.price || 0,
        title: item.name || "",
      }));
      customData.content_type = "product";
      customData.num_items = (order.items || []).reduce((s, i) => s + (i.quantity || 1), 0);
    }

    const payload = {
      data: [
        {
          event_name: this.mapEventName(eventType),
          event_time: timestamp || Math.floor(Date.now() / 1000),
          event_id: buildEventId(eventType, order?.orderId || Date.now()),
          action_source: "website",
          user_data: userData,
          custom_data: customData,
        },
      ],
    };

    if (this.testCode) payload.test_event_code = this.testCode;

    return payload;
  }

  async send(event) {
    const payload = this.buildPayload(event);
    const url = `${META_BASE_URL}/${this.pixelId}/events?access_token=${this.accessToken}`;
    const response = await axios.post(url, payload, {
      timeout: 8000,
      headers: { "Content-Type": "application/json" },
    });
    return { platform: "meta", payload, response: response.data };
  }
}

module.exports = MetaAdapter;
