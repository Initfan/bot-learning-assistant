import e from "express";
import bodyParser from "body-parser";
import { sendMessage, setWebhook } from "./utils.js";

const app = e();

app.use(bodyParser.json());

app.post("", (req, res) => {
	const update = req.body;

	console.log("Received Telegram update:", update);

	if (update.message && update.message.text) {
		const chatId = update.message.chat.id;
		const text = update.message.text;

		switch (text) {
			case "/start":
				sendMessage(
					chatId,
					"Hello, I'm Giru Your language assistant, what can i help?\n/help to see commands"
				);
				break;
			case "/help":
				sendMessage(
					chatId,
					`<b>Giru</b> bot commands list
					<b>/start</b> &#8594; <i>start chat with giru bot</i>
					<b>/help</b> &#8594; <i>List of available command</i>
					<b>/learn</b> &#8594; <i>learn a languages</i>`
				);
			case "/learn":
				sendMessage(chatId, `What langugaes do you want to learn?`);
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
