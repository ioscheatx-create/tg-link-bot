import express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

// --- CRASH PREVENTION ---
process.on('uncaughtException', (err) => console.error('🔥 CRITICAL ERROR:', err));
process.on('unhandledRejection', (reason) => console.error('🔥 CRITICAL REJECTION:', reason));

const app = express();
app.use(cors({ origin: '*' })); // Ensures your frontend can access it without CORS issues
app.use(express.json());

const PORT = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN;

if (!token) {
    console.error("❌ ERROR: BOT_TOKEN is missing!");
    process.exit(1);
}

// 1. INITIALIZE BOT
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

// 2. AUTO-APPROVE & KICK LOGIC
bot.on("chat_join_request", async (request) => {
    const chatId = request.chat.id;
    const userId = request.from.id;
    const userName = request.from.first_name || "User";

    console.log(`🔔 REQUEST: ${userName} (${userId}) wants to join. Auto-approving...`);

    try {
        await bot.approveChatJoinRequest(chatId, userId);
        console.log(`✅ APPROVED: ${userName} is now in the group.`);

        const welcomeText = `𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐏𝐑𝐎𝐍 𝐇𝐔𝐏 💦, 𝐘𝐎𝐔 𝐖𝐈𝐋𝐋 𝐁𝐄 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 𝐅𝐑𝐎𝐌 𝐓𝐇𝐄 𝐆𝐑𝐎𝐔𝐏 𝐀𝐅𝐓𝐄𝐑 𝟏𝟎 𝐌𝐈𝐍𝐒 , 𝐖𝐄 𝐈𝐌𝐏𝐋𝐄𝐌𝐄𝐍𝐓𝐄𝐃 𝐓𝐇𝐈𝐒 𝐓𝐎 𝐀𝐕𝐎𝐈𝐃 𝐆𝐑𝐎𝐔𝐏 𝐁𝐀𝐍 ✨, 𝐔 𝐂𝐀𝐍 𝐀𝐂𝐂𝐄𝐒𝐒 𝐓𝐇𝐄 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 𝐀𝐆𝐀𝐈𝐍 𝐉𝐔𝐒𝐓 𝐁𝐘 𝐖𝐀𝐓𝐂𝐇𝐈𝐍𝐆 𝐎𝐍𝐄 𝐀𝐃𝐒.`;
        const sentMsg = await bot.sendMessage(chatId, welcomeText);
        
        setTimeout(async () => {
            try {
                await bot.banChatMember(chatId, userId);
                await bot.unbanChatMember(chatId, userId);
                console.log(`👞 SUCCESS: ${userName} removed after 10 mins.`);
                
                await bot.deleteMessage(chatId, sentMsg.message_id);
            } catch (err) {
                console.log(`❌ ERROR DURING KICK/CLEANUP: ${err.message}`);
            }
        }, 10 * 60 * 1000);

    } catch (err) {
        console.log(`❌ ERROR APPROVING USER: ${err.message}`);
    }
});

// AUTO-DELETE SYSTEM MESSAGES
bot.on("message", async (msg) => {
    if (msg.new_chat_members || msg.left_chat_member) {
        try {
            await bot.deleteMessage(msg.chat.id, msg.message_id);
        } catch (err) {}
    }
});

// 3. LINK GENERATOR
app.post("/getlink", async (req, res) => {
    let target = req.body.channelId || process.env.GROUP_ID;
    
    if (!target || target === "undefined" || target === "") {
        console.log("❌ LINK ERROR: No target Group ID provided by frontend.");
        return res.status(400).json({ success: false, error: "Group ID is missing in database." });
    }

    // Ensure it's treated as a string to avoid numeric ID stripping issues
    target = target.toString().trim();
    console.log(`🔗 GENERATING LINK FOR: ${target}`);
    
    try {
        const link = await bot.createChatInviteLink(target, {
            expire_date: Math.floor(Date.now() / 1000) + 60, // Expires in 60 seconds for safety
            creates_join_request: true 
        });
        
        res.json({ success: true, invite_link: link.invite_link });
    } catch (err) {
        console.log(`❌ LINK ERROR FOR [${target}]: ${err.message}`);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.get("/", (req, res) => res.send("Bot Monitoring System is Active."));
app.listen(PORT, '0.0.0.0', () => console.log(`📡 Backend Active on ${PORT}`));