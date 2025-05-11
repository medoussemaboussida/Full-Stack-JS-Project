const mongoose = require("mongoose");

const locationCacheSchema = new mongoose.Schema({
  location: { type: String, required: true, unique: true },
  data: { type: Object, required: true },
  createdAt: { type: Date, default: Date.now, expires: "24h" }, // Auto-expire after 24 hours
});

module.exports = mongoose.model("LocationCache", locationCacheSchema);