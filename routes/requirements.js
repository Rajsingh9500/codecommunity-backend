const express = require("express");
const router = express.Router();
const Requirement = require("../models/Requirement");
const authMiddleware = require("../middleware/authMiddleware");

// Post a requirement (Client)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { title, description } = req.body;
    const requirement = new Requirement({
      client: req.user._id,
      title,
      description,
    });
    await requirement.save();

    const io = req.app.get("io");
    io.emit("requirementPosted", requirement);

    res.json(requirement);
  } catch (err) {
    res.status(500).json({ error: "Error posting requirement" });
  }
});

// Fetch all requirements (for developers)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const requirements = await Requirement.find()
      .populate("client", "name")
      .populate("developer", "name");
    res.json(requirements);
  } catch (err) {
    res.status(500).json({ error: "Error fetching requirements" });
  }
});

// Accept / Reject a requirement (Developer)
// PUT /api/requirements/:id/:action  (Developer accept/reject)
router.put("/:id/:action", authMiddleware, async (req, res) => {
  try {
    const { id, action } = req.params;

    if (req.user.role !== "developer") {
      return res.status(403).json({ error: "Only developers can accept/reject" });
    }
    if (!["accept", "reject"].includes(action)) {
      return res.status(400).json({ error: "Invalid action" });
    }

    const status = action === "accept" ? "accepted" : "rejected";

    // ✅ Only update if still pending
    const updated = await Requirement.findOneAndUpdate(
      { _id: id, status: "pending" }, // condition
      { status, developer: req.user._id },
      { new: true }
    )
      .populate("client", "name")
      .populate("developer", "name");

    if (!updated) {
      return res
        .status(400)
        .json({ error: "Requirement already accepted or rejected" });
    }

    // Broadcast to all developers & clients
    const io = req.app.get("io");
    if (io) io.emit("requirementUpdated", updated);

    res.json(updated);
  } catch (err) {
    console.error("❌ Error updating requirement:", err.message);
    res.status(500).json({ error: "Error updating requirement" });
  }
});


module.exports = router;
