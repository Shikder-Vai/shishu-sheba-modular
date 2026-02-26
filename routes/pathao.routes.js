const express = require("express");
const router = express.Router();
const { bulkShipmentHandler, getStoresHandler } = require("../controllers/pathao.controller");

router.post("/bulk-shipment", bulkShipmentHandler);
router.get("/stores", getStoresHandler);

module.exports = router;
