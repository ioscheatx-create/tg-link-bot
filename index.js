import express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

app.listen(PORT, '0.0.0.0', () => console.log(`✅ Server live on ${PORT}`));

app.get("/", (req, res) => res.send("Bot API is Online and ready for 8 channels."));

app.post("/getlink", async (req, res) => {
  const { channelId } = req.body;
  const targetChannel = channelId || process.env.GROUP_ID;

  if (!targetChannel || !targetChannel.toString().startsWith('-')) {
    return res.status(400).json({ success: false, error: "Invalid Channel ID Format" });
  }

  try {
    // METHOD 1: Try with a 1-person limit (High Security)
    const link = await bot.createChatInviteLink(targetChannel, {
      expire_date: Math.floor(Date.now() / 1000) + 600,
      member_limit: 1
    });
    res.json({ success: true, invite_link: link.invite_link });
  } catch (err) {
    // METHOD 2: FALLBACK (If Method 1 fails, try a standard link to stop the error)
    try {
      const link = await bot.createChatInviteLink(targetChannel, {
        expire_date: Math.floor(Date.now() / 1000) + 600
      });
      res.json({ success: true, invite_link: link.invite_link });
    } catch (finalErr) {
      res.status(500).json({ success: false, error: finalErr.message });
    }
  }
});