import express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN;

// Initialize bot with forced polling and update types
const bot = new TelegramBot(token, { 
    polling: {
        params: {
            allowed_updates: ["chat_member", "message", "my_chat_member"]
        }
    }
});

// Logs to show the bot is connected
bot.getMe().then(me => {
    console.log("-----------------------------------------");
    console.log(`✅ BOT IS ONLINE: @${me.username}`);
    console.log("🟢 All systems ready. Awaiting joins...");
    console.log("-----------------------------------------");
});

// 1. WELCOME & KICK LOGIC
bot.on("chat_member", async (update) => {
    const chatId = update.chat.id;
    const user = update.new_chat_member.user;
    const userId = user.id;
    
    // Log EVERY status change so we can see it in Railway
    console.log(`📡 STATUS UPDATE: User ${userId} is now ${update.new_chat_member.status}`);

    if (update.new_chat_member.status === "member" && update.old_chat_member.status !== "member") {
        console.log(`🎯 JOIN DETECTED: Sending welcome and starting 5m timer for ${userId}`);
        
        const welcomeText = `𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐏𝐑𝐎𝐍 𝐇𝐔𝐏 💦, 𝐘𝐎𝐔 𝐖𝐈𝐋𝐋 𝐁𝐄 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 𝐅𝐑𝐎𝐌 𝐓𝐇𝐄 𝐆𝐑𝐎𝐔𝐏 𝐀𝐅𝐓𝐄𝐑 𝟓 𝐌𝐈𝐍𝐒 , 𝐖𝐄 𝐈𝐌𝐏𝐋𝐄𝐌𝐄𝐍𝐓𝐄𝐃 𝐓𝐇𝐈𝐒 𝐓𝐎 𝐀𝐕𝐎𝐈𝐃 𝐆𝐑𝐎𝐔𝐏 𝐁𝐀𝐍 ✨, 𝐔 𝐂𝐀𝐍 𝐀𝐂𝐂𝐄𝐒𝐒 𝐓𝐇𝐄 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 𝐀𝐆𝐀𝐈𝐍 𝐉𝐔𝐒𝐓 𝐁𝐘 𝐖𝐀𝐓𝐂𝐇𝐈𝐍𝐆 𝐎𝐍𝐄 𝐀𝐃𝐒💫`;

        try {
            const sentMsg = await bot.sendMessage(chatId, welcomeText);
            
            setTimeout(async () => {
                try {
                    await bot.banChatMember(chatId, userId);
                    await bot.unbanChatMember(chatId, userId);
                    await bot.deleteMessage(chatId, sentMsg.message_id);
                    console.log(`👞 KICK SUCCESS: User ${userId} removed.`);
                } catch (e) {
                    console.log(`❌ KICK FAILED: ${e.message}`);
                }
            }, 5 * 60 * 1000);
        } catch (e) {
            console.log(`❌ MESSAGE FAILED: ${e.message}`);
        }
    }
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on ${PORT}`));

// Link generator (40s expiry)
app.post("/getlink", async (req, res) => {
    try {
        const link = await bot.createChatInviteLink(req.body.channelId || process.env.GROUP_ID, {
            expire_date: Math.floor(Date.now() / 1000) + 40,
            member_limit: 1
        });
        res.json({ success: true, invite_link: link.invite_link });
    } catch (e) { res.status(500).json({ error: e.message }); }
});