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

// --- CRITICAL FIX: ENABLE ALLOWED UPDATES ---
// This ensures the bot 'hears' when users join or leave the group.
const bot = new TelegramBot(token, { 
    polling: {
        params: {
            allowed_updates: ["chat_member", "message", "my_chat_member"]
        }
    }
});

// Log connection status and identity
bot.getMe().then(me => {
    console.log("-----------------------------------------");
    console.log(`✅ SUCCESS: Bot is online as @${me.username}`);
    console.log(`🚀 Server listening on port ${PORT}`);
    console.log("🟢 Polling active with 'chat_member' updates enabled.");
    console.log("-----------------------------------------");
}).catch(err => console.log("❌ BOT STARTUP ERROR: " + err.message));

// Log any polling errors for transparency
bot.on("polling_error", (err) => console.log(`⚠️ POLLING ERROR: ${err.message}`));

// --- 1. THE MESSAGE DETECTOR (FOR TESTING) ---
bot.on("text", async (msg) => {
    try {
        console.log(`📩 MSG: "${msg.text}" from User ${msg.from.id} in Chat ${msg.chat.id}`);
        if (msg.text === "/test") {
            await bot.sendMessage(msg.chat.id, "✅ Bot is working!");
        }
    } catch (e) { console.log("❌ Message Error: " + e.message); }
});

// --- 2. JOIN & 5-MIN KICK LOGIC WITH DESCRIPTIVE LOGS ---
bot.on("chat_member", async (update) => {
    try {
        const chatId = update.chat.id;
        const user = update.new_chat_member.user;
        const userId = user.id;
        const userName = user.first_name || "User";
        const newStatus = update.new_chat_member.status;
        const oldStatus = update.old_chat_member.status;

        // Log every status change to see the bot is awake
        console.log(`📡 STATUS UPDATE: ${userName} (${userId}) status in ${chatId}: ${oldStatus} -> ${newStatus}`);

        // Trigger when a user joins (member status)
        if (newStatus === "member" && oldStatus !== "member") {
            console.log(`🎯 JOIN DETECTED: User ${userName} joined. Starting 5-minute cycle.`);
            
            const welcomeText = `𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐏𝐑𝐎𝐍 𝐇𝐔𝐏 💦, 𝐘𝐎𝐔 𝐖𝐈𝐋𝐋 𝐁𝐄 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 𝐀𝐅𝐓𝐄𝐑 𝟓 𝐌𝐈𝐍𝐒.`;
            
            // Send the Welcome Message
            const sentMsg = await bot.sendMessage(chatId, welcomeText);
            console.log(`✉️ WELCOME SENT: Successfully messaged ${userName} in ${chatId}`);

            // Set the 5-minute timer
            setTimeout(async () => {
                try {
                    // Kick and Unban (to allow later re-entry)
                    await bot.banChatMember(chatId, userId);
                    await bot.unbanChatMember(chatId, userId);
                    console.log(`👞 KICKED: User ${userName} (${userId}) removed successfully.`);

                    // Cleanup the welcome message
                    await bot.deleteMessage(chatId, sentMsg.message_id);
                    console.log(`🗑️ CLEANUP: Welcome message for ${userId} deleted.`);
                } catch (err) { 
                    console.log(`❌ KICK/CLEANUP FAILED for ${userName}: ` + err.message); 
                }
            }, 5 * 60 * 1000); 
        }
    } catch (err) { 
        console.log("❌ MEMBER EVENT CRASH: " + err.message); 
    }
});

// --- 3. THE LINK GENERATOR ENDPOINT ---
app.post("/getlink", async (req, res) => {
    const target = req.body.channelId || process.env.GROUP_ID;
    console.log(`🔗 LINK REQUEST: Creating link for channel ${target}`);
    try {
        const link = await bot.createChatInviteLink(target, {
            expire_date: Math.floor(Date.now() / 1000) + 40,
            member_limit: 1
        });
        res.json({ success: true, invite_link: link.invite_link });
    } catch (err) {
        console.log(`❌ LINK GEN ERROR for ${target}: ` + err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get("/", (req, res) => res.send("Bot Monitoring System is Active."));

app.listen(PORT, '0.0.0.0', () => console.log(`📡 Backend Web Server Live on ${PORT}`));