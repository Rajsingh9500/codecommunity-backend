const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/authMiddleware");

// GET all developers
router.get("/", authMiddleware, async (req, res) => {
  try {
    const developers = await User.find({ role: "developer" });
    res.json({ success: true, developers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// GET specific developer by id
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const developer = await User.findById(req.params.id);
    if (!developer) {
      return res.status(404).json({ success: false, message: "Developer not found" });
    }
    res.json({ success: true, developer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ GET all projects by developer id
router.get("/:id/projects", authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find({ developer: req.params.id });
    res.json({ success: true, projects });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
