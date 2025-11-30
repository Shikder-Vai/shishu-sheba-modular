require("dotenv").config();
const app = require("./app");
const client = require("./config/db");

const port = process.env.PORT || 5000;

async function runServer() {
  try {
    await client.connect();
    console.log("✅ MongoDB Connected");

    app.get("/", (req, res) => {
      res.send("Shishu is Running!!!!!");
    });

    app.listen(port, () => {
      console.log(`🚀 Shishusheba is running on port ${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
  }
}

runServer();
