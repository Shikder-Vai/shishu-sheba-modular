const express = require("express");
const router = express.Router();
const pixelCodeController = require("../controllers/pixelCode.controller");

// GET /v1/pixel-codes - Get pixel codes
router.get("/", pixelCodeController.getPixelCodes);

// PUT /v1/pixel-codes - Update pixel codes
router.put("/", pixelCodeController.updatePixelCodes);

// DELETE /v1/pixel-codes - Delete pixel codes
router.delete("/", pixelCodeController.deletePixelCodes);

module.exports = router;
