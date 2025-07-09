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

export const sendMessage = async (chatId, text) => {
	const response = await fetch(`${endpoint}/sendMessage`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			chat_id: chatId,
			text: text,
		}),
	});

	if (!response.ok) {
		throw new Error(`Error sending message: ${response.statusText}`);
	}

	return response.json();
};
