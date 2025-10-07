const express = require("express");
const router = express.Router();
const { getBanners, updateBanner, addBanner, deleteBanner } = require("../controllers/banner.controller");

router.get("/", getBanners);
router.patch("/:id", updateBanner);
router.post("/", addBanner);
router.delete("/:id", deleteBanner);

module.exports = router;
