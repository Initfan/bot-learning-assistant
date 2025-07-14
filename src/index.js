import e from "express";
import bodyParser from "body-parser";
import { sendMessage, setWebhook } from "./utils.js";

const app = e();

app.use(bodyParser.json());

app.post("", async (req, res) => {
	const update = req.body;

	if (update.message && update.message.text) {
		const chatId = update.message.chat.id;
		const text = update.message.text;

		switch (text) {
			case "/start":
				sendMessage({
					chatId,
					text: "Hello, I'm Giru Your language assistant, what can i help?\n/help to see commands",
				});
				break;
			case "/help":
				sendMessage({
					chatId,
					text: `<b>Giru</b> bot commands list
					<b>/start</b> &#8594; <i>start chat with giru bot</i>
					<b>/help</b> &#8594; <i>List of available command</i>
					<b>/learn</b> &#8594; <i>learn a languages</i>`,
				});
				break;
			case "/learn":
				const res = await sendMessage({
					chatId,
					text: `What languages do you want to learn? \n1. Japanese\n2. Korean\n3. Chinese\n4. English\n5. Spanish`,
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
				});
				console.log(res);
				break;
			default:
				sendMessage(chatId, `Type /help to see available commands`);
		}
	}

	res.sendStatus(200);
});

app.get("/setWebhook", (req, res) => {
	if (!req.query.url) {
		return res.status(400).send("URL parameter is required");
	}
	setWebhook(req.query.url)
		.then(() => {
			console.log("Webhook set successfully");
		})
		.catch((error) => {
			console.error("Error setting webhook:", error);
			return res.status(500).send("Error setting webhook");
		});
});

app.listen(3000, () => console.log("server running"));
