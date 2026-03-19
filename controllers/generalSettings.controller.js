const client = require("../config/db");

const col = client.db("sishuSheba").collection("generalSettings");

// GET /general-settings
exports.getGeneralSettings = async (req, res) => {
    try {
        const doc = await col.findOne({});
        res.json(doc || { homepageCategories: [], showTopSelling: false, topSellingCount: 8 });
    } catch (e) {
        console.error("getGeneralSettings error:", e);
        res.status(500).json({ message: "Internal server error" });
    }
};

// PUT /general-settings
exports.updateGeneralSettings = async (req, res) => {
    try {
        const { homepageCategories, showTopSelling, topSellingCount } = req.body;
        if (!Array.isArray(homepageCategories)) {
            return res.status(400).json({ message: "homepageCategories must be an array" });
        }
        const updateFields = { homepageCategories };
        if (showTopSelling !== undefined) updateFields.showTopSelling = Boolean(showTopSelling);
        if (topSellingCount !== undefined) updateFields.topSellingCount = Math.max(1, Math.min(20, parseInt(topSellingCount) || 8));
        await col.updateOne(
            {},
            { $set: updateFields },
            { upsert: true }
        );
        res.json({ success: true, ...updateFields });
    } catch (e) {
        console.error("updateGeneralSettings error:", e);
        res.status(500).json({ message: "Internal server error" });
    }
};
