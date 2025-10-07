const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/upload.controller.js");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

// --- Landing Page Image Upload ---
const landingPageUploadDir = path.join(__dirname, "../../shishu-seba-frontend-main/public/uploads/landing-pages");
if (!fs.existsSync(landingPageUploadDir)) {
  fs.mkdirSync(landingPageUploadDir, { recursive: true });
}
const landingPageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, landingPageUploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, uuidv4() + extension);
  },
});
const uploadLandingPage = multer({ storage: landingPageStorage });
router.post("/landing-page-image", uploadLandingPage.single("image"), uploadController.uploadLandingPageImage);

// --- Banner Image Upload ---
const bannerUploadDir = path.join(__dirname, "../../shishu-seba-frontend-main/public/uploads/banners");
if (!fs.existsSync(bannerUploadDir)) {
  fs.mkdirSync(bannerUploadDir, { recursive: true });
}
const bannerStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, bannerUploadDir),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, uuidv4() + extension);
  },
});
const uploadBanner = multer({ storage: bannerStorage });
router.post("/banner-image", uploadBanner.single("image"), uploadController.uploadBannerImage);

module.exports = router;
