const express = require("express");
const { LiveChat } = require("youtube-chat");

const app = express();

app.use(express.json());

let chat = null;
let messages = [];

// ==========================
// FIX MESSAGE PARSER
// ==========================
function getMessageText(messageItems) {
  if (!messageItems) return "";

  return messageItems
    .map(p => p.text || p.emojiText || "")
    .join("");
}

// ==========================
// ПОДКЛЮЧЕНИЕ К ЛАЙВУ
// ==========================
function connectToLive(videoId) {
  if (chat) {
    try {
      chat.stop();
    } catch (e) {
      console.error("Error stopping chat:", e);
    }
  }

  messages = [];

  chat = new LiveChat({
    liveId: videoId
  });

  chat.on("chat", (item) => {
    const text = getMessageText(item.message);

    messages.push({
      author: item.author.name,
      text,
      time: new Date().toLocaleTimeString()
    });

    if (messages.length > 200) messages.shift();
  });

  // Добавляем обработку ошибок
  chat.on("error", (err) => {
    console.error("Chat error:", err);
  });

  chat.on("end", (reason) => {
    console.log("Chat ended:", reason);
    chat = null;
  });

  chat.start();
  console.log(`Connected to live chat: ${videoId}`);
}

// ==========================
// API: CONNECT
// ==========================
app.post("/connect", (req, res) => {
  const { videoId } = req.body;

  if (!videoId) {
    return res.status(400).json({ error: "videoId required" });
  }

  connectToLive(videoId);

  res.json({
    status: "connected",
    videoId
  });
});

// ==========================
// API: CHAT
// ==========================
app.get("/chat", (req, res) => {
  res.json({
    messages: messages.slice(-50)
  });
});

// ==========================
// API: DISCONNECT (опционально)
// ==========================
app.post("/disconnect", (req, res) => {
  if (chat) {
    try {
      chat.stop();
      chat = null;
      messages = [];
      res.json({ status: "disconnected" });
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  } else {
    res.json({ status: "not connected" });
  }
});

// ==========================
// PAGE
// ==========================
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// ==========================
// START SERVER
// ==========================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});