import e, { response } from "express";
import TelegramBot, { SendMessageOptions } from "node-telegram-bot-api";
import * as dotenv from "dotenv";
dotenv.config();

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => {
	bot.sendMessage(
		msg.chat.id,
		"Hello, I'm Giru Your language assistant, what can i help?\n/help to see commands"
	);
});

bot.onText(/\/learn/, (msg) => {
	bot.sendMessage(
		msg.chat.id,
		"What languages do you want to learn? \n1. Japanese\n2. Korean\n3. Chinese\n4. English\n5. Spanish",
		{
			reply_markup: {
				inline_keyboard: [
					[
						{
							text: "1",
							callback_data: "learn_japanese",
						},
						{
							text: "2",
							callback_data: "learn_korean",
						},
						{
							text: "3",
							callback_data: "learn_chinese",
						},
					],
					[
						{
							text: "4",
							callback_data: "learn_english",
						},
						{
							text: "5",
							callback_data: "learn_spanish",
						},
					],
				],
			},
		}
	);
});

bot.onText(/\/help/, (msg) => {
	bot.sendMessage(
		msg.chat.id,
		`<b>Giru</b> bot commands list
		<b>/start</b> &#8594; <i>start chat with giru bot</i>
		<b>/help</b> &#8594; <i>List of available command</i>
		<b>/learn</b> &#8594; <i>learn a languages</i>`,
		{
			parse_mode: "HTML",
		}
	);
});

bot.on("callback_query", (query) => {
	console.log(query);
	const chatId = query.message.chat.id;

	if (query.data.startsWith("learn")) {
		let responseMessage: { text: string } & SendMessageOptions;

		switch (query.data) {
			case "learn_japanese":
				responseMessage = {
					text:
						"<b>You selected Japanese. Let's start learning!</b>\n" +
						"<i>Choose the topic you want:</i>\n\n" +
						"1. Conversation\n",
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: "1",
									callback_data: "conversation",
								},
							],
						],
					},
				};
				break;
			default:
				responseMessage = {
					text: "Unknown selection. Please try again.",
				};
		}

		bot.sendMessage(chatId, responseMessage.text, {
			...responseMessage,
			parse_mode: "HTML",
		});
	}
});

const app = e();
const port = 3000;

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
