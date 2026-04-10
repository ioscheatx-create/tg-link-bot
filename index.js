import express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// Railway uses port 8080 by default
const PORT = process.env.PORT || 8080;

// Initialize the bot with your Token from Railway Variables
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

// Log errors to Railway dashboard so we can see issues
bot.on("polling_error", (err) => console.log("Telegram Polling Error:", err.message));

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Backend Server is live on port ${PORT}`);
});

// Health Check Page (Verify this at your Railway public URL)
app.get("/", (req, res) => {
  const hasToken = !!process.env.BOT_TOKEN;
  res.send(`
    <h2>Bot API Status: ONLINE</h2>
    <p>Bot Token Configured: <b>${hasToken ? "YES ✅" : "NO ❌"}</b></p>
    <p>Multiple Channel Routing: <b>ACTIVE ✅</b></p>
  `);
});

// The main endpoint your website talks to
app.post("/getlink", async (req, res) => {
  const { channelId, userId } = req.body;
  
  // Use the ID sent from the website, or fallback to the main variable
  const targetChannel = channelId || process.env.GROUP_ID;

  console.log(`DEBUG: Link request for Channel: [${targetChannel}] from User: [${userId}]`);

  if (!targetChannel || !targetChannel.toString().startsWith('-')) {
    return res.status(400).json({ 
      success: false, 
      error: Invalid Channel ID Format: ${targetChannel}. IDs must start with -100 
    });
  }

  try {
    // METHOD 1: Try with a 1-person limit (High Security)
    const link = await bot.createChatInviteLink(targetChannel, {
      expire_date: Math.floor(Date.now() / 1000) + 600, // Link lasts 10 mins
      member_limit: 1 // Single use link
    });
    
    console.log(`✅ Successfully created secure link for ${targetChannel}`);
    res.json({ success: true, invite_link: link.invite_link });

  } catch (err) {
    console.log(`⚠️ Method 1 failed for ${targetChannel}: ${err.message}. Retrying...`);
    
    // METHOD 2: FALLBACK (Try without member limit)
    // Some Broadcast Channels do not support the member_limit setting
    try {
      const fallbackLink = await bot.createChatInviteLink(targetChannel, {
        expire_date: Math.floor(Date.now() / 1000) + 600
      });
      
      console.log(`✅ Successfully created fallback link for ${targetChannel}`);
      res.json({ success: true, invite_link: fallbackLink.invite_link });

    } catch (finalErr) {
      console.log(`❌ Final Error for ${targetChannel}: ${finalErr.message}`);
      res.status(500).json({ 
        success: false, 
        error: "Telegram Error: " + finalErr.message 
      });
    }
  }
});