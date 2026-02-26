const { createSingleOrder, getValidToken } = require("../services/pathaoService");
const pathaoKeysCollection = require("../models/pathaoApiKeys.model");
const axios = require("axios");

/**
 * Sanitize recipient address to meet Pathao's 10-char minimum, 220-char maximum.
 * Strips degenerate ", " pattern (when both address and district are empty).
 */
function sanitizeAddress(raw) {
    const cleaned = (raw || "").replace(/^[\s,]+|[\s,]+$/g, "").trim();
    if (cleaned.length >= 10) return cleaned.substring(0, 220);
    return (cleaned.length > 0 ? cleaned + " - Bangladesh" : "Address not provided").substring(0, 220);
}

/**
 * POST /v1/pathao/bulk-shipment
 * Body: { orders: [{ invoice, recipient_name, recipient_phone, recipient_address, cod_amount, note, item_quantity, item_weight }] }
 */
exports.bulkShipmentHandler = async (req, res) => {
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({
            message: "Invalid orders format. Expected a non-empty array of orders.",
        });
    }

    const creds = await pathaoKeysCollection.findOne({ _id: "default" });

    if (!creds || !creds.clientId || !creds.clientSecret || !creds.username || !creds.password) {
        return res.status(400).json({
            message: "Pathao API credentials are not configured. Please add them in Website Settings.",
        });
    }

    if (!creds.storeId) {
        return res.status(400).json({
            message: "Pathao Store ID is not configured. Use the 'Fetch Stores' button in Website Settings to find your Store ID.",
        });
    }

    const results = [];

    for (const order of orders) {
        try {
            const rawPhone = (order.recipient_phone || "").toString().replace(/\D/g, "");
            const phone = rawPhone.padStart(11, "0").slice(0, 11);

            const payload = {
                store_id: parseInt(creds.storeId),
                merchant_order_id: order.invoice || `ORD-${Date.now()}`,
                recipient_name: (order.recipient_name || "Customer").substring(0, 100),
                recipient_phone: phone,
                recipient_address: sanitizeAddress(order.recipient_address),
                delivery_type: 48,
                item_type: 2,
                item_quantity: order.item_quantity || 1,
                item_weight: order.item_weight || 0.5,
                amount_to_collect: order.cod_amount || 0,
                ...(order.note && { special_instruction: order.note.substring(0, 255) }),
            };

            const response = await createSingleOrder(payload, creds);

            results.push({
                invoice: order.invoice,
                status: "success",
                consignment_id: response.data?.consignment_id || null,
                merchant_order_id: response.data?.merchant_order_id || order.invoice,
                order_status: response.data?.order_status || "Pending",
                delivery_fee: response.data?.delivery_fee || null,
                message: response.message || "Order Created Successfully",
            });
        } catch (err) {
            console.error(`Pathao order failed for invoice ${order.invoice}:`, err.response?.data || err.message);
            results.push({
                invoice: order.invoice,
                status: "error",
                consignment_id: null,
                message: err.response?.data?.message || err.message,
                error_details: err.response?.data,
            });
        }
    }

    res.status(200).json(results);
};

/**
 * GET /v1/pathao/stores
 * Fetches available stores from Pathao using saved credentials.
 */
exports.getStoresHandler = async (req, res) => {
    try {
        const creds = await pathaoKeysCollection.findOne({ _id: "default" });

        if (!creds || !creds.clientId || !creds.clientSecret || !creds.username || !creds.password) {
            return res.status(400).json({
                message: "Pathao API credentials are not configured. Please save them in Website Settings first.",
            });
        }

        const base = creds.baseUrl || "https://api-hermes.pathao.com";
        const token = await getValidToken(creds);

        const response = await axios.get(`${base}/aladdin/api/v1/stores`, {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            timeout: 15000,
        });

        res.status(200).json({
            success: true,
            stores: response.data?.data?.data || [],
            total: response.data?.data?.total || 0,
        });
    } catch (err) {
        console.error("Pathao get stores error:", err.response?.data || err.message);
        res.status(500).json({
            success: false,
            message: err.response?.data?.message || "Failed to fetch Pathao stores",
            error_details: err.response?.data,
        });
    }
};
