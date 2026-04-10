import express from "express";
import TelegramBot from "node-telegram-bot-api";
import fs from "fs";
import cors from "cors"; // <-- ADDED: Imports the CORS package

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const GROUP_ID = process.env.GROUP_ID;
const DB_FILE = "./links.json";

const app = express();
app.use(cors()); // <-- ADDED: Tells your bot to accept requests from your website
app.use(express.json());

// Helpers
function loadDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE));
}
function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Telegram command (still works if user types /getlink)
bot.onText(/\/getlink/, async (msg) => {
  const userId = msg.from.id;
  const res = await bot.createChatInviteLink(GROUP_ID, {
    member_limit: 1,
    expire_date: Math.floor(Date.now() / 1000) + 600
  });

  const db = loadDB();
  db[res.invite_link] = { userId };
  saveDB(db);

  bot.sendMessage(userId, `Your link:\n${res.invite_link}`);
});

// Detect join + auto‑kick after 10 min
bot.on("chat_member", async (update) => {
  const newMember = update.new_chat_member;
  const oldMember = update.old_chat_member;

  if (newMember.status === "member" && oldMember.status === "left") {
    const userId = newMember.user.id;
    const db = loadDB();
    const linkEntry = Object.entries(db).find(
      ([, data]) => data.userId === userId
    );
    if (!linkEntry) return;

    const [link] = linkEntry;
    await bot.revokeChatInviteLink(GROUP_ID, link);

    delete db[link];
    saveDB(db);

    setTimeout(async () => {
      await bot.banChatMember(GROUP_ID, userId);
      await bot.unbanChatMember(GROUP_ID, userId);
    }, 10 * 60 * 1000);
  }
});

// 🚀 Web API endpoint for your site
app.post("/getlink", async (req, res) => {
  const { userId } = req.body; // you send this from your web app

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

// Railway will expose this port
app.listen(process.env.PORT || 3000, () => {
  console.log("API running...");
});