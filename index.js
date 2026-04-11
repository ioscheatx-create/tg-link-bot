import express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

// --- CRASH PREVENTION ---
process.on('uncaughtException', (err) => console.error('🔥 CRITICAL ERROR:', err));
process.on('unhandledRejection', (reason) => console.error('🔥 CRITICAL REJECTION:', reason));

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN;

if (!token) {
    console.error("❌ ERROR: BOT_TOKEN is missing!");
    process.exit(1);
}

// 1. INITIALIZE BOT: Tell Telegram we want to hear about "Join Requests"
const bot = new TelegramBot(token, { 
    polling: {
        params: {
            allowed_updates: ["chat_join_request", "message", "chat_member"]
        }
    }
});

bot.getMe().then(me => {
    console.log("-----------------------------------------");
    console.log(`✅ BOT IS LIVE: @${me.username}`);
    console.log(`🚀 Web Server running on port ${PORT}`);
    console.log("🟢 Listening for Join Requests...");
    console.log("-----------------------------------------");
});

// 2. THE NEW AUTO-APPROVE & KICK LOGIC
bot.on("chat_join_request", async (request) => {
    const chatId = request.chat.id;
    const userId = request.from.id;
    const userName = request.from.first_name || "User";

    console.log(`🔔 REQUEST: ${userName} (${userId}) wants to join. Auto-approving...`);

    try {
        // Step A: Approve the user so they are instantly let into the group
        await bot.approveChatJoinRequest(chatId, userId);
        console.log(`✅ APPROVED: ${userName} is now in the group.`);

        // Step B: Send the Welcome Message
        const welcomeText = `𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐏𝐑𝐎𝐍 𝐇𝐔𝐏 💦, 𝐘𝐎𝐔 𝐖𝐈𝐋𝐋 𝐁𝐄 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 𝐅𝐑𝐎𝐌 𝐓𝐇𝐄 𝐆𝐑𝐎𝐔𝐏 𝐀𝐅𝐓𝐄𝐑 𝟓 𝐌𝐈𝐍𝐒 , 𝐖𝐄 𝐈𝐌𝐏𝐋𝐄𝐌𝐄𝐍𝐓𝐄𝐃 𝐓𝐇𝐈𝐒 𝐓𝐎 𝐀𝐕𝐎𝐈𝐃 𝐆𝐑𝐎𝐔𝐏 𝐁𝐀𝐍 ✨, 𝐔 𝐂𝐀𝐍 𝐀𝐂𝐂𝐄𝐒𝐒 𝐓𝐇𝐄 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 𝐀𝐆𝐀𝐈𝐍 𝐉𝐔𝐒𝐓 𝐁𝐘 𝐖𝐀𝐓𝐂𝐇𝐈𝐍𝐆 𝐎𝐍𝐄 𝐀𝐃𝐒.`;
        const sentMsg = await bot.sendMessage(chatId, welcomeText);
        console.log(`✉️ WELCOME SENT to ${userName}.`);

        // Step C: Start the 5-Minute Timer
        setTimeout(async () => {
            try {
                // Kick the user and immediately unban them so they can come back later
                await bot.banChatMember(chatId, userId);
                await bot.unbanChatMember(chatId, userId);
                console.log(`👞 SUCCESS: ${userName} (${userId}) removed after 5 mins.`);

                // Delete the welcome message to keep the chat clean
                await bot.deleteMessage(chatId, sentMsg.message_id);
                console.log(`🗑️ CLEANUP: Welcome text for ${userName} deleted.`);
            } catch (err) {
                console.log(`❌ ERROR DURING KICK/CLEANUP: ${err.message}`);
            }
        }, 5 * 60 * 1000); // 5 minutes in milliseconds

    } catch (err) {
        console.log(`❌ ERROR APPROVING USER: ${err.message}`);
    }
});

// 3. THE UPDATED LINK GENERATOR (For your Admin Panel)
app.post("/getlink", async (req, res) => {
    const target = req.body.channelId || process.env.GROUP_ID;
    console.log(`🔗 GENERATING LINK FOR: ${target}`);
    
    try {
        const link = await bot.createChatInviteLink(target, {
            expire_date: Math.floor(Date.now() / 1000) + 40, // Expires in 40 seconds
            creates_join_request: true // 👈 This forces the user into the Approval Queue
        });
        
        res.json({ success: true, invite_link: link.invite_link });
    } catch (err) {
        console.log(`❌ LINK ERROR: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Basic health check endpoint
app.get("/", (req, res) => res.send("Bot Monitoring System is Active."));

app.listen(PORT, '0.0.0.0', () => console.log(`📡 Backend Active`));
