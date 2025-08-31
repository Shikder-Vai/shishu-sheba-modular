const express = require("express");
const { registerUser, loginUser, deleteUser, getAllAdmins } = require("../controllers/auth.controller");
const router = express.Router();

// Register route
router.post("/register", registerUser);

// Login route
router.post("/login", loginUser);
router.get("/admins", getAllAdmins);

// Delete user by ID (only if role is admin)
router.delete("/users/:id", deleteUser); // ✅ add this line

module.exports = router;
