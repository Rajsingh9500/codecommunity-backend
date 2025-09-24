const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    userEmail: { type: String, required: true }, // Who the notification belongs to
    message: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Notification", NotificationSchema);
