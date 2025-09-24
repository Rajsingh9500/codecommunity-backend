const express = require("express");
const Review = require("../models/Review");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// 📌 Get reviews for a specific developer
router.get("/:developerId", async (req, res) => {
  try {
    const reviews = await Review.find({ developer: req.params.developerId })
      .populate("client", "name email");

    // Calculate average rating
    const avgRating =
      reviews.length > 0
        ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
        : 0;

    res.json({ success: true, reviews, avgRating });
  } catch (err) {
    console.error("❌ Get reviews error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// 📌 Add a review (client only)
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { developerId, rating, comment } = req.body;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ success: false, message: "Rating must be between 1 and 5" });
    }

    const review = await Review.create({
      developer: developerId,
      client: req.user._id,
      rating,
      comment,
    });

    res.status(201).json({ success: true, review });
  } catch (err) {
    console.error("❌ Create review error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }

  // 📌 Delete a review (admin only)
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only admins can delete reviews" });
    }

    const review = await Review.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }

    res.json({ success: true, message: "Review deleted" });
  } catch (err) {
    console.error("❌ Delete review error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

});

module.exports = router;
