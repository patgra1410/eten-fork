import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandBooleanOption } from "@discordjs/builders";
import Player, { QueryType } from "discord-player";
import Discord, { ColorResolvable, CommandInteraction } from "discord.js";
import fs from "fs";
import { player } from "../../index";
import { IMusicInfo } from "../../lib/types";

function shuffleArray(array: Array<Player.Track>): Array<Player.Track> {
	let currentIndex = array.length, randomIndex;
	while (currentIndex != 0) {
		randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex], array[currentIndex]
		];
	}

	return array;
}

function getEmbed(film: Player.PlayerSearchResult, interaction: CommandInteraction): Discord.MessageEmbed {
	const embed = new Discord.MessageEmbed()
		.setColor(("#" + Math.floor(Math.random() * 16777215).toString(16)) as ColorResolvable);

	if (film.playlist) {
		embed
			.setTitle(film.playlist.title)
			.setURL(film.playlist.url)
			.setDescription(`Dodano playlistę do kolejki (${film.playlist.tracks.length} ${film.playlist.source == "youtube" ? "filmów" : "piosenek"} na playliście)`)
			.setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() });
	}
	else {
		embed
			.setTitle(film.tracks[0].title)
			.setURL(film.tracks[0].url)
			.setDescription(`Dodano ${film.tracks[0].source == "youtube" ? "film" : "piosenkę"} do kolejki (${film.tracks[0].duration})`)
			.setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
			.setImage(film.tracks[0].thumbnail);
	}

	return embed;
}

export const data = new SlashCommandBuilder()
	.setName("yt")
	.setDescription("Puść z yt")
	.addStringOption(
		new SlashCommandStringOption()
			.setName("link")
			.setDescription("link do yt")
			.setRequired(true)
	)
	.addBooleanOption(
		new SlashCommandBooleanOption()
			.setName("shuffle")
			.setDescription("Czy chcesz shufflować (działa dla playlist)")
			.setRequired(false)
	);

export async function execute(interaction: CommandInteraction) {
	await interaction.deferReply();

	const guild = interaction.client.guilds.cache.get(interaction.guild.id);
	const user = guild.members.cache.get(interaction.user.id);
	const link = interaction.options.getString("link");
	const shuffle = interaction.options.getBoolean("shuffle");

	if (!user.voice.channel) {
		interaction.editReply("Nie jesteś na VC");
		return;
	}

	const res = await player.search(link, {
		requestedBy: interaction.user.username,
		searchEngine: QueryType.AUTO
	});

	if (!res || !res.tracks.length) {
		interaction.editReply("Nic nie znaleziono:(");
		return;
	}

	let queue = player.getQueue(interaction.guild.id);
	const musicInfo: IMusicInfo = JSON.parse(fs.readFileSync("./data/music.json", "utf-8"));
	if (!(interaction.guildId in musicInfo)) {
		musicInfo[interaction.guildId] = {
			volume: 100
		};

		fs.writeFileSync("./data/music.json", JSON.stringify(musicInfo));
	}

	if (queue) {
		if (res.playlist && shuffle)
			res.tracks = shuffleArray(res.tracks);

		res.playlist ? queue.addTracks(res.tracks) : queue.addTrack(res.tracks[0]);

		if (!queue.playing)
			(queue.play()).then(() => queue.setVolume(musicInfo[interaction.guildId].volume));

		interaction.editReply({ embeds: [getEmbed(res, interaction)] });
	}
	else {
		if (res.playlist && shuffle)
			res.tracks = shuffleArray(res.tracks);

		queue = player.createQueue(interaction.guild, { metadata: true });

		try {
			if (!queue.connection)
				await queue.connect(user.voice.channel);
		}
		catch (error) {
			console.error(error);
			player.deleteQueue(interaction.guild.id);
			interaction.editReply("Nie mogłem dołączyć do vc:( <@230917788699459584>");
			return;
		}

		res.playlist ? queue.addTracks(res.tracks) : queue.addTrack(res.tracks[0]);

		if (shuffle)
			queue.shuffle();

		if (!queue.playing)
			(queue.play()).then(() => queue.setVolume(musicInfo[interaction.guildId].volume));

		interaction.editReply({ embeds: [getEmbed(res, interaction)] });
	}
}