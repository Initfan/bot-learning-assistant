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

		if (text === "/start")
			sendMessage(chatId, "Hello, What language do you want to learn?");
	}

	res.sendStatus(200);
});

app.get("/setWebhook", (req, res) => {
	console.log(res.params);
	setWebhook(req.params.url);
	res.send("Webhook info endpoint");
});

app.listen(3000, () => console.log("server running"));
