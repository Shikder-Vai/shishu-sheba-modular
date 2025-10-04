const express = require("express");
const router = express.Router();
const {
  getLandingPages,
  getLandingPage,
  createLandingPage,
  updateLandingPage,
  deleteLandingPage,
} = require("../controllers/landingpage.controller.js");

router.get("/", getLandingPages);
router.get("/:id", getLandingPage);
router.post("/", createLandingPage);
router.put("/:id", updateLandingPage);
router.delete("/:id", deleteLandingPage);

module.exports = router;