const pixelCodeCollection = require("../models/pixelCode.model");
const { ObjectId } = require("mongodb");

// Get pixel codes
exports.getPixelCodes = async (req, res) => {
  try {
    const pixelCodes = await pixelCodeCollection.findOne({ _id: "default" });

    if (!pixelCodes) {
      return res.status(200).json({
        success: true,
        data: {
          headPixelCode: "",
          bodyPixelCode: "",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: {
        headPixelCode: pixelCodes.headPixelCode || "",
        bodyPixelCode: pixelCodes.bodyPixelCode || "",
      },
    });
  } catch (error) {
    console.error("Error fetching pixel codes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch pixel codes",
      error: error.message,
    });
  }
};

// Update pixel codes
exports.updatePixelCodes = async (req, res) => {
  try {
    const { headPixelCode, bodyPixelCode } = req.body;

    if (headPixelCode === undefined && bodyPixelCode === undefined) {
      return res.status(400).json({
        success: false,
        message: "At least one pixel code field is required",
      });
    }

    const updateData = {};
    if (headPixelCode !== undefined) updateData.headPixelCode = headPixelCode;
    if (bodyPixelCode !== undefined) updateData.bodyPixelCode = bodyPixelCode;
    updateData.updatedAt = new Date();

    // First, try to update existing document
    const result = await pixelCodeCollection.updateOne(
      { _id: "default" },
      { $set: updateData },
    );

    // If no document was updated, insert a new one
    if (result.matchedCount === 0) {
      await pixelCodeCollection.insertOne({
        _id: "default",
        headPixelCode: headPixelCode || "",
        bodyPixelCode: bodyPixelCode || "",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    // Fetch the updated/created document to return
    const updatedDoc = await pixelCodeCollection.findOne({ _id: "default" });

    res.status(200).json({
      success: true,
      message: "Pixel codes updated successfully",
      data: {
        headPixelCode: updatedDoc.headPixelCode || "",
        bodyPixelCode: updatedDoc.bodyPixelCode || "",
      },
    });
  } catch (error) {
    console.error("Error updating pixel codes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update pixel codes",
      error: error.message,
    });
  }
};

// Delete pixel codes
exports.deletePixelCodes = async (req, res) => {
  try {
    const result = await pixelCodeCollection.updateOne(
      { _id: "default" },
      {
        $set: {
          headPixelCode: "",
          bodyPixelCode: "",
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Pixel codes not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Pixel codes deleted successfully",
      data: {
        headPixelCode: "",
        bodyPixelCode: "",
      },
    });
  } catch (error) {
    console.error("Error deleting pixel codes:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete pixel codes",
      error: error.message,
    });
  }
};
