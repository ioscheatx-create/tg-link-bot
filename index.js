import TelegramBot from "node-telegram-bot-api";
import fs from "fs";

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const GROUP_ID = process.env.GROUP_ID;
const DB_FILE = "./links.json";

function loadDB() {
  if (!fs.existsSync(DB_FILE)) return {};
  return JSON.parse(fs.readFileSync(DB_FILE));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

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