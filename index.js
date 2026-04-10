import express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN;

// 1. Initialize Bot with "Join" Event Listeners
const bot = new TelegramBot(token, { 
    polling: {
        params: {
            allowed_updates: ["chat_member", "message", "my_chat_member"]
        }
    }
});

// Log any connection issues
bot.on("polling_error", (err) => console.log("⚠️ Polling Error: " + err.message));

// 2. The Welcome & Auto-Kick Logic
bot.on("chat_member", async (update) => {
    try {
        const chatId = update.chat.id;
        const user = update.new_chat_member.user;
        const userId = user.id;
        const userName = user.first_name || "User";
        
        const newStatus = update.new_chat_member.status;
        const oldStatus = update.old_chat_member.status;

        // Trigger when someone joins (status changes to 'member')
        if (newStatus === "member" && oldStatus !== "member") {
            console.log(`🟢 NEW JOIN: ${userName} (ID: ${userId}) joined group ${chatId}`);

            // YOUR CUSTOM WELCOME TEXT
            const welcomeText = `𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐏𝐑𝐎𝐍 𝐇𝐔𝐏 💦, 𝐘𝐎𝐔 𝐖𝐈𝐋𝐋 𝐁𝐄 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 𝐅𝐑𝐎𝐌 𝐓𝐇𝐄 𝐆𝐑𝐎𝐔𝐏 𝐀𝐅𝐓𝐄𝐑 𝟓 𝐌𝐈𝐍𝐒 , 𝐖𝐄 𝐈𝐌𝐏𝐋𝐄𝐌𝐄𝐍𝐓𝐄𝐃 𝐓𝐇𝐈𝐒 𝐓𝐎 𝐀𝐕𝐎𝐈𝐃 𝐆𝐑𝐎𝐔𝐏 𝐁𝐀𝐍 ✨, 𝐔 𝐂𝐀𝐍 𝐀𝐂𝐂𝐄𝐒𝐒 𝐓𝐇𝐄 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 𝐀𝐆𝐀𝐈𝐍 𝐉𝐔𝐒𝐓 𝐁𝐘 𝐖𝐀𝐓𝐂𝐇𝐈𝐍𝐆 𝐎𝐍𝐄 𝐀𝐃𝐒💫`;

            // Send message and store its ID so we can delete it later
            const sentMsg = await bot.sendMessage(chatId, welcomeText);
            console.log(`✉️ Welcome message sent to ${userName}`);

            // Start 5-minute timer
            setTimeout(async () => {
                try {
                    // Kick user
                    await bot.banChatMember(chatId, userId);
                    await bot.unbanChatMember(chatId, userId);
                    console.log(`👞 User ${userId} removed after 5 mins.`);

                    // Delete the welcome message to prevent overflow
                    await bot.deleteMessage(chatId, sentMsg.message_id);
                    console.log(`🗑️ Welcome message for ${userId} deleted.`);
                } catch (kickErr) {
                    console.log(`❌ Cleanup failed for ${userId}: ${kickErr.message}`);
                }
            }, 5 * 60 * 1000); 
        }
    } catch (err) {
        console.log(`❌ Event Error: ${err.message}`);
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server active on port ${PORT}`);
    bot.getMe().then(me => console.log(`🤖 Bot Name: @${me.username}`));
});

// Link Generation (40-second expiry)
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
        try {
            const fallback = await bot.createChatInviteLink(targetChannel, {
                expire_date: Math.floor(Date.now() / 1000) + 40
            });
            res.json({ success: true, invite_link: fallback.invite_link });
        } catch (f) {
            res.status(500).json({ success: false, error: f.message });
        }
    }
});