const express = require("express");
const { LiveChat } = require("youtube-chat");

const app = express();

app.use(express.json());

let chat = null;
let messages = [];

// ==========================
// ПОДКЛЮЧЕНИЕ К ЛАЙВУ
// ==========================
function connectToLive(videoId) {
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
    const text = getMessageText(item.message);

    messages.push({
      author: item.author.name,
      text,
      time: new Date().toLocaleTimeString()
    });

    if (messages.length > 200) messages.shift();
  });

  chat.start();
}

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
// PAGE
// ==========================
app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

// ==========================
app.listen(3000, () => {
  console.log("http://localhost:3000");
});