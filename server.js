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

    // Start background courier tracking automation
    const { autoTrackAllOrders } = require("./controllers/order.controller");
    
    let lastRunDateStr = "";
    
    // Check every 30 seconds if we need to run the auto-tracking
    setInterval(() => {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Check if it's 8:00 AM or 8:00 PM
      if ((hours === 8 || hours === 20) && minutes === 0) {
        const runKey = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}-${hours}`;
        if (lastRunDateStr !== runKey) {
          lastRunDateStr = runKey;
          console.log(`[Scheduler] Triggering scheduled auto-tracking at ${now.toLocaleTimeString()}`);
          autoTrackAllOrders().catch(console.error);
        }
      }
    }, 30000);

  } catch (err) {
    console.error("❌ Failed to start server:", err);
  }
}

runServer();
