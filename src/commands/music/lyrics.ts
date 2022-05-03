import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import Discord, { CommandInteraction, ColorResolvable, TextChannel } from "discord.js";
import { searchSong, getLyrics, LyricsError, lyricsErrorEnum } from "../../lib/lyrics";
import { repeatingDigitsText, ILyricsSong } from "../../lib/types";

export const data = new SlashCommandBuilder()
	.setName("lyrics")
	.setDescription("Znajdź tekst dla piosenki")
	.addStringOption(
		new SlashCommandStringOption()
			.setName("song")
			.setDescription("nazwa piosenki")
			.setRequired(true)
	);

export async function execute(interaction: CommandInteraction) {
	await interaction.deferReply();

	const name = interaction.options.getString("song");
	let songs: Array<ILyricsSong>;
	try {
		songs = await searchSong(name);
		if (songs.length > 10)
			songs = songs.slice(9);
	}
	catch (error) {
		if (error instanceof LyricsError) {
			if (error.type == lyricsErrorEnum.NoApiKey)
				interaction.editReply("Właściciel bota nie podał API key");
			else if (error.type == lyricsErrorEnum.WrongStatus) {
				interaction.editReply("Wystąpił bład podczas szukania piosenki:(");
				console.error(error);
			}
		}
		else {
			console.error(error);
			interaction.editReply("Wystąpił jakiś error?? sus");
		}
		return;
	}

	let desc, i;
	if (songs.length) {
		desc = "Masz 15 sekund na wybór\n\n";
		i = 1;
		for (const song of songs) {
			desc += `**${i}.** ${song.full_title}\n`;
			i++;
		}
	}
	else
		desc = "Nic nie znaleziono:(";

	let embed = new Discord.MessageEmbed()
		.setColor(("#" + Math.floor(Math.random() * 16777215).toString(16)) as ColorResolvable)
		.setTitle("Wybierz piosenkę")
		.setDescription(desc)
		.setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() });

	const emojis = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣", "6️⃣", "7️⃣", "8️⃣", "9️⃣", "🔟"];
	const msg = await interaction.editReply({ embeds: [embed] });
	const message = (interaction.client.channels.cache.get(interaction.channelId) as TextChannel).messages.cache.get(msg.id);

	if (!songs.length)
		return;

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

		const lyrics = await getLyrics(songs[number]);

		embed = new Discord.MessageEmbed()
			.setColor(("#" + Math.floor(Math.random() * 16777215).toString(16)) as ColorResolvable)
			.setTitle(songs[number].full_title)
			.setURL(songs[number].url)
			.setDescription(lyrics)
			.setThumbnail(songs[number].song_art_image_url)
			.setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() });

		interaction.editReply({ embeds: [embed] });
		message.reactions.removeAll();
	});

	collector.on("end", async (collected, reason) => {
		if (reason == "time") {
			embed = new Discord.MessageEmbed()
				.setColor(("#" + Math.floor(Math.random() * 16777215).toString(16)) as ColorResolvable)
				.setTitle("Wybór piosenki")
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
