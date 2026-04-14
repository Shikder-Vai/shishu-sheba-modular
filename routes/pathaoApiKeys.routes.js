const express = require("express");
const router = express.Router();
const pathaoApiKeysController = require("../controllers/pathaoApiKeys.controller");
const { isAdmin } = require("../middleware/auth.middleware");

router.get("/", pathaoApiKeysController.getPathaoApiKeys);
router.put("/", isAdmin, pathaoApiKeysController.updatePathaoApiKeys);
router.delete("/", isAdmin, pathaoApiKeysController.deletePathaoApiKeys);

module.exports = router;
