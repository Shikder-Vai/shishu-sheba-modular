const express = require("express");
const router = express.Router();
const pixelCodeController = require("../controllers/pixelCode.controller");
const { isAdmin } = require("../middleware/auth.middleware");

// GET /v1/pixel-codes - Public: needed by frontend at page load to inject scripts
router.get("/", pixelCodeController.getPixelCodes);

// PUT /v1/pixel-codes - Admin only: prevents anyone from injecting malicious scripts
router.put("/", isAdmin, pixelCodeController.updatePixelCodes);

// DELETE /v1/pixel-codes - Admin only
router.delete("/", isAdmin, pixelCodeController.deletePixelCodes);

module.exports = router;