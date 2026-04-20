const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/serverTracking.controller");

// Settings
router.get  ("/settings", ctrl.getSettings);
router.patch("/settings", ctrl.updateSettings);

// Event Logs
router.get   ("/logs",         ctrl.getLogs);
router.delete("/logs",         ctrl.deleteOldLogs);

// Metrics & Health
router.get("/metrics", ctrl.getMetrics);
router.get("/health",  ctrl.getHealth);

// Test event
router.post("/test", ctrl.sendTestEvent);

module.exports = router;
