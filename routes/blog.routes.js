const express = require("express");
const router = express.Router();
const blogController = require("../controllers/blog.controller");

router.post("/", blogController.createBlogPost);
router.get("/", blogController.getAllBlogPosts);
router.get("/:id", blogController.getBlogPostById);
router.put("/:id", blogController.updateBlogPost);
router.delete("/:id", blogController.deleteBlogPost);

module.exports = router;
