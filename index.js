import express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

// --- CRASH PREVENTION: GLOBAL ERROR HANDLERS ---
process.on('uncaughtException', (err) => console.error('🔥 CRITICAL ERROR (Uncaught):', err));
process.on('unhandledRejection', (reason, promise) => console.error('🔥 CRITICAL ERROR (Rejection):', reason));

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN;

if (!token) {
    console.error("❌ ERROR: BOT_TOKEN is missing in Railway Variables!");
    process.exit(1); 
}

// Initialize bot
const bot = new TelegramBot(token, { polling: true });

// --- LOGS TO CONFIRM SUCCESSFUL START ---
bot.getMe().then(me => {
    console.log("-----------------------------------------");
    console.log(`✅ SUCCESS: Bot is online as @${me.username}`);
    console.log(`🚀 Server is listening on port ${PORT}`);
    console.log("-----------------------------------------");
}).catch(err => console.log("❌ BOT STARTUP ERROR: " + err.message));

// --- 1. THE MESSAGE DETECTOR (FOR TESTING) ---
bot.on("text", async (msg) => {
    try {
        console.log(`📩 Received: "${msg.text}" from Chat ID: ${msg.chat.id}`);
        if (msg.text === "/test") {
            await bot.sendMessage(msg.chat.id, "✅ Bot is working!");
        }
    } catch (e) { console.log("❌ Message Error: " + e.message); }
});

// --- 2. THE JOIN & 5-MIN KICK LOGIC ---
bot.on("chat_member", async (update) => {
    try {
        const chatId = update.chat.id;
        const userId = update.new_chat_member.user.id;
        const newStatus = update.new_chat_member.status;

        if (newStatus === "member") {
            console.log(`👤 JOIN: User ${userId} joined Group ${chatId}`);
            
            const welcomeText = `𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐏𝐑𝐎𝐍 𝐇𝐔𝐏 💦, 𝐘𝐎𝐔 𝐖𝐈𝐋𝐋 𝐁𝐄 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 𝐀𝐅𝐓𝐄𝐑 𝟓 𝐌𝐈𝐍𝐒.`;
            const sentMsg = await bot.sendMessage(chatId, welcomeText);

            setTimeout(async () => {
                try {
                    await bot.banChatMember(chatId, userId);
                    await bot.unbanChatMember(chatId, userId);
                    await bot.deleteMessage(chatId, sentMsg.message_id);
                    console.log(`👞 KICKED: User ${userId} removed successfully.`);
                } catch (err) { console.log(`❌ Kick Failed for ${userId}: ` + err.message); }
            }, 5 * 60 * 1000);
        }
    } catch (err) { console.log("❌ Member Event Error: " + err.message); }
});

// --- 3. THE LINK GENERATOR (FOR YOUR ADMIN PANEL) ---
app.post("/getlink", async (req, res) => {
    const target = req.body.channelId || process.env.GROUP_ID;
    console.log(`🔗 Requesting link for: ${target}`);
    try {
        const link = await bot.createChatInviteLink(target, {
            expire_date: Math.floor(Date.now() / 1000) + 40,
            member_limit: 1
        });
        res.json({ success: true, invite_link: link.invite_link });
    } catch (err) {
        console.log("❌ Link Gen Error: " + err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get("/", (req, res) => res.send("Bot is Active"));

app.listen(PORT, '0.0.0.0', () => console.log(`📡 Backend Web Server Live`));