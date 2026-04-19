const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// ===== ROUTING =====

// Root path serves YT-NEW-CLEAR.HTML (Main Entry Point)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "yt-new-clear.html"));
});

// API routes
app.post("/api/auth/login", (req, res) => {
  res.json({ success: true, message: "Login endpoint" });
});

app.post("/api/auth/register", (req, res) => {
  res.json({ success: true, message: "Register endpoint" });
});

// Fallback for undefined routes (serve yt-new-clear.html)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "yt-new-clear.html"));
});

// Error handling
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🎯 Entry Point: http://localhost:${PORT}/`);
  console.log(`📄 File: yt-new-clear.html`);
});
