import { Message } from "discord.js";

import * as jajco from "../jajco";
import { hashFile, hashFileFromMessageContent } from "../hashFile";
import archiwum from "../archiwum";
import config from "../../config.json";
import fs from "fs";
import { IRanking, repeatingDigitsText } from "../types";

export default async function(message: Message) {
	const client = message.client;

	if (message.author.bot) return;
	if (!client.application?.owner) await client.application?.fetch();

	let repeatingDigits = 1;
	for (let i = message.id.length - 2; i >= 0; i--) {
		if (message.id[i] === message.id[i + 1]) {
			repeatingDigits++;
		}
		else {
			break;
		}
	}
	const ranking: IRanking = JSON.parse(fs.readFileSync("./data/ranking.json", "utf-8"));
	if (!(message.author.id in ranking.dubs))
		ranking.dubs[message.author.id] = {};
	if (!(repeatingDigits in ranking.dubs[message.author.id])) {
		ranking.dubs[message.author.id][repeatingDigits] = 0;
	}
	ranking.dubs[message.author.id][repeatingDigits]++;
	fs.writeFileSync("./data/ranking.json", JSON.stringify(ranking), "utf-8");
	if (repeatingDigits >= 2) {
		if (repeatingDigits >= 10) {
			message.react("⚜");
			message.reply({ content: `@everyone WITNESSED (ID: ${message.id.substring(0, message.id.length - repeatingDigits)}**${message.id.substring(message.id.length - repeatingDigits)}**)`, files: ["https://www.vogue.pl/uploads/repository/nina_p/ap.jpg"] });
		}
		else if (repeatingDigits >= 3) {
			message.react(repeatingDigitsText[repeatingDigits]);
		}
	}

	if (message.channel.id === "813703962838564865") {
		try {
			await message.react("<:among_us:754362953104359747>");
		}
		catch (error) {
			console.error("Failed to react in #amogus channel");
		}
	}

	if (message.channel.id === "854294979849748510") {
		try {
			await message.react("❤");
		}
		catch (error) {
			console.error("Failed to react in #bardzo-wazny-kanal");
		}
	}

	// TODO: ===
	if (message.content.length == 4)
		await client.commands.get("kwadraty").onMessage(message);


	if (message.content.startsWith(config.prefix)) {
		const args = message.content.slice(config.prefix.length).trim().split(/ +/);
		const command = args.shift().toLowerCase();

		if (!client.commands.has(command)) return;

		message.reply("Deprecated. Jebać (wszystkie) nie slashowe komendy");
		return;
	}

	jajco.run(message);

	if (message.content.toLowerCase().search("rozpierdol kota") != -1)
		client.commands.get("cursedkoteł").execute(message);


	if (/https?:\/\/media.discordapp.net\/attachments\/[0-9]+\/[0-9]+\/[^ ^\n\t\r]+\.(webm|mp4|mov|avi|flv|mkv|wmv|m4v)/g.test(message.content)) {
		const foundMediaLinks = message.content.match(/https?:\/\/media.discordapp.net\/attachments\/[0-9]+\/[0-9]+\/[^ ^\n\t\r]+\.(webm|mp4|mov|avi|flv|mkv|wmv|m4v)/g);
		for (const mediaLink of foundMediaLinks)
			message.reply(`${mediaLink.replace(/media/, "cdn").replace(/net/, "com")}\nFucking goofy ass media link`);
	}

	// Nie potrzebny await mam nadzieję
	archiwum(message);

	await message.fetch();
	// console.log(message)
	if (message.attachments.size > 0) {
		for (const [id, attachment] of message.attachments) {
			if (attachment.contentType.startsWith("video") || attachment.contentType.startsWith("image"))
				await hashFile(attachment.url, message);
		}
	}

	/* if (message.embeds.length > 0) {
		for (const embed of message.embeds) {
			if (embed.type == 'video' || embed.type == 'image')
				await hashFile.hashFile(embed, message)
		}
	} else */ if ((/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*).(webm|mp4|mov|avi|flv|mkv|wmv|m4v|png|jpg|gif|jpeg|webp|svg|ovg|ogg)\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g.test(message.content)))
		await hashFileFromMessageContent(message);
}
