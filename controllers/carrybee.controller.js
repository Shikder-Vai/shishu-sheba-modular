const carrybeeKeysCollection = require("../models/carrybeeApiKeys.model");
const { createSingleOrder, getOrderDetails, getStores, sanitizeAddress, lookupAddressDetails } = require("../services/carrybeeService");

exports.bulkShipmentHandler = async (req, res) => {
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
        return res.status(400).json({ message: "Invalid orders format." });
    }

    const creds = await carrybeeKeysCollection.findOne({ _id: "default" });

    if (!creds || !creds.clientId || !creds.clientSecret || !creds.clientContext) {
        return res.status(400).json({ message: "Carrybee API credentials are not configured. Please add them in Website Settings." });
    }

    if (!creds.storeId) {
        return res.status(400).json({ message: "Carrybee Store ID is not configured. Use 'Fetch My Stores' in Website Settings." });
    }

    const results = [];

    for (const order of orders) {
        try {
            const rawPhone = (order.recipient_phone || "").toString().replace(/\D/g, "");
            const phone = rawPhone.startsWith("880") ? rawPhone : `880${rawPhone.replace(/^0/, "")}`;

            const recipientAddress = sanitizeAddress(order.recipient_address);
            const itemWeightGrams = Math.min(Math.max(Math.round((order.item_weight || 0.5) * 1000), 1), 25000);

            let city_id = null;
            let zone_id = null;

            try {
                const addressDetails = await lookupAddressDetails(recipientAddress, creds);
                if (addressDetails?.city_id) city_id = addressDetails.city_id;
                if (addressDetails?.zone_id) zone_id = addressDetails.zone_id;
            } catch (lookupErr) {
                console.warn(`Carrybee address lookup failed for invoice ${order.invoice}:`, lookupErr.response?.data?.message || lookupErr.message);
            }

            if (!city_id || !zone_id) {
                results.push({
                    invoice: order.invoice,
                    status: "error",
                    consignment_id: null,
                    message: `Could not determine city/zone for address: "${recipientAddress}". Carrybee requires a recognizable Bangladesh address.`,
                });
                continue;
            }

            const payload = {
                store_id: creds.storeId,
                merchant_order_id: order.invoice || undefined,
                delivery_type: 1,
                product_type: 1,
                recipient_phone: phone,
                recipient_name: (order.recipient_name || "Customer").substring(0, 99),
                recipient_address: recipientAddress,
                city_id,
                zone_id,
                item_weight: itemWeightGrams,
                item_quantity: order.item_quantity || 1,
                collectable_amount: order.cod_amount || 0,
                ...(order.note && { special_instruction: order.note.substring(0, 255) }),
            };

            const response = await createSingleOrder(payload, creds);

            results.push({
                invoice: order.invoice,
                status: "success",
                consignment_id: response.data?.order?.consignment_id || null,
                merchant_order_id: response.data?.order?.merchant_order_id || order.invoice,
                delivery_fee: response.data?.order?.delivery_fee || null,
                message: response.message || "Order Created Successfully",
            });
        } catch (err) {
            console.error(`Carrybee order failed for invoice ${order.invoice}:`, err.response?.data || err.message);
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

exports.trackOrderHandler = async (req, res) => {
    const { consignmentId } = req.params;

    try {
        const creds = await carrybeeKeysCollection.findOne({ _id: "default" });

        if (!creds || !creds.clientId) {
            return res.status(400).json({ success: false, message: "Carrybee credentials not configured." });
        }

        const data = await getOrderDetails(consignmentId, creds);

        res.status(200).json({ success: true, data: data.data || {} });
    } catch (err) {
        console.error("Carrybee track error:", err.response?.data || err.message);
        res.status(500).json({
            success: false,
            message: err.response?.data?.message || "Failed to fetch Carrybee tracking info",
        });
    }
};

exports.getStoresHandler = async (req, res) => {
    try {
        const creds = await carrybeeKeysCollection.findOne({ _id: "default" });

        if (!creds || !creds.clientId) {
            return res.status(400).json({ success: false, message: "Carrybee credentials not configured. Save them first." });
        }

        const data = await getStores(creds);

        res.status(200).json({ success: true, stores: data.data?.stores || [] });
    } catch (err) {
        console.error("Carrybee get stores error:", err.response?.data || err.message);
        res.status(500).json({
            success: false,
            message: err.response?.data?.message || "Failed to fetch Carrybee stores",
        });
    }
};
