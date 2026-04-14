const express = require("express");
const router = express.Router();
const { getGeneralSettings, updateGeneralSettings } = require("../controllers/generalSettings.controller");
const { isAdmin } = require("../middleware/auth.middleware");

router.get("/", getGeneralSettings);
router.put("/", isAdmin, updateGeneralSettings);

module.exports = router;
