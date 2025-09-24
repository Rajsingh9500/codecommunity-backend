const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const router = express.Router();

// Secrets
const JWT_SECRET = process.env.JWT_SECRET || "super_secret_key";
const RESET_SECRET = process.env.RESET_SECRET || "super_reset_secret";

// Nodemailer config
const transporter = nodemailer.createTransport({
  service: "gmail", // or "Outlook", "Yahoo"
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS, // app password
  },
});

// ✅ Forgot Password
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: "Email required" });

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    // Generate reset token valid for 15 minutes
    const token = jwt.sign({ id: user._id }, RESET_SECRET, { expiresIn: "15m" });

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${token}`;

    // Send email
    await transporter.sendMail({
      from: `"Coder Support" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <h3>Hello ${user.name},</h3>
        <p>You requested to reset your password.</p>
        <p>Click below to reset your password (valid for 15 minutes):</p>
        <a href="${resetLink}" style="color:blue">${resetLink}</a>
        <p>If you didn't request this, you can safely ignore this email.</p>
      `,
    });

    res.json({ success: true, message: "Reset link sent to email" });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ✅ Reset Password
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, message: "Token and password required" });
    }

    // Verify token
    const decoded = jwt.verify(token, RESET_SECRET);

    const hashedPassword = await bcrypt.hash(password, 10);

    await User.findByIdAndUpdate(decoded.id, { password: hashedPassword });

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, message: "Invalid or expired token" });
  }
});

module.exports = router;
