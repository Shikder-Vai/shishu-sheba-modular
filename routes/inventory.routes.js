const express = require("express");
const router = express.Router();
const {
  updateStock,
  getInventoryLogs,
} = require("../controllers/inventory.controller");

// Route to update stock for a product variant
router.post("/stock/update", updateStock);

// Route to get inventory logs for a product variant
router.get("/logs/:sku", getInventoryLogs);

module.exports = router;
