// main.ts
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import TelegramBot from "npm:node-telegram-bot-api";
import { GoogleGenAI, GenerateContentConfig, Content } from "npm:@google/genai";
import { config as loadEnv } from "https://deno.land/std@0.224.0/dotenv/mod.ts";

await loadEnv({ export: true });

const BOT_TOKEN = Deno.env.get("BOT_TOKEN")!;
const GEMINI_KEY = Deno.env.get("GEMINI_KEY")!;
const WEBHOOK_URL = Deno.env.get("WEBHOOK_URL")!;

const bot = new TelegramBot(BOT_TOKEN);
bot.setWebHook(`${WEBHOOK_URL}/bot${BOT_TOKEN}`);

// === Google Gemini Setup ===
const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

type LanguageLearn = {
  language: "japanese" | "korean" | "chinese";
  topic: "conversation" | "grammar" | "vocabulary" | null;
  learningHistory: Content[];
};

const learningOptions: LanguageLearn = {
  language: null,
  topic: null,
  learningHistory: [],
};

// === Config for Gemini ===
const config: GenerateContentConfig = {
  systemInstruction: `You are a language learning assistant. You help users learn ${learningOptions.language} on the topic of ${learningOptions.topic}.

  If the topic is "conversation", generate a question with pronunciation and English translation, and explain each word.
  
  If the topic is "vocabulary", generate 10 words with pronunciation and meanings.

  Format your response clearly.`,
  thinkingConfig: {
    thinkingBudget: 0,
  },
};

// === Telegram Bot Commands ===
bot.setMyCommands([
  { command: "/start", description: "Start the bot" },
  { command: "/help", description: "Help info" },
  { command: "/learn", description: "Start learning" },
  { command: "/cancel", description: "Cancel session" },
]);

// === Bot Command Handlers ===

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, "👋 Hello! I'm Giru, your language assistant. Type /learn to begin!");
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, `
<b>Commands:</b>
/start – Start the bot
/help – Show help
/learn – Begin learning
/cancel – Stop session
`, { parse_mode: "HTML" });
});

bot.onText(/\/cancel/, (msg) => {
  learningOptions.language = null;
  learningOptions.topic = null;
  learningOptions.learningHistory = [];
  bot.sendMessage(msg.chat.id, "Session canceled. Type /learn to restart.");
});

bot.onText(/\/learn/, (msg) => {
  bot.sendMessage(msg.chat.id, "Choose a language:", {
    reply_markup: {
      inline_keyboard: [[
        { text: "Japanese", callback_data: "learn_japanese" },
        { text: "Korean", callback_data: "learn_korean" },
        { text: "Chinese", callback_data: "learn_chinese" },
      ]],
    },
  });
});

bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data.startsWith("learn_")) {
    learningOptions.language = data.replace("learn_", "") as LanguageLearn["language"];
    bot.sendMessage(chatId, `Great! What do you want to learn in ${learningOptions.language}?`, {
      reply_markup: {
        inline_keyboard: [[
          { text: "Conversation", callback_data: "topic_conversation" },
          { text: "Vocabulary", callback_data: "topic_vocabulary" },
        ]],
      },
    });
  } else if (data.startsWith("topic_")) {
    if (!learningOptions.language) {
      return bot.sendMessage(chatId, "Please choose a language first with /learn.");
    }

    learningOptions.topic = data.replace("topic_", "") as LanguageLearn["topic"];
    const inputPrompt = `learn ${learningOptions.language} ${learningOptions.topic}`;
    const response = await ai.models.generateContent({
      contents: inputPrompt,
      model: "gemini-2.5-flash",
      config,
    });

    learningOptions.learningHistory.push({
      role: "model",
      parts: [{ text: response.text }],
    });

    bot.sendMessage(chatId, response.text);
  }
});

bot.on("message", async (msg) => {
  if (!msg.text || msg.text.startsWith("/")) return;

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

// === Deno HTTP Webhook Handler ===
serve(async (req) => {
  const url = new URL(req.url);

  // Telegram webhook endpoint
  if (req.method === "POST" && url.pathname === `/bot${BOT_TOKEN}`) {
    const body = await req.json();
    bot.processUpdate(body);
    return new Response("OK", { status: 200 });
  }

  return new Response("👋 Giru is alive (Deno Deploy Webhook)", { status: 200 });
});
