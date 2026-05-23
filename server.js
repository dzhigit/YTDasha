const express = require("express");
const path = require("path");
const { LiveChat } = require("youtube-chat");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

// =====================
// STATE
// =====================
let chat = null;
let messages = [];

// =====================
// PARSER
// =====================
function getMessageText(items) {
  if (!items) return "";

  if (typeof items === "string") return items;

  if (Array.isArray(items)) {
    return items.map(p => p.text || p.emojiText || "").join("");
  }

  return String(items);
}

// =====================
// CONNECT TO YOUTUBE
// =====================
function connect(videoId) {
  if (chat) {
    try {
      chat.stop();
    } catch (e) {}
  }

  messages = [];

  chat = new LiveChat({
    liveId: videoId
  });

  chat.on("chat", (item) => {
    const msg = {
      author: item.author?.name || "unknown",
      text: getMessageText(item.message),
      time: new Date().toLocaleTimeString()
    };

    messages.push(msg);

    if (messages.length > 200) {
      messages.shift();
    }

    console.log(`[${msg.time}] ${msg.author}: ${msg.text}`);
  });

  chat.start();
}

// =====================
// API
// =====================

// подключение
app.post("/connect", (req, res) => {
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: "videoId required" });
  }

  connect(videoId);

  res.json({ ok: true, videoId });
});

// чат
app.get("/chat", (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  res.json({
    messages: messages.slice(-50)
  });
});

// frontend
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// =====================
app.listen(PORT, () => {
  console.log("🚀 Server running on port", PORT);
});