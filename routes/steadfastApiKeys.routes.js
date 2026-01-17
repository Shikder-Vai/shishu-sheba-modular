const express = require("express");
const router = express.Router();
const steadfastApiKeysController = require("../controllers/steadfastApiKeys.controller");

// GET /v1/steadfast-api-keys - Get API keys
router.get("/", steadfastApiKeysController.getSteadfastApiKeys);

// PUT /v1/steadfast-api-keys - Update API keys
router.put("/", steadfastApiKeysController.updateSteadfastApiKeys);

// DELETE /v1/steadfast-api-keys - Delete API keys
router.delete("/", steadfastApiKeysController.deleteSteadfastApiKeys);

module.exports = router;
