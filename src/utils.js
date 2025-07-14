const endpoint = `${process.env.ENDPOINT}${process.env.BOT_TOKEN}`;

export const setWebhook = async (url) => {
	const response = await fetch(
		`${endpoint}/setWebhook?url=${encodeURIComponent(url)}`
	);

	if (!response.ok) {
		throw Error(`Error setting webhook: ${response.statusText}`);
	}

	return response.json();
};

export const sendMessage = async ({
	chatId,
	text,
	reply_markup,
	parse_mode,
}) => {
	const response = await fetch(`${endpoint}/sendMessage`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			chat_id: chatId,
			text: text,
			parse_mode: parse_mode ?? "HTML",
			reply_markup,
		}),
	});

	if (!response.ok) {
		throw new Error(`Error sending message: ${response.statusText}`);
	}

	return response.json();
};
