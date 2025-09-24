import express from "express";
import User from "../models/User.js";
import authenticate from "../middleware/authenticate.js";

const router = express.Router();

// Get all users
router.get("/", authenticate, async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

export default router;
