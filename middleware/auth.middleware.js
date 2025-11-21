const { ObjectId } = require("mongodb");
const client = require("../config/db");
const usersCollection = client.db("sishuSheba").collection("admin");

const checkRole = (roles) => async (req, res, next) => {
  const userId = req.headers["user-id"]; // Assuming user-id is sent in the header

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: User ID not provided" });
  }

  try {
    const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (roles.includes(user.role)) {
      next();
    } else {
      res.status(403).json({ message: "Forbidden: Insufficient permissions" });
    }
  } catch (error) {
    console.error("Role check error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

exports.isAdmin = checkRole(["admin"]);
exports.isModerator = checkRole(["moderator"]);
exports.isAdminOrModerator = checkRole(["admin", "moderator"]);
