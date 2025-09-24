const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true, required: true },
  role: { type: String, enum: ["developer", "client", "admin"], default: "client" },
  technologies: [String],
  experience: Number,
  charges: Number,
  photo: { type: String, default: "" },
  password: { type: String, required: true },
  resetPasswordToken: { type: String, default: null },
  resetPasswordExpires: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model("User", UserSchema);
