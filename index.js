import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const DB_FILE = "./links.json";

// 1. START THE WEB SERVER
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server successfully started on port ${PORT}`);
});

// 2. HEALTH CHECK PAGE
app.get("/", (req, res) => {
  res.send(`
    <h2>Server is LIVE!</h2>
    <p>Multiple Channel Routing: <b>ACTIVE ✅</b></p>
    <p>Bot Token Configured: <b>${!!process.env.BOT_TOKEN ? "YES ✅" : "NO ❌"}</b></p>
  `);
});

// Helpers
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// 3. INITIALIZE BOT SAFELY
const token = process.env.BOT_TOKEN;
const DEFAULT_GROUP_ID = process.env.GROUP_ID; // Kept just in case a fallback is needed
let bot;

if (token) {
  try {
    bot = new TelegramBot(token, { polling: true });
    
    bot.on("polling_error", (error) => {
      console.log("⚠️ Telegram Polling Error:", error.message);
    });

    bot.on("chat_member", async (update) => {
      const newMember = update.new_chat_member;
      const oldMember = update.old_chat_member;
      
      // FIX: Get the exact ID of the specific group the user just joined
      const currentChatId = update.chat.id; 

      if (newMember.status === "member" && oldMember.status === "left") {
        const userId = newMember.user.id;
        const db = loadDB();
        const linkEntry = Object.entries(db).find(([, data]) => data.userId === userId);
        if (!linkEntry) return;

        const [link] = linkEntry;
        
        // FIX: Revoke the link specifically from the group they joined
        try {
            await bot.revokeChatInviteLink(currentChatId, link);
        } catch(e) { console.log("Failed to revoke link:", e.message); }
        
        delete db[link];
        saveDB(db);

        // FIX: Auto-kick them from the exact group they joined after 10 mins
        setTimeout(async () => {
          try {
            await bot.banChatMember(currentChatId, userId);
            await bot.unbanChatMember(currentChatId, userId);
          } catch(e) {}
        }, 10 * 60 * 1000);
      }
    });

  } catch (err) {
    console.error("Failed to start bot:", err);
  }
}

// 4. API ENDPOINT (Now Supports Unlimited Channels)
app.post("/getlink", async (req, res) => {
  if (!bot) {
    return res.status(500).json({ success: false, error: "Bot is not running. Check API Token." });
  }

  // Grab the specific channel ID the user requested from the website
  const { userId, channelId } = req.body; 
  
  // Use the requested channel, or fallback to the Railway variable if none provided
  const targetChannel = channelId || DEFAULT_GROUP_ID;

  if (!targetChannel) {
      return res.status(400).json({ success: false, error: "No Channel ID provided by the website." });
  }

  try {
    // FIX: Generate the link for the SPECIFIC channel requested
    const link = await bot.createChatInviteLink(targetChannel, {
      member_limit: 1,
      expire_date: Math.floor(Date.now() / 1000) + 600
    });

    const db = loadDB();
    db[link.invite_link] = { userId, channelId: targetChannel };
    saveDB(db);

    res.json({ success: true, invite_link: link.invite_link });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});