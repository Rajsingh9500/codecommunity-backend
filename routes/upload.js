const express = require("express");
const multer = require("multer");
const { uploadToCloudinary } = require("../utils/cloudinaryUpload");
const { deleteFromCloudinary } = require("../utils/cloudinaryDelete");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware"); // ✅ Import

const router = express.Router();
const upload = multer({ dest: "temp/" });

// 🔹 Upload or update user avatar (only logged-in users)
router.post("/avatar", authMiddleware, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // ✅ Delete old avatar if exists
    if (user.avatar?.public_id) {
      await deleteFromCloudinary(user.avatar.public_id);
    }

    // ✅ Upload new avatar
    const result = await uploadToCloudinary(req.file.path, "avatars");

    // ✅ Update MongoDB
    user.avatar = { url: result.secure_url, public_id: result.public_id };
    await user.save();

    res.json({ success: true, message: "Avatar updated", avatar: user.avatar });
  } catch (err) {
    console.error("❌ Avatar upload error:", err.message);
    res.status(500).json({ success: false, message: "Upload failed" });
  }
});

module.exports = router;
