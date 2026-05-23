const express = require("express");
const path = require("path");
const { LiveChat } = require("youtube-chat");

const app = express();

app.use(express.json());

// ========================================
// CONFIG
// ========================================

const PORT = process.env.PORT || 3000;

// ========================================
// STATE
// ========================================

let chat = null;
let messages = [];

// ========================================
// MESSAGE PARSER
// ========================================

function getMessageText(messageItems) {
  if (!messageItems) return "";

  // если уже строка
  if (typeof messageItems === "string") {
    return messageItems;
  }

  // если массив частей
  if (Array.isArray(messageItems)) {
    return messageItems
      .map(part => part.text || part.emojiText || "")
      .join("");
  }

  return String(messageItems);
}

// ========================================
// CONNECT TO YOUTUBE LIVE
// ========================================

async function connectToLive(videoId) {
  try {
    // остановить старый чат
    if (chat) {
      try {
        chat.stop();
      } catch (e) {
        console.log("Old chat stop error:", e.message);
      }
    }

    messages = [];

    console.log("Connecting to live:", videoId);

    // youtube-chat@2.2.0
    chat = new LiveChat({
      liveId: videoId
    });

    chat.on("start", () => {
      console.log("✅ Chat started");
    });

    chat.on("chat", (item) => {
      const msg = {
        author: item.author?.name || "Unknown",
        text: getMessageText(item.message),
        time: new Date().toLocaleTimeString()
      };

      messages.push(msg);

      // memory limit
      if (messages.length > 200) {
        messages.shift();
      }

      console.log(`[${msg.time}] ${msg.author}: ${msg.text}`);
    });

    chat.on("end", () => {
      console.log("⚠️ Chat ended");
    });

    chat.on("error", (err) => {
      console.error("❌ Chat error:", err);
    });

    await chat.start();

  } catch (err) {
    console.error("Connect error:", err);
  }
}

// ========================================
// API
// ========================================

// health check
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    messages: messages.length
  });
});

// получить чат
app.get("/chat", (req, res) => {
  res.json({
    messages: messages.slice(-50)
  });
});

// подключение к лайву
app.post("/connect", async (req, res) => {
  try {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({
        error: "videoId required"
      });
    }

    await connectToLive(videoId);

    res.json({
      ok: true,
      videoId
    });

  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: err.message
    });
  }
});

// ========================================
// FRONTEND
// ========================================

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ========================================
// START
// ========================================

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});