const express = require("express");
const router = express.Router();
const steadfastApiKeysController = require("../controllers/steadfastApiKeys.controller");
const { isAdmin } = require("../middleware/auth.middleware");

router.get("/", steadfastApiKeysController.getSteadfastApiKeys);
router.put("/", isAdmin, steadfastApiKeysController.updateSteadfastApiKeys);
router.delete("/", isAdmin, steadfastApiKeysController.deleteSteadfastApiKeys);

module.exports = router;
