const express = require("express");
const router = express.Router();
const { getBanners, updateBanner } = require("../controllers/banner.controller");

router.get("/", getBanners);
router.patch("/:id", updateBanner);

module.exports = router;
