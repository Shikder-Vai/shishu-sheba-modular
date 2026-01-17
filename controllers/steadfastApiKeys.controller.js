const steadfastKeysCollection = require("../models/steadfastApiKeys.model");

// Get Steadfast API keys
exports.getSteadfastApiKeys = async (req, res) => {
  try {
    const apiKeys = await steadfastKeysCollection.findOne({ _id: "default" });

    if (!apiKeys) {
      return res.status(200).json({
        success: true,
        data: {
          publicKey: "",
          secretKey: "",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        publicKey: apiKeys.publicKey || "",
        secretKey: apiKeys.secretKey || "",
      },
    });
  } catch (error) {
    console.error("Error fetching Steadfast API keys:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch Steadfast API keys",
      error: error.message,
    });
  }
};

// Update Steadfast API keys
exports.updateSteadfastApiKeys = async (req, res) => {
  try {
    const { publicKey, secretKey } = req.body;

    if (!publicKey && !secretKey) {
      return res.status(400).json({
        success: false,
        message: "At least one API key field is required",
      });
    }

    const updateData = {};
    if (publicKey !== undefined) updateData.publicKey = publicKey;
    if (secretKey !== undefined) updateData.secretKey = secretKey;
    updateData.updatedAt = new Date();

    // First, try to update existing document
    const result = await steadfastKeysCollection.updateOne(
      { _id: "default" },
      { $set: updateData },
    );

    // If no document was updated, insert a new one
    if (result.matchedCount === 0) {
      await steadfastKeysCollection.insertOne({
        _id: "default",
        publicKey: publicKey || "",
        secretKey: secretKey || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Fetch the updated/created document to return
    const updatedDoc = await steadfastKeysCollection.findOne({
      _id: "default",
    });

    res.status(200).json({
      success: true,
      message: "Steadfast API keys updated successfully",
      data: {
        publicKey: updatedDoc.publicKey || "",
        secretKey: updatedDoc.secretKey || "",
      },
    });
  } catch (error) {
    console.error("Error updating Steadfast API keys:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update Steadfast API keys",
      error: error.message,
    });
  }
};

// Delete Steadfast API keys
exports.deleteSteadfastApiKeys = async (req, res) => {
  try {
    const result = await steadfastKeysCollection.updateOne(
      { _id: "default" },
      {
        $set: {
          publicKey: "",
          secretKey: "",
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Steadfast API keys not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Steadfast API keys deleted successfully",
      data: {
        publicKey: "",
        secretKey: "",
      },
    });
  } catch (error) {
    console.error("Error deleting Steadfast API keys:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete Steadfast API keys",
      error: error.message,
    });
  }
};
