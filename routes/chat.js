const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");

// 🔹 Get opposite role users with last message + unread count
router.get("/users", authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user;
    const oppositeRole = currentUser.role === "client" ? "developer" : "client";

    // fetch opposite role users (skip self)
    const users = await User.find({
      _id: { $ne: currentUser._id },
      role: oppositeRole,
    }).select("name role _id");

    // attach last message + unread count
    const usersWithLastMsg = await Promise.all(
      users.map(async (u) => {
        const lastMsg = await Message.findOne({
          $or: [
            { sender: currentUser._id, receiver: u._id },
            { sender: u._id, receiver: currentUser._id },
          ],
        })
          .sort({ createdAt: -1 }) // ✅ latest first
          .lean();

        const unreadCount = await Message.countDocuments({
          sender: u._id,
          receiver: currentUser._id,
          read: false,
        });

        return {
          ...u.toObject(),
          lastMessage: lastMsg ? lastMsg.message : null,
          lastMessageTime: lastMsg ? lastMsg.createdAt : null,
          unreadCount,
        };
      })
    );

    res.json(usersWithLastMsg);
  } catch (err) {
    console.error("❌ Error fetching users:", err.message);
    res.status(500).json({ error: "Error fetching users" });
  }
});

// 🔹 Get messages between current user and another user
router.get("/messages/:receiverId", authMiddleware, async (req, res) => {
  try {
    const currentUser = req.user;
    const { receiverId } = req.params;

    const messages = await Message.find({
      $or: [
        { sender: currentUser._id, receiver: receiverId },
        { sender: receiverId, receiver: currentUser._id },
      ],
    })
      .sort({ createdAt: 1 }) // ✅ oldest → newest
      .populate("sender receiver", "name role _id");

    res.json(messages);
  } catch (err) {
    console.error("❌ Error fetching messages:", err.message);
    res.status(500).json({ error: "Error fetching messages" });
  }
});

module.exports = router;
