const express = require("express");
const router = express.Router();
const { bulkShipmentHandler, trackOrderHandler, getStoresHandler } = require("../controllers/carrybee.controller");

router.post("/bulk-shipment", bulkShipmentHandler);
router.get("/track/:consignmentId", trackOrderHandler);
router.get("/stores", getStoresHandler);

module.exports = router;
