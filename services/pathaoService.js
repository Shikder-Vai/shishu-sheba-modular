const axios = require("axios");
const pathaoKeysCollection = require("../models/pathaoApiKeys.model");

/**
 * Gets a valid access token.
 * 1. If stored token is still valid, returns it.
 * 2. If expired but refresh token exists, refreshes it.
 * 3. Otherwise, issues a new token using username + password.
 * Always persists new tokens to MongoDB.
 */
async function getValidToken(creds) {
    const {
        clientId,
        clientSecret,
        username,
        password,
        accessToken,
        refreshToken,
        tokenExpiresAt,
        baseUrl,
    } = creds;

    const base = baseUrl || "https://api-hermes.pathao.com";
    const tokenEndpoint = `${base}/aladdin/api/v1/issue-token`;

    // 1. Token still valid (with 60s buffer)
    if (accessToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 60000) {
        return accessToken;
    }

    let tokenData;

    // 2. Try refresh token
    if (refreshToken) {
        try {
            const res = await axios.post(tokenEndpoint, {
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: "refresh_token",
                refresh_token: refreshToken,
            });
            tokenData = res.data;
        } catch (err) {
            console.warn("Pathao refresh token failed, falling back to password grant:", err.response?.data || err.message);
        }
    }

    // 3. Fallback: password grant
    if (!tokenData) {
        const res = await axios.post(tokenEndpoint, {
            client_id: clientId,
            client_secret: clientSecret,
            grant_type: "password",
            username,
            password,
        });
        tokenData = res.data;
    }

    // Persist new tokens to MongoDB
    const expiresAt = Date.now() + tokenData.expires_in * 1000;
    await pathaoKeysCollection.updateOne(
        { _id: "default" },
        {
            $set: {
                accessToken: tokenData.access_token,
                refreshToken: tokenData.refresh_token,
                tokenExpiresAt: expiresAt,
                updatedAt: new Date(),
            },
        }
    );

    return tokenData.access_token;
}

/**
 * Creates a single Pathao order.
 * Returns the response data: { consignment_id, merchant_order_id, order_status, delivery_fee }
 */
async function createSingleOrder(orderPayload, creds) {
    const base = creds.baseUrl || "https://api-hermes.pathao.com";
    const token = await getValidToken(creds);

    const res = await axios.post(
        `${base}/aladdin/api/v1/orders`,
        orderPayload,
        {
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            timeout: 30000,
        }
    );

    return res.data;
}

module.exports = { getValidToken, createSingleOrder };
