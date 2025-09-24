const express = require("express");
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const router = express.Router();

/* ------------------ Multer (profile photo) ------------------ */
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

/* ------------------ Helper: format user ------------------ */
const formatUser = (user) => {
  const baseUrl =
    process.env.BASE_URL || `http://localhost:${process.env.PORT || 5001}`;
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    technologies: user.technologies || [],
    experience: user.experience || 0,
    charges: user.charges || 0,
    photo: user.photo ? `${baseUrl}${user.photo}` : null,
  };
};

/* ------------------ Nodemailer (SendGrid) ------------------ */
const transporter = nodemailer.createTransport({
  service: "SendGrid",
  auth: {
    user: "apikey", // ← literally this string
    pass: process.env.SENDGRID_API_KEY,
  },
});

/* ------------------ Register ------------------ */
router.post("/register", async (req, res) => {
  try {
    const { name, email, role, password } = req.body;
    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      name,
      email,
      role: role || "client",
      password: hashedPassword,
    });

    await newUser.save();
    res.json({ success: true, message: "User registered successfully" });
  } catch (err) {
    console.error("❌ Register error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ------------------ Login ------------------ */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res
        .status(400)
        .json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ------------------ Forgot Password ------------------ */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email)
      return res.status(400).json({ success: false, message: "Email required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.status(404).json({ success: false, message: "User not found" });

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = Date.now() + 15 * 60 * 1000;
    await user.save();

    const resetLink = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(
      user.email
    )}`;

    await transporter.sendMail({
      from: `"CodeCommunity Support" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Reset Your Password - CodeCommunity",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #10b981; text-align: center; margin-bottom: 20px;">CodeCommunity</h2>
            <p style="font-size: 16px; color: #374151;">Hi <b>${user.name}</b>,</p>
            <p style="font-size: 16px; color: #374151;">
              We received a request to reset your password. Click the button below to set a new password.
              This link is valid for <b>15 minutes</b>.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #10b981; color: white; text-decoration: none; 
                        padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Reset Password
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              If you didn’t request this, you can safely ignore this email.
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />

            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              © ${new Date().getFullYear()} CodeCommunity. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    res.json({ success: true, message: "Reset link sent to email" });
  } catch (err) {
    console.error("❌ Forgot password error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ------------------ Reset Password ------------------ */
/* ------------------ Reset Password ------------------ */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, email, password } = req.body;
    if (!token || !email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Missing required fields" });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      email,
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired token" });
    }

    // Hash new password
    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    /* ✅ Send confirmation email */
    await transporter.sendMail({
      from: `"CodeCommunity Support" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: "Your Password Has Been Changed - CodeCommunity",
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f9fafb; padding: 20px;">
          <div style="max-width: 600px; margin: auto; background: white; border-radius: 10px; padding: 30px; border: 1px solid #e5e7eb;">
            <h2 style="color: #10b981; text-align: center; margin-bottom: 20px;">CodeCommunity</h2>
            <p style="font-size: 16px; color: #374151;">Hi <b>${user.name}</b>,</p>
            <p style="font-size: 16px; color: #374151;">
              Your password has been <b>successfully changed</b>.  
              If you did not perform this action, please <b>reset your password immediately</b> or contact our support team.
            </p>

            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.CLIENT_URL}/login" 
                 style="background-color: #10b981; color: white; text-decoration: none; 
                        padding: 12px 24px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                Go to Login
              </a>
            </div>

            <p style="font-size: 14px; color: #6b7280;">
              If you didn’t request this password change, please reset your password immediately.
            </p>

            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />

            <p style="font-size: 12px; color: #9ca3af; text-align: center;">
              © ${new Date().getFullYear()} CodeCommunity. All rights reserved.
            </p>
          </div>
        </div>
      `,
    });

    res.json({ success: true, message: "Password reset successful" });
  } catch (err) {
    console.error("❌ Reset password error:", err.message);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


module.exports = router;
