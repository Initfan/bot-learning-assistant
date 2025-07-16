import e from "express";
import TelegramBot from "node-telegram-bot-api";
import * as dotenv from "dotenv";
import { Content, GenerateContentConfig, GoogleGenAI } from "@google/genai";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type LanguageLearn = {
	language: "japanese" | "korea" | "chinese";
	topic: "conversation" | "grammar" | "vocabulary" | null;
	learningHistory: Content[];
};

const learningOptions: LanguageLearn = {
	language: null,
	topic: null,
	learningHistory: [],
};

type grammar = {
	messageId: number;
	order: number;
};

const grammarContent: grammar = {
	messageId: null,
	order: 0,
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

		if the user topic is conversation, generate a question in ${learningOptions.language} with Pronunciation and english translation. explain each word in the question, send user information about the type of reply.
		the respond should be in the format: 

		${learningOptions.language} conversation:

		${learningOptions.language}: <question in ${learningOptions.language}>
		Pronunciation: <Pronunciation version of the question>
		Meaning: <English translation of the question>

		Explanation:
		explain each word in the question in a separate line.

		You can reply the bot with english or ${learningOptions.language} to continue the conversation.

		if the user topic is vocabulary, create 10 vocabulary data with ${learningOptions.language}, pronunciation and english, /more information.
		the respond should be in the format:

		${learningOptions.language} Vocabulary:

		<number>. <vocabulary in ${learningOptions.language}>
		pronunciation: <Pronunciation version of the vocabulary>
		meaning: <English translation of the question>

		/more for more vocabulary
		`,
	thinkingConfig: {
		thinkingBudget: 0,
	},
};

bot.on("message", async (msg) => {
	if (msg.text.startsWith("/") && !msg.text.startsWith("/more")) return;

	if (!learningOptions.topic)
		return bot.sendMessage(
			msg.chat.id,
			"Please select a topic to learn using /learn command."
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
		"Which language do you want to learn? \n1. Japanese\n2. Korean\n3. Chinese",
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

	if (query.data.startsWith("learn")) {
		learningOptions.language = query.data.replace(
			"learn_",
			""
		) as LanguageLearn["language"];

		bot.sendMessage(
			chatId,
			`Hello ${query.message.chat.username} 👋, Let's start learning ${learningOptions.language} 📚 \nSelect the topic you want:\n\n` +
				"1. Conversation\n" +
				"2. Grammar\n" +
				"3. Vocabulary\n",
			{
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

		if (learningOptions.topic == "grammar") {
			return fs.readFile(
				__dirname + "/japanese-grammar.txt",
				"utf-8",
				async (err, data) => {
					if (err) return;
					const message = await bot.sendMessage(
						chatId,
						"Here is a list of grammar-related lessons you need to learn.\n" +
							`<b>1/${data.split("next").length}</b>` +
							data.split("next")[0],
						{
							parse_mode: "HTML",
							reply_markup: {
								inline_keyboard: [
									[
										{
											text: "Prev",
											callback_data: "button_prev",
										},
										{
											text: "Learn",
											callback_data: "button_learn",
										},
										{
											text: "Next",
											callback_data: "button_next",
										},
									],
								],
							},
						}
					);
					grammarContent.messageId = message.message_id;
				}
			);
		}

		let content: string;
		switch (query.data.split("_")[1]) {
			case "conversation":
				content = `learn ${learningOptions.language} conversation`;
				break;
			case "vocabulary":
				content = `learn ${learningOptions.language} vocabulary`;
				break;
		}

		const response = await ai.models.generateContent({
			contents: content,
			model: "gemini-2.5-flash",
			config,
		});

		learningOptions.learningHistory.push({
			role: "model",
			parts: [{ text: response.text }],
		});

		bot.sendMessage(chatId, response.text);
	} else if (query.data.startsWith("button")) {
		if (!learningOptions.language)
			return bot.sendMessage(
				chatId,
				"Please select a language using /learn command."
			);

		fs.readFile(
			__dirname + "/japanese-grammar.txt",
			"utf-8",
			(err, data) => {
				query.data == "button_next" &&
				grammarContent.order < data.split("next").length - 1
					? grammarContent.order++
					: query.data == "button_prev" &&
					  grammarContent.order > 0 &&
					  grammarContent.order--;

				bot.editMessageText(
					"Here is a list of grammar-related lessons you need to learn.\n" +
						`<b>${grammarContent.order + 1}/${
							data.split("next").length
						}</b>` +
						data.split("next")[grammarContent.order],
					{
						chat_id: chatId,
						message_id: grammarContent.messageId,
						parse_mode: "HTML",
						reply_markup: {
							inline_keyboard: [
								[
									{
										text: "Prev",
										callback_data: "button_prev",
									},
									{
										text: "Learn",
										callback_data: "button_learn",
									},
									{
										text: "Next",
										callback_data: "button_next",
									},
								],
							],
						},
					}
				);
			}
		);
	}
});

const app = e();
const port = 3000;

app.listen(port, () => {
	console.log(`Server is running on http://localhost:${port}`);
});
