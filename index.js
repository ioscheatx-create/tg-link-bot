import express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

app.listen(PORT, '0.0.0.0', () => {
    console.log("✅ Debug Server started on port " + PORT);
});

app.post("/getlink", async (req, res) => {
    const { channelId, userId } = req.body;
    const targetChannel = channelId || process.env.GROUP_ID;

    // This prints to your Railway "Deploy Logs"
    console.log("LOG: Attempting link for Channel ID: " + targetChannel);

    if (!targetChannel || !targetChannel.toString().startsWith('-')) {
        return res.status(400).json({ success: false, error: "Malformed ID: " + targetChannel });
    }

    try {
        const link = await bot.createChatInviteLink(targetChannel, {
            expire_date: Math.floor(Date.now() / 1000) + 600,
            member_limit: 1
        });
        res.json({ success: true, invite_link: link.invite_link });
    } catch (err) {
        console.log("LOG: Telegram rejected ID " + targetChannel + " - Error: " + err.message);
        
        // Fallback for broadcast channels
        try {
            const fallback = await bot.createChatInviteLink(targetChannel, {
                expire_date: Math.floor(Date.now() / 1000) + 600
            });
            res.json({ success: true, invite_link: fallback.invite_link });
        } catch (finalErr) {
            res.status(500).json({ success: false, error: finalErr.message });
        }
    }
});