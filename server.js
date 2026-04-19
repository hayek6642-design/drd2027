const express = require("express");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware - serve static files from root directory
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "yt-new-clear.html"));
});

// Fallback to yt-new-clear.html for any other routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "yt-new-clear.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📱 Open: http://localhost:${PORT}`);
  console.log(`🎯 Entry: yt-new-clear.html`);
});
