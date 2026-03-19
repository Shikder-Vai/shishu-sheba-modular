const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrdersByStatus,
  updateOrder,
  trackOrder,
  updateFullOrder,
  deleteOrders,
  getOrdersByMobile,
  getMyOrders,
  getTopSellingProducts,
} = require("../controllers/order.controller");
const { isAdminOrModerator, isAuthenticated } = require("../middleware/auth.middleware");

router.post("/order", createOrder);
router.post("/admin-order", isAdminOrModerator, createOrder);
router.get("/order-request", getOrdersByStatus);
router.get("/orders-by-mobile", getOrdersByMobile);
router.get("/order/track/:orderId", trackOrder);
router.patch("/order-request/:id", updateOrder);
router.patch("/update-full-order/:id", updateFullOrder);
router.delete("/order", deleteOrders);

router.get("/my-orders", isAuthenticated, getMyOrders);
router.get("/top-selling-products", getTopSellingProducts);

module.exports = router;
