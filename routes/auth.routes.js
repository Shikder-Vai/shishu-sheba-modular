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
  getUserProfile,
  updateUserProfile,
  changePassword,
  registerCustomer,
  loginCustomer,
  getAllCustomers,
  updateCustomerStatus,
} = require("../controllers/auth.controller");
const {
  isAdmin,
  isAdminOrModerator,
  isAuthenticated,
} = require("../middleware/auth.middleware");
const router = express.Router();

// Admin Register route (Original)
router.post("/register", registerUser);

// Admin Login route (Original)
router.post("/login", loginUser);

// Customer Register route (New)
router.post("/users/register", registerCustomer);

// Customer Login route (New)
router.post("/users/login", loginCustomer);

// Forgot & Reset Password
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.get("/admin", isAdminOrModerator, getAllAdmin);
router.get("/users", isAdminOrModerator, getAllCustomers);

// Delete user by ID (only if role is admin)
router.delete("/users/:id", isAdmin, deleteUser);

// Ban/Unban customer (admin only)
router.patch("/users/:id/status", isAdmin, updateCustomerStatus);

// Update user role
router.put("/users/role/:id", isAdmin, updateUserRole);

// Get user role
router.get("/users/role/:id", isAdminOrModerator, getUserRole);

// Profile
router.get("/users/me", isAuthenticated, getUserProfile);
router.put("/users/profile", isAuthenticated, updateUserProfile);
router.put("/users/change-password", isAuthenticated, changePassword);

module.exports = router;
