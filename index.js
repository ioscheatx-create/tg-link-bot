import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080; // Fixed to match Railway's default
const DB_FILE = "./links.json";

// 1. START THE WEB SERVER FIRST (Prevents "Application failed to respond")
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server successfully started on port ${PORT}`);
});

// 2. HEALTH CHECK PAGE
app.get("/", (req, res) => {
  const hasToken = !!process.env.BOT_TOKEN;
  const hasGroup = !!process.env.GROUP_ID;
  res.send(`
    <h2>Server is LIVE!</h2>
    <p>Bot Token Configured: <b>${hasToken ? "YES ✅" : "NO ❌ (Check Railway Variables)"}</b></p>
    <p>Group ID Configured: <b>${hasGroup ? "YES ✅" : "NO ❌ (Check Railway Variables)"}</b></p>
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
const GROUP_ID = process.env.GROUP_ID;
let bot;

if (token) {
  try {
    bot = new TelegramBot(token, { polling: true });
    
    bot.on("polling_error", (error) => {
      console.log("⚠️ Telegram Polling Error:", error.message);
    });

    bot.onText(/\/getlink/, async (msg) => {
      const userId = msg.from.id;
      try {
        const res = await bot.createChatInviteLink(GROUP_ID, {
          member_limit: 1,
          expire_date: Math.floor(Date.now() / 1000) + 600
        });
        const db = loadDB();
        db[res.invite_link] = { userId };
        saveDB(db);
        bot.sendMessage(userId, \`Your link:\\n\${res.invite_link}\`);
      } catch (err) {
        console.error("Bot command error:", err.message);
      }
    });

    bot.on("chat_member", async (update) => {
      const newMember = update.new_chat_member;
      const oldMember = update.old_chat_member;

      if (newMember.status === "member" && oldMember.status === "left") {
        const userId = newMember.user.id;
        const db = loadDB();
        const linkEntry = Object.entries(db).find(([, data]) => data.userId === userId);
        if (!linkEntry) return;

        const [link] = linkEntry;
        await bot.revokeChatInviteLink(GROUP_ID, link);
        delete db[link];
        saveDB(db);

        setTimeout(async () => {
          try {
            await bot.banChatMember(GROUP_ID, userId);
            await bot.unbanChatMember(GROUP_ID, userId);
          } catch(e) {}
        }, 10 * 60 * 1000);
      }
    });

  } catch (err) {
    console.error("Failed to start bot:", err);
  }
}

// 4. API ENDPOINT FOR YOUR WEBSITE
app.post("/getlink", async (req, res) => {
  if (!bot) {
    return res.status(500).json({ success: false, error: "Bot is not running. Check API Token." });
  }

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