import express from "express";
import TelegramBot from "node-telegram-bot-api";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const token = process.env.BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

bot.on("chat_member", async (update) => {
    const newMember = update.new_chat_member;
    const oldMember = update.old_chat_member;
    const currentChatId = update.chat.id;

    if (newMember.status === "member" && (oldMember.status === "left" || oldMember.status === "kicked")) {
        const userId = newMember.user.id;
        
        const welcomeText = 𝐖𝐄𝐋𝐂𝐎𝐌𝐄 𝐓𝐎 𝐏𝐑𝐎𝐍 𝐇𝐔𝐏 💦, 𝐘𝐎𝐔 𝐖𝐈𝐋𝐋 𝐁𝐄 𝐑𝐄𝐌𝐎𝐕𝐄𝐃 𝐅𝐑𝐎𝐌 𝐓𝐇𝐄 𝐆𝐑𝐎𝐔𝐏 𝐀𝐅𝐓𝐄𝐑 𝟓 𝐌𝐈𝐍𝐒 , 𝐖𝐄 𝐈𝐌𝐏𝐋𝐄𝐌𝐄𝐍𝐓𝐄𝐃 𝐓𝐇𝐈𝐒 𝐓𝐎 𝐀𝐕𝐎𝐈𝐃 𝐆𝐑𝐎𝐔𝐏 𝐁𝐀𝐍 ✨, 𝐔 𝐂𝐀𝐍 𝐀𝐂𝐂𝐄𝐒𝐒 𝐓𝐇𝐄 𝐂𝐇𝐀𝐍𝐍𝐄𝐋 𝐀𝐆𝐀𝐈𝐍 𝐉𝐔𝐒𝐓 𝐁𝐘 𝐖𝐀𝐓𝐂𝐇𝐈𝐍𝐆 𝐎𝐍𝐄 𝐀𝐃𝐒💫;
        
        try {
            // Send the message and save the message info
            const sentMsg = await bot.sendMessage(currentChatId, welcomeText);
            console.log(`LOG: Welcome sent to ${userId}`);

            // SCHEDULE BOTH: REMOVAL AND MESSAGE DELETION (5 MINUTES)
            setTimeout(async () => {
                try {
                    // 1. Remove the user
                    await bot.banChatMember(currentChatId, userId);
                    await bot.unbanChatMember(currentChatId, userId);
                    
                    // 2. Delete the welcome message
                    await bot.deleteMessage(currentChatId, sentMsg.message_id);
                    
                    console.log(`✅ User ${userId} and their welcome message removed.`);
                } catch (e) {
                    console.log("❌ Cleanup Failed: " + e.message);
                }
            }, 5 * 60 * 1000); 

        } catch (e) {
            console.log("❌ Error: " + e.message);
        }
    }
});

app.listen(PORT, '0.0.0.0', () => console.log("Server live on " + PORT));

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
        } catch (finalErr) {
            res.status(400).json({ success: false, error: finalErr.message });
        }
    }
});