const express = require("express");
const router = express.Router();
const carrybeeApiKeysController = require("../controllers/carrybeeApiKeys.controller");
const { isAdmin } = require("../middleware/auth.middleware");

router.get("/", carrybeeApiKeysController.getCarrybeeApiKeys);
router.put("/", isAdmin, carrybeeApiKeysController.updateCarrybeeApiKeys);
router.delete("/", isAdmin, carrybeeApiKeysController.deleteCarrybeeApiKeys);

module.exports = router;
