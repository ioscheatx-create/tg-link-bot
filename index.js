import express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN;

// 1. FIX: Enable member tracking
const bot = new TelegramBot(token, { 
    polling: {
        params: {
            allowed_updates: ["chat_member", "message", "my_chat_member"]
        }
    }
});

bot.getMe().then(me => {
    console.log(`✅ BOT ONLINE: @${me.username}`);
});

// 2. THE JOIN & KICK LOGIC
bot.on("chat_member", async (update) => {
    try {
        const chatId = update.chat.id;
        const user = update.new_chat_member.user;
        const userId = user.id;
        const newStatus = update.new_chat_member.status;
        const oldStatus = update.old_chat_member.status;

        // Log everything to Railway so we can debug
        console.log(`👤 UPDATE: User ${userId} status in ${chatId}: ${oldStatus} -> ${newStatus}`);

        if (newStatus === "member" && oldStatus !== "member") {
            console.log(`🎯 JOIN DETECTED: Sending welcome to User ${userId}`);
            
            const welcomeText = `𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐏𝐑𝐎𝐍 𝐇𝐔𝐏 💦, 𝐘𝐎𝐔 𝐖𝐈𝐋𝐋 𝐁𝐄 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 𝐀𝐅𝐓𝐄𝐑 𝟓 𝐌𝐈𝐍𝐒.`;
            const sentMsg = await bot.sendMessage(chatId, welcomeText);

            setTimeout(async () => {
                try {
                    await bot.banChatMember(chatId, userId);
                    await bot.unbanChatMember(chatId, userId);
                    await bot.deleteMessage(chatId, sentMsg.message_id);
                    console.log(`👞 KICKED: User ${userId} removed after 5 mins.`);
                } catch (err) {
                    console.log(`❌ KICK FAILED for ${userId}: ${err.message}`);
                }
            }, 5 * 60 * 1000);
        }
    } catch (err) {
        console.log("❌ EVENT ERROR: " + err.message);
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));

app.post("/getlink", async (req, res) => {
    const target = req.body.channelId || process.env.GROUP_ID;
    try {
        const link = await bot.createChatInviteLink(target, {
            expire_date: Math.floor(Date.now() / 1000) + 40,
            member_limit: 1
        });
        res.json({ success: true, invite_link: link.invite_link });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});