const axios = require("axios");

async function sendBulkShipment(orders, apiKey, secretKey) {
  // Prepare orders with fallback invoice and cleaned data (same logic as your main code)
  const steadfastOrders = orders.map((order) => {
    const invoice =
      order.invoice ||
      `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    return {
      invoice,
      recipient_name: order.recipient_name || "Customer Name Missing",
      recipient_phone: order.recipient_phone
        ? order.recipient_phone
            .toString()
            .replace(/\D/g, "")
            .padStart(11, "0")
            .slice(0, 11)
        : "00000000000",
      recipient_address: order.recipient_address
        ? order.recipient_address.substring(0, 250)
        : "Address Missing",
      cod_amount: order.cod_amount || 0,
      note: order.note || "",
      item_description: order.item_description || "N/A",
      total_lot: order.total_lot || 1,
      delivery_type: order.delivery_type || 0,
    };
  });

  const response = await axios.post(
    "https://portal.packzy.com/api/v1/create_order/bulk-order",
    { data: steadfastOrders },
    {
      headers: {
        "Api-Key": apiKey,
        "Secret-Key": secretKey,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    }
  );

  return { response, steadfastOrders };
}

module.exports = { sendBulkShipment };
