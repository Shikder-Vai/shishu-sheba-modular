const pathaoKeysCollection = require("../models/pathaoApiKeys.model");

// GET /v1/pathao-api-keys
exports.getPathaoApiKeys = async (req, res) => {
    try {
        const doc = await pathaoKeysCollection.findOne({ _id: "default" });

        const data = doc
            ? {
                clientId: doc.clientId || "",
                clientSecret: doc.clientSecret || "",
                username: doc.username || "",
                password: doc.password || "",
                storeId: doc.storeId || "",
                baseUrl: doc.baseUrl || "https://api-hermes.pathao.com",
            }
            : {
                clientId: "",
                clientSecret: "",
                username: "",
                password: "",
                storeId: "",
                baseUrl: "https://api-hermes.pathao.com",
            };

        res.status(200).json({ success: true, data });
    } catch (error) {
        console.error("Error fetching Pathao API keys:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch Pathao API keys",
            error: error.message,
        });
    }
};

// PUT /v1/pathao-api-keys
exports.updatePathaoApiKeys = async (req, res) => {
    try {
        const { clientId, clientSecret, username, password, storeId, baseUrl } =
            req.body;

        const updateData = {};
        if (clientId !== undefined) updateData.clientId = clientId;
        if (clientSecret !== undefined) updateData.clientSecret = clientSecret;
        if (username !== undefined) updateData.username = username;
        if (password !== undefined) updateData.password = password;
        if (storeId !== undefined) updateData.storeId = storeId;
        if (baseUrl !== undefined) updateData.baseUrl = baseUrl;
        updateData.updatedAt = new Date();

        // Clear stored tokens when credentials change so a fresh token is issued
        updateData.accessToken = "";
        updateData.refreshToken = "";
        updateData.tokenExpiresAt = null;

        const result = await pathaoKeysCollection.updateOne(
            { _id: "default" },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            await pathaoKeysCollection.insertOne({
                _id: "default",
                clientId: clientId || "",
                clientSecret: clientSecret || "",
                username: username || "",
                password: password || "",
                storeId: storeId || "",
                baseUrl: baseUrl || "https://api-hermes.pathao.com",
                accessToken: "",
                refreshToken: "",
                tokenExpiresAt: null,
                createdAt: new Date(),
                updatedAt: new Date(),
            });
        }

        const updatedDoc = await pathaoKeysCollection.findOne({ _id: "default" });

        res.status(200).json({
            success: true,
            message: "Pathao API keys updated successfully",
            data: {
                clientId: updatedDoc.clientId || "",
                clientSecret: updatedDoc.clientSecret || "",
                username: updatedDoc.username || "",
                password: updatedDoc.password || "",
                storeId: updatedDoc.storeId || "",
                baseUrl: updatedDoc.baseUrl || "https://api-hermes.pathao.com",
            },
        });
    } catch (error) {
        console.error("Error updating Pathao API keys:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update Pathao API keys",
            error: error.message,
        });
    }
};

// DELETE /v1/pathao-api-keys
exports.deletePathaoApiKeys = async (req, res) => {
    try {
        const result = await pathaoKeysCollection.updateOne(
            { _id: "default" },
            {
                $set: {
                    clientId: "",
                    clientSecret: "",
                    username: "",
                    password: "",
                    storeId: "",
                    accessToken: "",
                    refreshToken: "",
                    tokenExpiresAt: null,
                    updatedAt: new Date(),
                },
            }
        );

        if (result.matchedCount === 0) {
            return res
                .status(404)
                .json({ success: false, message: "Pathao API keys not found" });
        }

        res.status(200).json({
            success: true,
            message: "Pathao API keys deleted successfully",
        });
    } catch (error) {
        console.error("Error deleting Pathao API keys:", error);
        res.status(500).json({
            success: false,
            message: "Failed to delete Pathao API keys",
            error: error.message,
        });
    }
};
