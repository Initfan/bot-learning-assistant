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
