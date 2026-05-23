const express = require("express");
const { LiveChat } = require("youtube-chat");

const app = express();
app.use(express.json());

let chat = null;
let messages = [];

function getMessageText(messageItems) {
  if (!messageItems) return "";
  return messageItems.map(p => p.text || p.emojiText || "").join("");
}

function connectToLive(videoId) {
  if (chat) {
    try {
      chat.stop();
    } catch (e) {
      console.error("Error stopping chat:", e);
    }
  }

  messages = [];

  chat = new LiveChat({ liveId: videoId });

  chat.on("chat", (item) => {
    const text = getMessageText(item.message);
    messages.push({
      author: item.author.name,
      text,
      time: new Date().toLocaleTimeString()
    });
    if (messages.length > 200) messages.shift();
  });

  chat.on("error", (err) => console.error("Chat error:", err));
  chat.on("end", (reason) => {
    console.log("Chat ended:", reason);
    chat = null;
  });

  chat.start();
  console.log(`Connected to live chat: ${videoId}`);
}

app.post("/connect", (req, res) => {
  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: "videoId required" });
  }
  connectToLive(videoId);
  res.json({ status: "connected", videoId });
});

app.get("/chat", (req, res) => {
  res.json({ messages: messages.slice(-50) });
});

app.get("/", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});