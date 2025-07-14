import e from "express";
import TelegramBot from "node-telegram-bot-api";
import * as dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.on("message", (msg) => {
	bot.sendMessage(msg.chat.id, "Hello!");
});

const app = e();
const port = 3000;

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
