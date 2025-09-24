const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Project = require("../models/Project");
const Notification = require("../models/Notification");
const authMiddleware = require("../middleware/authMiddleware");

// 🛡️ Only admins can access
const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Admins only" });
  }
  next();
};

/**
 * 📌 Get all users (paginated + search)
 */
router.get("/users", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = search
      ? {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { email: { $regex: search, $options: "i" } },
            { role: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(query).select("-password").skip(skip).limit(Number(limit));
    const total = await User.countDocuments(query);

    res.json({ success: true, users, total });
  } catch (err) {
    console.error("❌ Fetch users error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * 📌 Delete a user by ID
 */
router.delete("/users/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndDelete(id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    console.error("❌ Delete user error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * 📌 Get all projects (paginated + search)
 */
router.get("/projects", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = search
      ? {
          $or: [
            { title: { $regex: search, $options: "i" } },
            { client: { $regex: search, $options: "i" } },
            { developer: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const projects = await Project.find(query).skip(skip).limit(Number(limit));
    const total = await Project.countDocuments(query);

    res.json({ success: true, projects, total });
  } catch (err) {
    console.error("❌ Fetch projects error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * 📌 Delete a project by ID
 */
router.delete("/projects/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const project = await Project.findByIdAndDelete(id);
    if (!project) return res.status(404).json({ success: false, message: "Project not found" });

    res.json({ success: true, message: "Project deleted" });
  } catch (err) {
    console.error("❌ Delete project error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * 📌 Get all notifications (paginated + search)
 */
router.get("/notifications", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 20, search = "" } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const query = search
      ? {
          $or: [
            { userEmail: { $regex: search, $options: "i" } },
            { message: { $regex: search, $options: "i" } },
          ],
        }
      : {};

    const notifications = await Notification.find(query).skip(skip).limit(Number(limit));
    const total = await Notification.countDocuments(query);

    res.json({ success: true, notifications, total });
  } catch (err) {
    console.error("❌ Fetch notifications error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/**
 * 📌 Delete a notification by ID
 */
router.delete("/notifications/:id", authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) return res.status(404).json({ success: false, message: "Notification not found" });

    res.json({ success: true, message: "Notification deleted" });
  } catch (err) {
    console.error("❌ Delete notification error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
