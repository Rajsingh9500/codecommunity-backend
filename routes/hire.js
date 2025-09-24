const express = require("express");
const router = express.Router();
const Hire = require("../models/Hire");
const authMiddleware = require("../middleware/authMiddleware");
const Project = require("../models/Project");
const Notification = require("../models/Notification");
// @route   POST /api/hire
// @desc    Create a hire request
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { clientEmail, developerEmail, projectTitle, description, requirements, amount } = req.body;

    if (!clientEmail || !developerEmail || !projectTitle || !description || !requirements || !amount) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    const hireRequest = new Hire({ clientEmail, developerEmail, projectTitle, description, requirements, amount });
    await hireRequest.save();

    res.json({ success: true, message: "Hire request sent!", request: hireRequest });
  } catch (err) {
    console.error("Hire POST error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// @route   GET /api/hire?developerEmail=email
// @desc    Get all hire requests for a developer
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { developerEmail } = req.query;

    if (!developerEmail) {
      return res.status(400).json({ success: false, message: "Developer email required" });
    }

    const requests = await Hire.find({ developerEmail });
    res.json({ success: true, requests });
  } catch (err) {
    console.error("Hire GET error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// @route   DELETE /api/hire/:id
// @desc    Cancel a hire request (client only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const request = await Hire.findById(req.params.id);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }
    await request.deleteOne();
    res.json({ success: true, message: "Hire request cancelled" });
  } catch (err) {
    console.error("Hire DELETE error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// @route   PATCH /api/hire
// @desc    Accept or reject a hire request

router.patch("/", authMiddleware, async (req, res) => {
  try {
    const { requestId, action } = req.body;
    if (!requestId || !["accept", "reject"].includes(action)) {
      return res.status(400).json({ success: false, message: "Invalid data" });
    }

    const request = await Hire.findById(requestId);
    if (!request) {
      return res.status(404).json({ success: false, message: "Request not found" });
    }

    // Update hire request status
    request.status = action === "accept" ? "accepted" : "rejected";
    await request.save();

    // ✅ If accepted → create or update project
    if (action === "accept") {
      let project = await Project.findOne({
        title: request.projectTitle,
        client: request.clientEmail,
        developer: request.developerEmail, // ✅ using developer email
      });

      if (!project) {
        project = new Project({
          title: request.projectTitle,
          client: request.clientEmail,
          developer: request.developerEmail,
          status: "in-progress",
          requirements: request.requirements,
          deadline: new Date(), // optional
        });
      } else {
        project.status = "in-progress";
      }

      await project.save();
    }

    // ✅ Create notification for client
    const notifMessage =
      action === "accept"
        ? `✅ Your hire request for "${request.projectTitle}" was accepted by ${request.developerEmail}`
        : `❌ Your hire request for "${request.projectTitle}" was rejected by ${request.developerEmail}`;

    const notif = new Notification({
      userEmail: request.clientEmail,
      message: notifMessage,
    });
    await notif.save();

    res.json({
      success: true,
      message: `Request ${action}ed successfully!`,
      request,
    });
  } catch (err) {
    console.error("Hire PATCH error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


module.exports = router;
