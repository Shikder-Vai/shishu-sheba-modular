const express = require("express");
const router = express.Router();
const uploadController = require("../controllers/upload.controller.js");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs");

// IMPORTANT: You need to change this path to the absolute path of the frontend's public directory on your server.
const uploadDir = path.join(__dirname, "../../shishu-seba-frontend-main/public/uploads/landing-pages");

// Create the directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const extension = path.extname(file.originalname);
    cb(null, uuidv4() + extension);
  },
});

const upload = multer({ storage: storage });

router.post("/landing-page-image", upload.single("image"), uploadController.uploadLandingPageImage);

module.exports = router;
