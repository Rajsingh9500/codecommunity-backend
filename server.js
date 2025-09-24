const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const http = require("http");
const { Server } = require("socket.io");
const jwt = require("jsonwebtoken");

const User = require("./models/User");
const Message = require("./models/Message");

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  })
);

// ✅ Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

// ✅ MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB error:", err.message);
    process.exit(1);
  });

// ✅ Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/projects", require("./routes/projects"));
app.use("/api/hire", require("./routes/hire"));
app.use("/api/notifications", require("./routes/notification"));
app.use("/api/developers", require("./routes/developers"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/reviews", require("./routes/reviews"));
app.use("/uploads", express.static(uploadDir));
app.use("/api/chat", require("./routes/chat"));

app.get("/", (req, res) => res.json({ success: true, message: "🚀 API running" }));

// ✅ Global error handler
app.use((err, req, res, next) => {
  console.error("❌ Error:", err.stack);
  res.status(500).json({ success: false, message: "Server error" });
});

// ✅ Create HTTP + Socket.IO server
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    credentials: true,
  },
});

// ✅ Socket.IO auth
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("No token"));

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return next(new Error("User not found"));

    socket.user = user;
    socket.join(user._id.toString()); // private room
    next();
  } catch (err) {
    console.error("❌ Socket auth error:", err.message);
    next(new Error("Invalid token"));
  }
});

// ✅ Socket.IO events
io.on("connection", (socket) => {
  console.log(`⚡ ${socket.user.name} connected`);

  // 🔹 Send message
  socket.on("sendMessage", async (data) => {
    const newMessage = new Message({
      sender: socket.user._id,
      receiver: data.receiver,
      message: data.message,
      delivered: false,
      read: false,
    });
    await newMessage.save();
    const populatedMsg = await newMessage.populate("sender receiver", "name role");

    // Send message to receiver + sender
    io.to(data.receiver).emit("receiveMessage", populatedMsg);
    io.to(socket.user._id.toString()).emit("receiveMessage", populatedMsg);

    // If receiver is connected, mark as delivered
    const receiverSockets = await io.in(data.receiver).fetchSockets();
    if (receiverSockets.length > 0) {
      await Message.findByIdAndUpdate(newMessage._id, { delivered: true });
      io.to(socket.user._id.toString()).emit("messageDelivered", {
        messageId: newMessage._id,
      });
    }
  });

  // 🔹 Mark undelivered messages as delivered when user connects
  socket.on("markDelivered", async () => {
    const undelivered = await Message.find({
      receiver: socket.user._id,
      delivered: false,
    });

    if (undelivered.length > 0) {
      await Message.updateMany(
        { receiver: socket.user._id, delivered: false },
        { $set: { delivered: true } }
      );

      undelivered.forEach((msg) => {
        io.to(msg.sender.toString()).emit("messageDelivered", {
          messageId: msg._id,
        });
      });
    }
  });

  // 🔹 Mark messages as read
  socket.on("readMessages", async (fromUserId) => {
    const updated = await Message.updateMany(
      { sender: fromUserId, receiver: socket.user._id, read: false },
      { $set: { read: true } }
    );

    if (updated.modifiedCount > 0) {
      io.to(fromUserId).emit("messagesRead", { by: socket.user._id });
    }

    io.to(socket.user._id.toString()).emit("resetUnread", { from: fromUserId });
  });

  // 🔹 Typing indicator
  socket.on("typing", (receiverId) => {
    io.to(receiverId).emit("typing", { from: socket.user._id });
  });

  socket.on("stopTyping", (receiverId) => {
    io.to(receiverId).emit("stopTyping", { from: socket.user._id });
  });

  socket.on("disconnect", () => {
    console.log(`❌ ${socket.user.name} disconnected`);
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () =>
  console.log(`🚀 Server + Socket.IO running on http://localhost:${PORT}`)
);
