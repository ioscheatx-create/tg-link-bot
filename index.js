iimport express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN;

const bot = new TelegramBot(token, { 
    polling: {
        params: {
            allowed_updates: ["chat_member", "message", "channel_post", "my_chat_member"]
        }
    }
});

console.log("-----------------------------------------");
console.log("🛠️ STARTING DEEP DEBUG MODE...");
console.log("-----------------------------------------");

// 🟢 LOG: Confirm startup
bot.getMe().then(me => {
    console.log(`✅ BOT CONNECTED: @${me.username}`);
    console.log("👉 STEP 1: Send a PRIVATE message to the bot now.");
}).catch(err => console.log("❌ CONNECTION FAILED: " + err.message));

// 🟢 LOG: Catch ANY text message (Groups & Private)
bot.on("message", (msg) => {
    console.log(`📩 [MESSAGE RECEIVED]`);
    console.log(`   - Text: "${msg.text}"`);
    console.log(`   - From: ${msg.from.username} (ID: ${msg.from.id})`);
    console.log(`   - Chat ID: ${msg.chat.id}`);
    bot.sendMessage(msg.chat.id, "I heard you! Chat ID is: " + msg.chat.id);
});

// 🟢 LOG: Catch Channel Posts (If your 8 'Channels' are actually Broadcast Channels)
bot.on("channel_post", (msg) => {
    console.log(`📣 [CHANNEL POST RECEIVED]`);
    console.log(`   - Text: "${msg.text}"`);
    console.log(`   - Chat ID: ${msg.chat.id}`);
});

// 🟢 LOG: Catch Member Joins
bot.on("chat_member", (update) => {
    console.log(`👤 [MEMBER UPDATE]`);
    console.log(`   - User: ${update.new_chat_member.user.id}`);
    console.log(`   - Status: ${update.new_chat_member.status}`);
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server on port ${PORT}`));