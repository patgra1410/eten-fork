import { SlashCommandBuilder } from "@discordjs/builders";
import Discord, { CommandInteraction, ColorResolvable } from "discord.js";
import { player } from "../../index";

export const data = new SlashCommandBuilder()
	.setName("now_playing")
	.setDescription("Sprawdź co jest teraz odtwarzane");

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

	const embed = new Discord.MessageEmbed()
		.setColor(("#" + Math.floor(Math.random() * 16777215).toString(16)) as ColorResolvable)
		.setTitle(`${queue.current.title} | ${queue.current.author}`)
		.setURL(queue.current.url)
		.setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL() })
		.setImage(queue.current.thumbnail)
		.setDescription(`**Długość:** ${queue.current.duration}`);

	interaction.editReply({ embeds: [embed] });
}