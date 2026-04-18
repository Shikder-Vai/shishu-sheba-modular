const express = require("express");
const router = express.Router();
const { getBanners, updateBanner, updateBannerLink, addBanner, deleteBanner } = require("../controllers/banner.controller");

router.get("/", getBanners);
router.patch("/:id", updateBanner);
router.patch("/:id/link", updateBannerLink);  // link-only update
router.post("/", addBanner);
router.delete("/:id", deleteBanner);

module.exports = router;

