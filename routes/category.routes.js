const express = require("express");
const router = express.Router();
const { getCategories, deleteCategory, addCategory, getCategory, updateCategory } = require("../controllers/category.controller");

router.get("/", getCategories);
router.delete("/:id", deleteCategory);
router.post("/", addCategory);
router.get("/:id", getCategory);
router.put("/:id", updateCategory);      

module.exports = router;
