const axios = require("axios");

function buildHeaders(creds) {
    return {
        "Content-Type": "application/json",
        "Client-ID": creds.clientId,
        "Client-Secret": creds.clientSecret,
        "Client-Context": creds.clientContext,
    };
}

function sanitizeAddress(raw) {
    const cleaned = (raw || "").replace(/^[\s,]+|[\s,]+$/g, "").trim();
    if (cleaned.length >= 10) return cleaned.substring(0, 200);
    return (cleaned.length > 0 ? cleaned + " - Bangladesh" : "Address not provided").substring(0, 200);
}

async function lookupAddressDetails(addressQuery, creds) {
    const base = creds.baseUrl || "https://developers.carrybee.com";
    const query = (addressQuery || "").substring(0, 200).trim();
    const safeQuery = query.length >= 10 ? query : query + " Dhaka Bangladesh";
    const response = await axios.post(
        `${base}/api/v2/address-details`,
        { query: safeQuery },
        { headers: buildHeaders(creds), timeout: 10000 }
    );
    return response.data?.data || null;
}

async function createSingleOrder(payload, creds) {
    const base = creds.baseUrl || "https://developers.carrybee.com";
    const response = await axios.post(`${base}/api/v2/orders`, payload, {
        headers: buildHeaders(creds),
        timeout: 20000,
    });
    return response.data;
}

async function getOrderDetails(consignmentId, creds) {
    const base = creds.baseUrl || "https://developers.carrybee.com";
    const response = await axios.get(`${base}/api/v2/orders/${consignmentId}/details`, {
        headers: buildHeaders(creds),
        timeout: 15000,
    });
    return response.data;
}

async function getStores(creds) {
    const base = creds.baseUrl || "https://developers.carrybee.com";
    const response = await axios.get(`${base}/api/v2/stores`, {
        headers: buildHeaders(creds),
        timeout: 15000,
    });
    return response.data;
}

module.exports = { createSingleOrder, getOrderDetails, getStores, sanitizeAddress, lookupAddressDetails };
