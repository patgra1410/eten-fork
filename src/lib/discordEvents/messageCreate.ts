import { Message } from "discord.js";

import * as jajco from "../jajco";
import { hashFile, hashFileFromMessageContent } from "../hashFile";
import archiwum from "../archiwum";
import config from "../../config.json";
import fs from "fs";
import { IRanking, repeatingDigitsText } from "../types";
import path from "path";

export default async function(message: Message) {
	// if (message.guildId == "922800899598974988")
	// 	return;
	const client = message.client;

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
		if (repeatingDigits >= 6) {
			message.react("<:checkem:966379892474249246>")
				.catch(error => console.log(error));
			message.reply({ content: `@everyone WITNESSED (ID: ${message.id.substring(0, message.id.length - repeatingDigits)}**${message.id.substring(message.id.length - repeatingDigits)}**)`, files: ["https://www.vogue.pl/uploads/repository/nina_p/ap.jpg"], failIfNotExists: false });
		}
		else if (repeatingDigits >= 2) {
			message.react("<:checkem:966379892474249246>")
				.then(() => {
					message.react(repeatingDigitsText[repeatingDigits])
						.catch(error => console.log(error));
				})
				.catch(error => console.log(error));
		}
	}

	if (message.content.toLowerCase() == "h") {
		message.channel.send(`
██╗░░██╗
██║░░██║
███████║
██╔══██║
██║░░██║
╚═╝░░╚═╝`);
	}
	if (message.content.toLowerCase() == "n") {
		message.channel.send(`
███╗░░██╗
████╗░██║
██╔██╗██║
██║╚████║
██║░╚███║
╚═╝░░╚══╝`);
	}

	if (message.content.toLowerCase() == "czym do chuja są te cyferki?" || message.content.toLowerCase() == "czym do chuja są te numerki?") {
		message.reply(`Każda wiadomość ma ID, i jeśli kilka ostatnich cyfr ID twojej wiadomości jest taka sama to eten reaguje odpowiednią liczbą.
Na przykład 3️⃣ oznacza że ID twojej wiadomości miało takie same 3 ostatnie cyfry (na przykład 968227852342411**333**).
Jak jest zbudowane ID wiadomości:
https://cdn.discordapp.com/attachments/856926964094337047/968536776484487218/unknown.png`);
	}

	if (message.author.bot) return;
	if (!client.application?.owner) await client.application?.fetch();

	if (message.channel.id === "813703962838564865") {
		try {
			await message.react("<:among_us:754362953104359747>")
				.catch(error => console.log(error));
		}
		catch (error) {
			console.error("Failed to react in #amogus channel");
		}
	}

	if (message.channel.id === "854294979849748510") {
		try {
			await message.react("❤")
				.catch(error => console.log(error));
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

	let reddit = false;
	const redditFilenameRegex = /((?![0-9]{13})(?![a-z]{13})[a-z0-9]{13})/g;

	// Nie potrzebny await mam nadzieję
	archiwum(message);

	await message.fetch();
	// console.log(message)
	if (message.attachments.size > 0) {
		for (const [id, attachment] of message.attachments) {
			if (attachment.contentType?.startsWith("video") || attachment.contentType?.startsWith("image"))
				await hashFile(attachment.url, message);
			if (attachment.name.toLowerCase().match("reddit") || redditFilenameRegex.test(attachment.name))
				reddit = true;
		}
	}

	/* if (message.embeds.length > 0) {
		for (const embed of message.embeds) {
			if (embed.type == 'video' || embed.type == 'image')
				await hashFile.hashFile(embed, message)
		}
	} else */
	if (message.content.toLowerCase().match("reddit")) {
		reddit = true;
	}
	if ((/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*).(webm|mp4|mov|avi|flv|mkv|wmv|m4v|png|jpg|gif|jpeg|webp|svg|ovg|ogg)\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/g.test(message.content))) {
		// const fileName = path.basename(new URL(message.content).pathname);
		// if (redditFilenameRegex.test(fileName)) {
		// 	reddit = true;
		// }
		await hashFileFromMessageContent(message);
	}
	// wkurwiajace w chuj

	// if (reddit) {
	// 	message.reply({ content: "https://cdn.discordapp.com/attachments/788126323180044339/980463018800459866/Ew_You_Must_Be_From_Reddit_pl7RIIHK9EE.mp4" });
	// }
}
