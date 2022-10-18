import { SlashCommandBuilder } from "@discordjs/builders";
import Discord, { CommandInteraction, ColorResolvable } from "discord.js";
import { player } from "../../index";
import { QueueRepeatMode } from "discord-player";

export const data = new SlashCommandBuilder()
	.setName("queue")
	.setDescription("Sprawdź kolejkę");

export async function execute(interaction: CommandInteraction) {
	await interaction.deferReply();

	const guild = interaction.client.guilds.cache.get(interaction.guild.id);
	const user = guild.members.cache.get(interaction.user.id);

	if (!user.voice.channel) {
		interaction.editReply("Nie jesteś na VC");
		return;
	}

	const queue = player.getQueue(interaction.guild.id);
	if (!queue || !queue.playing) {
		interaction.editReply("Nie puszczam żadnej muzyki");
		return;
	}

	const infoEmbed = new Discord.MessageEmbed()
		.setColor(("#" + Math.floor(Math.random() * 16777215).toString(16)) as ColorResolvable)
		.setTitle("Informacje")
		.setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
		.setDescription(`**Głośność:** ${queue.volume}
**Pętla:** ${queue.repeatMode == QueueRepeatMode.OFF ? "wyłączona" : (queue.repeatMode == QueueRepeatMode.QUEUE ? "cała kolejka" : "tylko ten utwór")}
**Ilość piosenek w kolejce:** ${queue.tracks.length} \t**Łączna długość:** ${new Date(queue.totalTime).toTimeString().split(" ")[0]}`);

	let desc = `**Aktualna piosenka:** ${queue.current.title} **|** ${queue.current.author}\n\n`;

	let i = 2;
	for (const track of queue.tracks) {
		desc += `**${i}.** ${track.title} **|** ${track.author}\n`;
		i++;
		if (i == 11)
			break;
	}

	if (queue.tracks.length > 10) {
		desc += `\nI jeszcze ${queue.tracks.length - 10} więcej piosenek w kolejce...`;
	}

	const songsEmbed = new Discord.MessageEmbed()
		.setColor(("#" + Math.floor(Math.random() * 16777215).toString(16)) as ColorResolvable)
		.setTitle("Piosenki w kolejce")
		.setDescription(desc);

	interaction.editReply({ embeds: [infoEmbed, songsEmbed] });
}