const express = require("express");
const router = express.Router();
const {
  getLandingPage,
  updateLandingPage,
} = require("../controllers/landingpage.controller.js");

router.get("/", getLandingPage);
router.post("/", updateLandingPage);

module.exports = router;
