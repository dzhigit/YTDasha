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

async function loadChat() {
  try {
    const res = await fetch("/chat", {
      cache: "no-store"
    });

    const text = await res.text();

    console.log("RAW RESPONSE:", text);

    const data = JSON.parse(text);

    chatBox.innerHTML = "";

    data.messages.reverse().forEach(msg => {
      const div = document.createElement("div");
      div.className = "msg";

      div.innerHTML = `
        <span class="author">${msg.author}</span><br/>
        ${msg.text}
      `;

      chatBox.appendChild(div);
    });

  } catch (err) {
    console.error("CHAT LOAD ERROR:", err);
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