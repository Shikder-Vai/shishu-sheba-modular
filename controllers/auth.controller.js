const { ObjectId } = require("mongodb");
const client = require("../config/db");
const usersCollection = client.db("sishuSheba").collection("admin");
const bcrypt = require("bcryptjs");

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

// === Delete User Controller ===
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(id) });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.role === "admin") {
      return res
        .status(403)
        .json({ message: "Cannot delete another admin" });
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
      { $set: { role } }
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
