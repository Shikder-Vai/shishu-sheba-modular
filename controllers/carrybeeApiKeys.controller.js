const carrybeeKeysCollection = require("../models/carrybeeApiKeys.model");

exports.getCarrybeeApiKeys = async (req, res) => {
    const doc = await carrybeeKeysCollection.findOne({ _id: "default" });
    res.status(200).json({ success: true, data: doc || {} });
};

exports.updateCarrybeeApiKeys = async (req, res) => {
    const { clientId, clientSecret, clientContext, storeId, baseUrl } = req.body;

    await carrybeeKeysCollection.updateOne(
        { _id: "default" },
        {
            $set: {
                clientId: clientId || "",
                clientSecret: clientSecret || "",
                clientContext: clientContext || "",
                storeId: storeId || "",
                baseUrl: baseUrl || "https://developers.carrybee.com",
                updatedAt: new Date(),
            },
            $setOnInsert: { createdAt: new Date() },
        },
        { upsert: true },
    );

    res.status(200).json({ success: true, message: "Carrybee API keys updated successfully." });
};

exports.deleteCarrybeeApiKeys = async (req, res) => {
    await carrybeeKeysCollection.deleteOne({ _id: "default" });
    res.status(200).json({ success: true, message: "Carrybee API keys deleted successfully." });
};
