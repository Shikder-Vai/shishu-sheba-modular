const express = require("express");
const router = express.Router();
const { bulkShipmentHandler } = require("../controllers/steadfast.controller");

router.post("/bulk-shipment", bulkShipmentHandler);

module.exports = router;
