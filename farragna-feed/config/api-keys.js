/**
 * ==============================
 * 🔑 FARRAGNA - API KEYS CONFIG
 * ==============================
 */

module.exports = {
  // PEXELS - Free tier: 200 req/hour
  pexels: {
    apiKey: process.env.PEXELS_API_KEY || "YOUR_PEXELS_KEY_HERE",
    baseUrl: "https://api.pexels.com/videos/search",
    rateLimit: {
      requestsPerHour: 200,
      burstSize: 5
    },
    attribution: "Powered by Pexels"
  },

  // PIXABAY - Free tier: 100 req/min, must cache 24h
  pixabay: {
    apiKey: process.env.PIXABAY_API_KEY || "YOUR_PIXABAY_KEY_HERE",
    baseUrl: "https://pixabay.com/api/videos/",
    rateLimit: {
      requestsPerMin: 100,
      burstSize: 10
    },
    cacheTTL: 86400000,
    attribution: "Powered by Pixabay"
  },

  // MIXKIT - No key needed, but needs user-agent
  mixkit: {
    baseUrl: "https://www.mixkit.co/api/v1/videos",
    rateLimit: {
      requestsPerMin: 60,
      burstSize: 5
    },
    attribution: "Powered by Mixkit",
    userAgent: "Farragna/1.0 (Video Feed)"
  }
};
