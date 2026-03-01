const client = require("../config/db");

const col = client.db("sishuSheba").collection("generalSettings");

// GET /general-settings
exports.getGeneralSettings = async (req, res) => {
    try {
        const doc = await col.findOne({});
        res.json(doc || { homepageCategories: [] });
    } catch (e) {
        console.error("getGeneralSettings error:", e);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /general-settings
exports.updateGeneralSettings = async (req, res) => {
    try {
        const { homepageCategories } = req.body;
        if (!Array.isArray(homepageCategories)) {
            return res.status(400).json({ message: "homepageCategories must be an array" });
        }
        await col.updateOne(
            {},
            { $set: { homepageCategories } },
            { upsert: true }
        );
        res.json({ success: true, homepageCategories });
    } catch (e) {
        console.error("updateGeneralSettings error:", e);
        res.status(500).json({ message: "Internal server error" });
    }
};
