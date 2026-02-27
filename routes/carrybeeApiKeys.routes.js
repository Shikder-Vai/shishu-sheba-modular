const express = require("express");
const router = express.Router();
const carrybeeApiKeysController = require("../controllers/carrybeeApiKeys.controller");

router.get("/", carrybeeApiKeysController.getCarrybeeApiKeys);
router.put("/", carrybeeApiKeysController.updateCarrybeeApiKeys);
router.delete("/", carrybeeApiKeysController.deleteCarrybeeApiKeys);

module.exports = router;
