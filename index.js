import express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN;

// 0. FAIL-SAFE: Check if token exists
if (!token) {
    console.error("❌ FATAL ERROR: BOT_TOKEN is missing. Please set it in your Railway Environment Variables.");
    process.exit(1);
}

// 1. INITIALIZE BOT WITH ALL UPDATE TYPES
const bot = new TelegramBot(token, { 
    polling: {
        params: {
            allowed_updates: ["chat_member", "message", "my_chat_member"]
        }
    }
});

bot.on("polling_error", (err) => console.error("⚠️ Polling Error: ", err));

// 2. WELCOME + AUTO-KICK + MESSAGE DELETE LOGIC
bot.on("chat_member", async (update) => {
    try {
        const chatId = update.chat.id;
        const userId = update.new_chat_member.user.id;
        const newStatus = update.new_chat_member.status;
        const oldStatus = update.old_chat_member.status;

        console.log(`📡 EVENT: User ${userId} status changed in ${chatId} (${oldStatus} -> ${newStatus})`);

        // Trigger only when someone actually joins as a member
        if (newStatus === "member" && oldStatus !== "member") {
            console.log(`🎯 JOIN DETECTED: User ${userId}. Starting 5-minute cycle.`);

            // FIXED: Wrapped the text in backticks to prevent syntax errors
            const welcomeText = 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐏𝐑𝐎𝐍 𝐇𝐔𝐏 💦, 𝐘𝐎𝐔 𝐖𝐈𝐋𝐋 𝐁𝐄 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 𝐅𝐑𝐎𝐌 𝐓𝐇𝐄 𝐆𝐑𝐎𝐔𝐏 𝐀𝐅𝐓𝐄𝐑 𝟓 𝐌𝐈𝐍𝐒 , 𝐖𝐄 𝐈𝐌𝐏𝐋𝐄𝐌𝐄𝐍𝐓𝐄𝐃 𝐓𝐇𝐈𝐒 𝐓𝐎 𝐀𝐕𝐎𝐈𝐃 𝐆𝐑𝐎𝐔𝐏 𝐁𝐀𝐍 ✨, 𝐔 𝐂𝐀𝐍 𝐀𝐂𝐂𝐄𝐒𝐒 𝐓𝐇𝐄 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 𝐀𝐆𝐀𝐈𝐍 𝐉𝐔𝐒𝐓 𝐁𝐘 𝐖𝐀𝐓𝐂𝐇𝐈𝐍𝐆 𝐎𝐍𝐄 𝐀𝐃𝐒💫;
           
            // Send Welcome Message
            const sentMsg = await bot.sendMessage(chatId, welcomeText);
            console.log(`✉️ Welcome message sent to User ${userId}`);

            // Start the 5-minute timer (5 * 60 * 1000 ms)
            setTimeout(async () => {
                try {
                    // Kick and Unban (to allow re-entry later via the ad link)
                    await bot.banChatMember(chatId, userId);
                    await bot.unbanChatMember(chatId, userId);
                    console.log(`👞 User ${userId} kicked successfully.`);

                    // Delete the specific welcome message for this user
                    await bot.deleteMessage(chatId, sentMsg.message_id);
                    console.log(`🗑️ Welcome message for User ${userId} deleted.`);
                } catch (kickErr) {
                    console.error(`❌ ERROR during kick/delete for ${userId}:`, kickErr.message);
                }
            }, 5 * 60 * 1000); // 5 Minutes
        }
    } catch (err) {
        console.error(`❌ CRITICAL EVENT ERROR:`, err.message);
    }
});

// 3. LINK GENERATION ENDPOINT (40s EXPIRY)
app.post("/getlink", async (req, res) => {
    const { channelId, userId } = req.body;
    const targetChannel = channelId || process.env.GROUP_ID;

    console.log(`🔗 LINK REQUEST: Channel ${targetChannel} for User ${userId}`);

    try {
        const link = await bot.createChatInviteLink(targetChannel, {
            expire_date: Math.floor(Date.now() / 1000) + 40, // 40 Seconds
            member_limit: 1
        });
        res.json({ success: true, invite_link: link.invite_link });
    } catch (err) {
        console.warn(`⚠️ Primary link failed, trying fallback:`, err.message);
        // Fallback for strict channels
        try {
            const fallback = await bot.createChatInviteLink(targetChannel, {
                expire_date: Math.floor(Date.now() / 1000) + 40
            });
            res.json({ success: true, invite_link: fallback.invite_link });
        } catch (finalErr) {
            console.error(`❌ LINK FAILED:`, finalErr.message);
            res.status(500).json({ success: false, error: finalErr.message });
        }
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 SERVER RUNNING ON PORT ${PORT}`);
    bot.getMe()
       .then(me => console.log(`🤖 BOT CONNECTED AS: @${me.username}`))
       .catch(err => console.error(`❌ FAILED TO CONNECT BOT. Is the token correct?`, err.message));
});

// Health Check
app.get("/", (req, res) => res.send("Bot is monitoring " + PORT));
