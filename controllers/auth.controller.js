const { ObjectId } = require("mongodb");
const client = require("../config/db");
const usersCollection = client.db("sishuSheba").collection("admin");
const customersCollection = client.db("sishuSheba").collection("customers");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../services/email.service");
const crypto = require("crypto");

// === Custom Register Controller ===
exports.registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;
  console.log(role);
  try {
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required" });
    }

    const existingUser = await usersCollection.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      email,
      password: hashedPassword,
      role: role || "user", // Default role
      createdAt: new Date(),
    };

    await usersCollection.insertOne(newUser);

    res.status(201).json({ message: "Registration successful" });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// === Login Controller ===
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Return user
    res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// === Customer Register Controller ===
exports.registerCustomer = async (req, res) => {
  const { name, email, mobile, password } = req.body;
  try {
    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email, and password are required" });
    }

    const existingUser = await customersCollection.findOne({ email });

    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      name,
      email,
      ...(mobile && { mobile: mobile.trim() }),
      password: hashedPassword,
      role: "user",
      createdAt: new Date(),
    };

    const inserted = await customersCollection.insertOne(newUser);
    res.status(201).json({
      message: "Registration successful",
      user: {
        _id: inserted.insertedId,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error("Register Customer error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// === Customer Login Controller ===
exports.loginCustomer = async (req, res) => {
  const { email, mobile, password } = req.body;

  try {
    if ((!email && !mobile) || !password) {
      return res.status(400).json({ message: "Email or mobile, and password are required" });
    }

    // Find by email or mobile
    const query = email ? { email } : { mobile };
    const user = await customersCollection.findOne(query);

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if banned
    if (user.status === "banned") {
      return res.status(403).json({ message: "Your account has been banned. Please contact support." });
    }

    res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        mobile: user.mobile || null,
        role: user.role,
        status: user.status || "active",
      },
    });
  } catch (error) {
    console.error("Login customer error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// === Delete User Controller ===
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res.status(403).json({ message: "Cannot delete another admin" });
    }

    const result = await usersCollection.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(500).json({ message: "Failed to delete user" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// === Get All Admin ===
exports.getAllAdmin = async (req, res) => {
  try {
    const admin = await usersCollection
      .find()
      .project({ password: 0 }) // exclude password
      .toArray();

    res.status(200).json(admin);
  } catch (error) {
    console.error("Get Admin Error:", error);
    res.status(500).json({ message: "Failed to fetch admin" });
  }
};

// === Get All Customers ===
exports.getAllCustomers = async (req, res) => {
  try {
    const customers = await customersCollection
      .find()
      .project({ password: 0 })
      .sort({ createdAt: -1 })
      .toArray();
    res.status(200).json(customers);
  } catch (error) {
    console.error("Get Customers Error:", error);
    res.status(500).json({ message: "Failed to fetch customers" });
  }
};

// === Ban / Unban Customer ===
exports.updateCustomerStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // "active" | "banned"

  try {
    if (!id || !status) {
      return res.status(400).json({ message: "Customer ID and status required" });
    }
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({ message: "Invalid customer ID" });
    }

    const result = await customersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status, updatedAt: new Date() } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const action = status === "banned" ? "banned" : "unbanned";
    res.status(200).json({ message: `Customer ${action} successfully` });
  } catch (error) {
    console.error("Update customer status error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// === Update User Role ===
exports.updateUserRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await usersCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { role } },
    );

    if (result.modifiedCount === 0) {
      return res.status(500).json({ message: "Failed to update user role" });
    }

    res.status(200).json({ message: "User role updated successfully" });
  } catch (error) {
    console.error("Update role error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// === Get User Role ===
exports.getUserRole = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ role: user.role });
  } catch (error) {
    console.error("Get role error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// === Forgot Password ===
exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await usersCollection.findOne({ email });

    // Always return success to avoid email enumeration
    if (!user) {
      return res.status(200).json({
        message:
          "If an account with that email exists, a reset link has been sent.",
      });
    }

    const token = crypto.randomBytes(20).toString("hex");
    const expires = Date.now() + 3600000; // 1 hour

    await usersCollection.updateOne(
      { email },
      { $set: { passwordResetToken: token, passwordResetExpires: expires } },
    );
    //forgot password link
    const resetLink = `${process.env.CLIENT_URL || "https://api.shishuseba.com"
      }/reset-password/${token}`;

    // Send the email
    await sendEmail(
      email,
      "Password Reset Link",
      `<p>You are receiving this because you (or someone else) have requested the reset of the password for your account.</p>
       <p>Please click on the following link, or paste this into your browser to complete the process:</p>
       <a href="${resetLink}">${resetLink}</a>
       <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
    );

    res.status(200).json({
      message:
        "If an account with that email exists, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// === Reset Password ===
exports.resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res
      .status(400)
      .json({ message: "Token and new password are required" });
  }

  try {
    const user = await usersCollection.findOne({
      passwordResetToken: token,
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid token" });
    }

    if (user.passwordResetExpires < Date.now()) {
      return res.status(400).json({ message: "Token has expired" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: { password: hashedPassword },
        $unset: { passwordResetToken: "", passwordResetExpires: "" },
      },
    );

    res.status(200).json({ message: "Password has been reset successfully" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// === Get User Profile ===
exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let user = await customersCollection.findOne({ _id: new ObjectId(userId) });
    if (!user) {
      // Fallback to admin collection
      user = await usersCollection.findOne({ _id: new ObjectId(userId) });
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Exclude password and sensitive Info
    const { password, passwordResetToken, passwordResetExpires, ...userProfile } = user;
    res.status(200).json(userProfile);
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// === Update User Profile ===
exports.updateUserProfile = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    const { name, mobile } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let collectionToUpdate = customersCollection;
    let existingUser = await customersCollection.findOne({ _id: new ObjectId(userId) });

    if (!existingUser) {
      existingUser = await usersCollection.findOne({ _id: new ObjectId(userId) });
      if (existingUser) {
        collectionToUpdate = usersCollection;
      }
    }

    if (!existingUser) {
      return res.status(404).json({ message: "User not found" });
    }

    await collectionToUpdate.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { name, mobile } }
    );

    const updatedUser = await collectionToUpdate.findOne({ _id: new ObjectId(userId) });
    const { password, ...userProfile } = updatedUser;

    res.status(200).json({ message: "Profile updated successfully", user: userProfile });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// === Change Password ===
exports.changePassword = async (req, res) => {
  try {
    const userId = req.headers["user-id"];
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current and new passions are required" });
    }

    let collectionToUpdate = customersCollection;
    let user = await customersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      user = await usersCollection.findOne({ _id: new ObjectId(userId) });
      if (user) {
        collectionToUpdate = usersCollection;
      }
    }

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Incorporated current password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await collectionToUpdate.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { password: hashedPassword } }
    );

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

