import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import cors from "cors"; 

const token = process.env.BOT_TOKEN;
// Start bot normally
const bot = new TelegramBot(token, { polling: true });

// CRITICAL FIX: This line prevents the server from crashing if there is a conflict!
bot.on("polling_error", (error) => console.log("Telegram Error:", error.message));

const GROUP_ID = process.env.GROUP_ID;
const DB_FILE = "./links.json";

const app = express();
app.use(cors()); 
app.use(express.json());

// Helpers
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 🚀 Health Check (To verify the server is alive)
app.get("/", (req, res) => {
  res.send("Bot API is awake and running smoothly!");
});

// Web API endpoint
app.post("/getlink", async (req, res) => {
  const { userId, channelId } = req.body; 

  try {
    const link = await bot.createChatInviteLink(GROUP_ID, {
      member_limit: 1,
      expire_date: Math.floor(Date.now() / 1000) + 600
    });

    const db = loadDB();
    db[link.invite_link] = { userId };
    saveDB(db);

    res.json({ success: true, invite_link: link.invite_link });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Railway defaults to 8080 or uses process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API running on port ${PORT}...`);
});