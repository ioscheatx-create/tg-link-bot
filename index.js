import express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

const app = express();

// Enable CORS for your website
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type']
}));

app.use(express.json());

const PORT = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN;

// Initialize Bot
let bot;
if (token) {
    bot = new TelegramBot(token, { polling: true });
    bot.on("polling_error", (err) => console.log("Bot Error:", err.message));
}

app.listen(PORT, '0.0.0.0', () => {
    console.log("✅ Server successfully started on port " + PORT);
});

app.get("/", (req, res) => {
    res.send("<h2>Bot API Status: ONLINE</h2>");
});

app.post("/getlink", async (req, res) => {
    if (!bot) {
        return res.status(500).json({ success: false, error: "Bot not initialized." });
    }

    const { channelId } = req.body;
    const targetChannel = channelId || process.env.GROUP_ID;

    // Safety check for Channel ID format
    if (!targetChannel || !targetChannel.toString().startsWith('-')) {
        return res.status(400).json({ 
            success: false, 
            error: "Invalid Channel ID format. It must start with -100" 
        });
    }

    try {
        // Method 1: Try with 1-person limit
        const link = await bot.createChatInviteLink(targetChannel, {
            expire_date: Math.floor(Date.now() / 1000) + 600,
            member_limit: 1
        });
        res.json({ success: true, invite_link: link.invite_link });

    } catch (err) {
        // Method 2: Fallback (Retry without member_limit)
        try {
            const fallbackLink = await bot.createChatInviteLink(targetChannel, {
                expire_date: Math.floor(Date.now() / 1000) + 600
            });
            res.json({ success: true, invite_link: fallbackLink.invite_link });
        } catch (finalErr) {
            res.status(500).json({ success: false, error: finalErr.message });
        }
    }
});