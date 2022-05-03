import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { QueryType } from "discord-player";
import Discord, { ColorResolvable, CommandInteraction, TextChannel } from "discord.js";
import fs from "fs";
import { player } from "../../index";
import { IMusicInfo, repeatingDigitsText } from "../../lib/types";

export const data = new SlashCommandBuilder()
	.setName("search")
	.setDescription("Wyszukaj piosenkę")
	.addStringOption(
		new SlashCommandStringOption()
			.setName("name")
			.setDescription("co wyszukać")
			.setRequired(true)
	);

export async function execute(interaction: CommandInteraction) {
	await interaction.deferReply();

	const guild = interaction.client.guilds.cache.get(interaction.guild.id);
	const user = guild.members.cache.get(interaction.user.id);

	if (!user.voice.channel) {
		interaction.editReply("Nie jesteś na VC");
		return;
	}

	const search = interaction.options.getString("name");
	const res = await player.search(search, {
		requestedBy: interaction.user.username,
		searchEngine: QueryType.AUTO
	});

	if (!res || !res.tracks.length) {
		interaction.editReply("Nic nie znaleziono");
		return;
	}

	// let queue = player.getQueue(interaction.guildId);
	// if (!queue)
	// 	queue = player.createQueue(interaction.guild, { metadata: true });

	const desc = "Masz 15 sekund na wybór\n\n";
	let songsDesc = "";
	let i = 1;
	for (const track of res.tracks) {
		songsDesc += `**${i}.** ${track.title} **|** ${track.author}\n`;
		i++;
		if (i == 11)
			break;
	}

	let embed = new Discord.MessageEmbed()
		.setColor(("#" + Math.floor(Math.random() * 16777215).toString(16)) as ColorResolvable)
		.setTitle("Wyniki wyszukiwania")
		.setDescription(desc + songsDesc)
		.setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() });

	const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
	const msg = await interaction.editReply({ embeds: [embed] });
	const message = (interaction.client.channels.cache.get(interaction.channelId) as TextChannel).messages.cache.get(msg.id);

	const musicInfo: IMusicInfo = JSON.parse(fs.readFileSync("./data/music.json", "utf-8"));
	if (!(interaction.guildId in musicInfo)) {
		musicInfo[interaction.guildId] = {
			volume: 100
		};

		fs.writeFileSync("./data/music.json", JSON.stringify(musicInfo));
	}

	for (let j = 1; j < i; j++)
		message.react(repeatingDigitsText[j]);

	const collector = message.createReactionCollector({
		time: 15000,
		filter: (reaction, reactionUser) => reactionUser.id === interaction.user.id && emojis.includes(reaction.emoji.name),
		max: 1
	});

	collector.on("collect", async (reaction, reactionUser) => {
		const number = emojis.indexOf(reaction.emoji.name);
		collector.stop();

		let queue = player.getQueue(interaction.guildId);
		if (!queue)
			queue = player.createQueue(interaction.guild, { metadata: true });

		try {
			if (!queue.connection)
				await queue.connect(user.voice.channel);
		}
		catch (error) {
			player.deleteQueue(interaction.guildId);
			interaction.editReply("Nie można dołączyć do VC");
			console.error(error);
			return;
		}

		queue.addTrack(res.tracks[number]);
		if (!queue.playing)
			(queue.play()).then(() => queue.setVolume(musicInfo[interaction.guildId].volume));

		embed = new Discord.MessageEmbed()
			.setColor(("#" + Math.floor(Math.random() * 16777215).toString(16)) as ColorResolvable)
			.setTitle(res.tracks[number].title)
			.setURL(res.tracks[number].url)
			.setDescription(`Dodano film do kolejki (${res.tracks[number].duration})`)
			.setImage(res.tracks[number].thumbnail)
			.setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() });

		message.reactions.removeAll();
		interaction.editReply({ embeds: [embed] });
	});

	collector.on("end", async (collected, reason) => {
		if (reason == "time") {
			embed = new Discord.MessageEmbed()
				.setColor(("#" + Math.floor(Math.random() * 16777215).toString(16)) as ColorResolvable)
				.setTitle("Wyniki wyszukiwania")
				.setDescription("Nie zdążyłeś wybrać")
				.setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() });

			message.reactions.removeAll();
			interaction.editReply({ embeds: [embed] });
		}
		else if (reason != "user") {
			console.error(`Weird collector end: ${reason}`);
		}
	});
}