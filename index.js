import express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN;

// 1. CRITICAL: Force Telegram to send all member updates
const bot = new TelegramBot(token, { 
    polling: {
        params: {
            allowed_updates: ["chat_member", "message", "my_chat_member"]
        }
    }
});

bot.on("polling_error", (err) => console.log("⚠️ Polling Error: " + err.message));

// 2. THE KICK & WELCOME LOGIC
bot.on("chat_member", async (update) => {
    try {
        const chatId = update.chat.id;
        const user = update.new_chat_member.user;
        const userId = user.id;
        const userName = user.first_name || "User";
        
        const newStatus = update.new_chat_member.status;
        const oldStatus = update.old_chat_member.status;

        // LOG EVERY CHANGE: This helps us see if the bot is even awake
        console.log(`📡 UPDATE: ${userName} status in ${chatId} changed from ${oldStatus} to ${newStatus}`);

        // Trigger when someone joins
        if (newStatus === "member" && oldStatus !== "member") {
            console.log(`🟢 MATCH: User ${userName} joined. Sending welcome and setting 5m timer.`);

            const welcomeText = `𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐏𝐑𝐎𝐍 𝐇𝐔𝐏 💦, 𝐘𝐎𝐔 𝐖𝐈𝐋𝐋 𝐁𝐄 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 𝐅𝐑𝐎𝐌 𝐓𝐇𝐄 𝐆𝐑𝐎𝐔𝐏 𝐀𝐅𝐓𝐄𝐑 𝟓 𝐌𝐈𝐍𝐒 , 𝐖𝐄 𝐈𝐌𝐏𝐋𝐄𝐌𝐄𝐍𝐓𝐄𝐃 𝐓𝐇𝐈𝐒 𝐓𝐎 𝐀𝐕𝐎𝐈𝐃 𝐆𝐑𝐎𝐔𝐏 𝐁𝐀𝐍 ✨, 𝐔 𝐂𝐀𝐍 𝐀𝐂𝐂𝐄𝐒𝐒 𝐓𝐇𝐄 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 𝐀𝐆𝐀𝐈𝐍 𝐉𝐔𝐒𝐓 𝐁𝐘 𝐖𝐀𝐓𝐂𝐇𝐈𝐍𝐆 𝐎𝐍𝐄 𝐀𝐃𝐒💫`;

            const sentMsg = await bot.sendMessage(chatId, welcomeText);

            setTimeout(async () => {
                try {
                    // KICK (BAN)
                    await bot.banChatMember(chatId, userId);
                    // UNBAN (SO THEY CAN COME BACK LATER)
                    await bot.unbanChatMember(chatId, userId);
                    console.log(`👞 SUCCESS: User ${userId} removed.`);

                    // DELETE WELCOME MSG
                    await bot.deleteMessage(chatId, sentMsg.message_id);
                } catch (kickErr) {
                    console.log(`❌ KICK FAILED: Does the bot have 'Ban Users' permission? Error: ${kickErr.message}`);
                }
            }, 5 * 60 * 1000); 
        }
    } catch (err) {
        console.log(`❌ EVENT ERROR: ${err.message}`);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server Running on ${PORT}`);
    bot.getMe().then(me => console.log(`🤖 Bot Username: @${me.username}`));
});

app.post("/getlink", async (req, res) => {
    const { channelId } = req.body;
    const targetChannel = channelId || process.env.GROUP_ID;
    try {
        const link = await bot.createChatInviteLink(targetChannel, {
            expire_date: Math.floor(Date.now() / 1000) + 40,
            member_limit: 1
        });
        res.json({ success: true, invite_link: link.invite_link });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});