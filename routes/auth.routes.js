const express = require("express");
const {
  registerUser,
  loginUser,
  deleteUser,
  getAllAdmin,
  updateUserRole,
  getUserRole,
  forgotPassword,
  resetPassword,
} = require("../controllers/auth.controller");
const {
  isAdmin,
  isAdminOrModerator,
} = require("../middleware/auth.middleware");
const router = express.Router();

// Register route
router.post("/register", registerUser);

// Login route
router.post("/login", loginUser);

// Forgot & Reset Password
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/admin", isAdminOrModerator, getAllAdmin);

// Delete user by ID (only if role is admin)
router.delete("/users/:id", isAdmin, deleteUser); // ✅ add this line

// Update user role
router.put("/users/role/:id", isAdmin, updateUserRole);

// Get user role
router.get("/users/role/:id", isAdminOrModerator, getUserRole);

module.exports = router;
