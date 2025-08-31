const express = require("express");
const router = express.Router();
const {
  createOrder,
  getOrdersByStatus,
  updateOrder,
  trackOrder,
  updateFullOrder,
} = require("../controllers/order.controller");

router.post("/order", createOrder);
router.get("/order-request", getOrdersByStatus);
router.get("/order/track/:orderId", trackOrder);
router.patch("/order-request/:id", updateOrder);
router.patch("/update-full-order/:id", updateFullOrder);

module.exports = router;
