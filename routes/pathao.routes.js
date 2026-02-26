const express = require("express");
const router = express.Router();
const { bulkShipmentHandler, getStoresHandler, trackOrderHandler } = require("../controllers/pathao.controller");

router.post("/bulk-shipment", bulkShipmentHandler);
router.get("/stores", getStoresHandler);
router.get("/track/:consignmentId", trackOrderHandler);

module.exports = router;
