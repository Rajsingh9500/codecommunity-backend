const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  title: { type: String, required: true },
  client: { type: String, required: true },
  developer: { type: String },
  status: { type: String, default: "pending" },
  deadline: { type: String },
  requirements: { type: String },
});

module.exports = mongoose.model("Project", projectSchema);
