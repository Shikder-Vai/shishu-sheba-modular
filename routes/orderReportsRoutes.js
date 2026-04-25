// routes/orderReportsRoutes.js
const express = require("express");
const router = express.Router();
const orderReportsController = require("../controllers/orderReportsController");

router.get("/dashboard", orderReportsController.getDashboardStats);
router.get("/sales-performance", orderReportsController.getSalesPerformance);
router.get(
  "/order-status-summary",
  orderReportsController.getOrderStatusSummary,
);
router.get(
  "/product-performance",
  orderReportsController.getProductPerformance,
);
router.get(
  "/district-wise-orders",
  orderReportsController.getDistrictWiseOrders,
);
router.get("/customer-insights", orderReportsController.getCustomerInsights);
router.get("/districts", orderReportsController.getUniqueDistricts);
router.get("/all-customers", orderReportsController.getAllCustomers);

module.exports = router;
