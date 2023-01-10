import Discord, { ColorResolvable, TextChannel } from "discord.js";
import { client } from "../../index";

// TODO: add reaction collector
export async function sendMessages(channelID: string) {
	const letters: { [letter: string]: string } = {
		"A": "🇦",
		"B": "🇧",
		"C": "🇨",
		"D": "🇩",
		"E": "🇪",
		"F": "🇫",
		"G": "🇬",
		"H": "🇭",
		"I": "🇮"
	};
	const klasy = ["H", "H", "G", "I"];
	const klasyName = ["Pierwsze", "Drugie", "Trzecie", "Czwarte"]
	const colors = ["#E09F7D", "#EF5D60", "#EC4067", "#A01A7D"];

	const channel = client.channels.cache.get(channelID) as TextChannel;

	let index = 1;
	for (const max of klasy) {
		let desc = "Kliknij odpowiednią reakcję, żeby dostać rolę swojej klasy\n\n";
		for (let letter = "A"; letter <= max; letter = String.fromCharCode(letter.charCodeAt(0) + 1)) {
			if (index == 4 && letter == "H") // remove next year
				continue;

			desc += `${letters[letter]} - ${index}${letter}\n`;
		}

		const embed = new Discord.MessageEmbed()
			.setTitle(`Klasy ${klasyName[index - 1]}`)
			.setColor(colors[index - 1] as ColorResolvable)
			.setDescription(desc);

		const message = await channel.send({ embeds: [embed] });
		for (let letter = "A"; letter <= max; letter = String.fromCharCode(letter.charCodeAt(0) + 1)) {
			if (index == 4 && letter == "H") // remove next year
				continue;

			await message.react(letters[letter]);
		}

		index++;
	}
}

export async function editMessage(channelID: string, msgID: string) {
	console.log(`Editing message ${msgID} in channel ${channelID}`);
	const letters: { [letter: string]: string } = {
		"A": "🇦",
		"B": "🇧",
		"C": "🇨",
		"D": "🇩",
		"E": "🇪",
		"F": "🇫",
		"G": "🇬",
		"H": "🇭",
		"I": "🇮"
	};

	let desc = "Kliknij odpowiednią reakcję, żeby dostać rolę swojej klasy\n\n";
	for (let letter = "A"; letter <= "I"; letter = String.fromCharCode(letter.charCodeAt(0) + 1)) {
		if (letter != "H") 
			desc += `${letters[letter]} - 1${letter}\n`;
	}

	const embed = new Discord.MessageEmbed()
		.setTitle(`Klasy Pierwsze`)
		.setColor("#E09F7D")
		.setDescription(desc);

	const channel = client.channels.cache.get(channelID) as TextChannel;
	const message = await channel.messages.fetch(msgID);
	await message.edit({ content: " ", embeds: [embed] });
}

export async function addReaction(channelID: string, msgID: string) {
	const channel = client.channels.cache.get(channelID) as TextChannel;
	const message = await channel.messages.fetch(msgID);
	await message.react("🇮");
}