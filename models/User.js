const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, unique: true, required: true },
  role: { type: String, enum: ["developer", "client", "admin"], default: "client" },
  technologies: [String],
  experience: Number,
  charges: Number,

  // ✅ Replace old photo field with structured avatar
  avatar: {
    url: { type: String, default: "" },       // Cloudinary URL
    public_id: { type: String, default: "" }, // Cloudinary ID for delete/update
  },

  password: { type: String, required: true },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
