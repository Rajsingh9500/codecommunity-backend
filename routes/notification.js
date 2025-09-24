const express = require("express");
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/notifications?email=user@example.com
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email required" });
    }

    const notifications = await Notification.find({ userEmail: email });
    res.json({ success: true, notifications });
  } catch (err) {
    console.error("❌ Notifications fetch error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/notifications
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { userEmail, message } = req.body;
    if (!userEmail || !message) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const notification = await Notification.create({ userEmail, message });
    res.status(201).json({ success: true, notification });
  } catch (err) {
    console.error("❌ Notification create error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// DELETE /api/notifications/:id
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Notification.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Notification not found" });
    }

    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("❌ Notification delete error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
