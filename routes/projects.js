const express = require("express");
const Project = require("../models/Project");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// GET /api/projects?email=user@example.com OR ?developer=user@example.com
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { email, developer } = req.query;

    let filter = {};

    if (email) {
      filter.client = email; // client’s projects
    }

    if (developer) {
      filter.developer = developer; // developer’s projects
    }

    // ✅ Admin sees all projects
    if (req.user.role === "admin") {
      filter = {};
    }

    const projects = await Project.find(filter);
    res.json({ success: true, projects });
  } catch (err) {
    console.error("❌ Projects GET error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// POST /api/projects (client creates a project)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, client, developer, deadline, requirements } = req.body;

    if (!title || !client) {
      return res.status(400).json({ success: false, message: "Title and client required" });
    }

    const project = await Project.create({
      title,
      client,
      developer,
      deadline,
      requirements,
      status: "pending",
    });

    res.status(201).json({ success: true, project });
  } catch (err) {
    console.error("❌ Project create error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
