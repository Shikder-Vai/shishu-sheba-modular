const express = require("express");
const router = express.Router();
const pathaoApiKeysController = require("../controllers/pathaoApiKeys.controller");

// GET /v1/pathao-api-keys
router.get("/", pathaoApiKeysController.getPathaoApiKeys);

// PUT /v1/pathao-api-keys
router.put("/", pathaoApiKeysController.updatePathaoApiKeys);

// DELETE /v1/pathao-api-keys
router.delete("/", pathaoApiKeysController.deletePathaoApiKeys);

module.exports = router;
