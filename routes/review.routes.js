const express = require("express");
const router = express.Router();
const {
  getAllReviews,
  addReview,
  deleteReview,
} = require("../controllers/review.controller");

// Get all reviews
router.get("/", getAllReviews);

// Add a new review
router.post("/", addReview);

// Delete a review
router.delete("/:id", deleteReview);

module.exports = router;
