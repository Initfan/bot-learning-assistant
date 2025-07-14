import e from "express";
import TelegramBot from "node-telegram-bot-api";
import * as dotenv from "dotenv";
import { Content, GenerateContentConfig, GoogleGenAI } from "@google/genai";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

type LanguageLearn = {
	language: "japanese" | "korean" | "chinese" | "arabic" | "hindi" | null;
	topic: "conversation" | "grammar" | "vocabulary" | null;
	learningHistory: Content[];
};

const learningOptions: LanguageLearn = {
	language: "japanese",
	topic: null,
	learningHistory: [],
};

bot.setMyCommands([
	{
		command: "/start",
		description: "Starts the bot and shows a welcome message.",
	},
	{
		command: "/help",
		description: "Shows all the commands and how to use the bot.",
	},
	{
		command: "/learn",
		description: "Begins a fun and interactive learning session.",
	},
	{
		command: "/cancel",
		description: "Ends the current session if you want to take a break.",
	},
]);

const config: GenerateContentConfig = {
	systemInstruction: `You are a language learning assistant. You help users learn ${learningOptions.language} on the topic of ${learningOptions.topic}.

		if the user topic is conversation, generate a question in ${learningOptions.language} with romaji and English translation. explain each word in the question.
		the respond should be in the format: 

		${learningOptions.language} conversation:

		${learningOptions.language}: <question in ${learningOptions.language}>
		Pronunciation: <Pronunciation version of the question>
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

	const chat = ai.chats.create({
		model: "gemini-2.5-flash",
		history: learningOptions.learningHistory,
		config,
	});

	const response = await chat.sendMessage({ message: msg.text });
	learningOptions.learningHistory.push(
		{ role: "user", parts: [{ text: msg.text }] },
		{ role: "model", parts: [{ text: response.text }] }
	);

	bot.sendMessage(msg.chat.id, response.text);
});

bot.onText(/\/cancel/, (msg) => {
	learningOptions.language = null;
	learningOptions.topic = null;
	learningOptions.learningHistory = [];
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
		`Hello ${msg.from.username} 👋, Let's start learning 📚 \nSelect the topic you want:\n\n` +
			"1. Conversation\n" +
			"2. Grammar\n" +
			"3. Vocalbulary\n",
		{
			parse_mode: "HTML",
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
		}
	);
});

bot.onText(/\/help/, (msg) => {
	bot.sendMessage(
		msg.chat.id,
		`<b>🤖 Welcome to the Learning Bot!</b>\!\n` +
			"Ready to learn something new? Here’s what you can do:\n\n" +
			"<b>/start</b> – ✨ <i>Let’s begin!</i>\n" +
			"Starts the bot and gives you a welcome message. You'll see options to choose your topic and level.\n\n" +
			"<b>/help</b> – ❓ <i>Need some help?</i>\n" +
			"Shows you how to use the bot, all available commands, and how to get started with learning.\n\n" +
			"<b>/learn</b> – 📚 <i>Start learning now</i>\n" +
			"Begin an interactive learning session.\n\n" +
			"<b>/cancel</b> – 🛑 <i>Take a break</i>\n" +
			"Stops the current session anytime. You can start again whenever you're ready.",
		{
			parse_mode: "HTML",
		}
	);
});

bot.on("callback_query", async (query) => {
	const chatId = query.message.chat.id;

	if (query.data.startsWith("topic")) {
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

		const response = await ai.models.generateContent({
			contents: `Generate one question in ${learningOptions.language} with romaji and English translation`,
			model: "gemini-2.5-flash",
			config,
		});

		learningOptions.learningHistory.push({
			role: "model",
			parts: [{ text: response.text }],
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
