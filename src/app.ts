import e from "express";
import TelegramBot, { SendMessageOptions } from "node-telegram-bot-api";
import * as dotenv from "dotenv";
import { GenerateContentConfig, GoogleGenAI } from "@google/genai";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

type LanguageLearn = {
	language: "japanese" | "korean" | "chinese" | "english" | "spanish" | null;
	topic: "conversation" | "grammar" | "vocabulary" | null;
};

const learningOptions: LanguageLearn = {
	language: null,
	topic: null,
};

const config: GenerateContentConfig = {
	systemInstruction: `You are a language learning assistant. You help users learn ${learningOptions.language} on the topic of ${learningOptions.topic}.
		if the user topic is conversation, generate a question in ${learningOptions.language} with romaji and English translation. explain each word in the question.
		the respond should be in the format: 

		${learningOptions.language} conversation:

		${learningOptions.language}: <question in ${learningOptions.language}>
		Romaji: <romaji version of the question>
		English: <English translation of the question>

		Explanation:
		explain each word in the question in a separate line.
		`,
	thinkingConfig: {
		thinkingBudget: 0,
	},
};

bot.on("message", async (msg) => {
	if (msg.text.startsWith("/")) return;

	if (!learningOptions.language)
		return bot.sendMessage(
			msg.chat.id,
			"Please select a language to learn using /learn command."
		);

	if (!learningOptions.topic)
		return bot.sendMessage(
			msg.chat.id,
			`You are learning ${learningOptions.language}. Please select a topic.`
		);

	bot.sendChatAction(msg.chat.id, "typing");

	const response = await ai.models.generateContent({
		contents: msg.text,
		model: "gemini-2.5-flash",
		config,
	});

	bot.sendMessage(msg.chat.id, response.text);
});

bot.onText(/\/cancel/, (msg) => {
	learningOptions.language = null;
	learningOptions.topic = null;
	bot.sendMessage(
		msg.chat.id,
		"Learning session cancelled. /learn to start again."
	);
});

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

bot.on("callback_query", async (query) => {
	const chatId = query.message.chat.id;

	if (query.data.startsWith("learn")) {
		learningOptions.language = query.data.replace(
			"learn_",
			""
		) as LanguageLearn["language"];
		let responseMessage: { text: string } & SendMessageOptions;

		switch (query.data) {
			case "learn_japanese":
				responseMessage = {
					text:
						"<b>You selected Japanese. Let's start learning!</b>\n" +
						"<i>Choose the topic you want:</i>\n\n" +
						"1. Conversation\n" +
						"2. Grammar\n" +
						"3. Vocalbulary\n",
					reply_markup: {
						inline_keyboard: [
							[
								{
									text: "1",
									callback_data: "topic_conversation",
								},
								{
									text: "2",
									callback_data: "topic_grammar",
								},
								{
									text: "3",
									callback_data: "topic_vocabulary",
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
	} else if (query.data.startsWith("topic")) {
		if (!learningOptions.language)
			return bot.sendMessage(
				chatId,
				"Please select a language using /learn command."
			);

		learningOptions.topic = query.data.replace(
			"topic_",
			""
		) as LanguageLearn["topic"];
		bot.sendChatAction(chatId, "typing");
		await new Promise((resolve) => setTimeout(resolve, 3000));
		const response = await ai.models.generateContent({
			contents:
				"Generate one question in Japanese with romaji and English translation",
			model: "gemini-2.5-flash",
			config,
		});
		bot.sendMessage(
			chatId,
			`${response.text}\n\nYou can reply the bot with english, romaji or ${learningOptions.language} to continue the conversation.`
		);
	}
});

const app = e();
const port = 3000;

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
