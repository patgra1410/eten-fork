import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { player } from "../../index";
import { QueryType } from "discord-player";

export const data = new SlashCommandBuilder()
	.setName("yt")
	.setDescription("Puść z yt")
	.addStringOption(
		new SlashCommandStringOption()
			.setName("link")
			.setDescription("link do yt")
			.setRequired(true)
	);

export async function execute(interaction: CommandInteraction) {
	const guild = interaction.client.guilds.cache.get(interaction.guild.id);
	const user = guild.members.cache.get(interaction.user.id);
	const link = interaction.options.getString("link");

	if (!user.voice.channel) {
		interaction.reply("Nie jesteś na VC");
		return;
	}

	const film = await player.search(link, {
		requestedBy: interaction.user.username,
		searchEngine: QueryType.AUTO
	});

	if (!film || !film.tracks.length) {
		interaction.reply("Nic nie znaleziono:(");
		return;
	}

	let queue = player.getQueue(interaction.guild.id);

	if (queue) {
		film.playlist ? queue.addTracks(film.tracks) : queue.addTrack(film.tracks[0]);
		if (!queue.playing)
			await queue.play();

		interaction.reply(`Dodano do kolejki! (${queue.tracks.length} filmów w kolejce)`);
	}
	else {
		queue = player.createQueue(interaction.guild);

		try {
			if (!queue.connection)
				await queue.connect(user.voice.channel);
		}
		catch (error) {
			console.error(error);
			player.deleteQueue(interaction.guild.id);
			interaction.reply("Nie mogłem dołączyć do vc:( <@230917788699459584>");
			return;
		}

		film.playlist ? queue.addTracks(film.tracks) : queue.addTrack(film.tracks[0]);
		if (!queue.playing)
			await queue.play();

		if (film.playlist)
			interaction.reply(`Dodano playlistę "${film.playlist.title}" do kolejki (${film.tracks.length} utworów)`);
		else
			interaction.reply(`Dodano "${film.tracks[0].title}" do kolejki`);
	}
}