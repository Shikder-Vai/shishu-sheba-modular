const express = require("express");
const router = express.Router();
const { getGeneralSettings, updateGeneralSettings } = require("../controllers/generalSettings.controller");

router.get("/", getGeneralSettings);
router.put("/", updateGeneralSettings);

module.exports = router;
