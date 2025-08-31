const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");

const app = express();

// === Security ===
app.use(helmet());
app.set("trust proxy", 1);

// === CORS ===
const allowedOrigins = [
  "http://localhost:5173",
  // "https://shishu-sheba.netlify.app",
  // "https://shishuseba.com",
  // "https://www.shishuseba.com",
  // "https://shishu-sheba-server.onrender.com",
];

// Optional: regex pattern matching for preview builds or all localhost ports
function isAllowedOrigin(origin) {
  if (!origin) return true; // allow tools like Postman
  return (
    allowedOrigins.includes(origin) ||
    /^https:\/\/[a-zA-Z0-9-]+--shishu-sheba\.netlify\.app$/.test(origin) || // Netlify preview builds
    /^http:\/\/localhost:\d+$/.test(origin) // all localhost ports (like 5173, 3000, etc.)
  );
}

app.use(
  cors({
    origin(origin, callback) {
      console.log("🚀 Incoming Origin:", origin); // for debugging
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      console.error("❌ CORS Blocked:", origin);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    exposedHeaders: ["set-cookie"],
  })
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    exposedHeaders: ["set-cookie"],
  })
);

// === Middleware ===
app.use(cookieParser());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// === Rate Limiting for APIs ===
// app.use("/v1", apiLimiter);

// === Routes ===
app.use("/v1/products", require("./routes/product.routes"));
app.use("/v1", require("./routes/order.routes"));
app.use("/v1", require("./routes/auth.routes"));
app.use("/v1/banner", require("./routes/banner.routes"));
app.use("/v1/youtube", require("./routes/youtube.routes"));
app.use("/v1/categories", require("./routes/category.routes"));
app.use("/v1/reports", require("./routes/orderReportsRoutes"));

// === Health Check ===
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
  });
});

// === Global Error Handler ===
app.use((err, req, res, next) => {
  console.error("Error:", err);

  if (err.message === "Not allowed by CORS") {
    return res
      .status(403)
      .json({ message: "CORS policy violation", allowedOrigins });
  }

  res.status(500).json({
    message: "Internal Server Error",
    error: process.env.NODE_ENV === "production" ? err.message : undefined,
  });
});

module.exports = app;
