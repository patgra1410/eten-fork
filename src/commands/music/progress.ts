import { SlashCommandBuilder } from "@discordjs/builders";
import Discord, { CommandInteraction, ColorResolvable } from "discord.js";
import { player } from "../../index";

export const data = new SlashCommandBuilder()
	.setName("progress")
	.setDescription("Sprawdź jak progress aktualnie granej piosenki/filmu");

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

	const progress = queue.createProgressBar();
	const timestamp = queue.getPlayerTimestamp();
	let desc = "";
	if (timestamp.progress == Infinity)
		desc = "Streamy nie mają progressu";
	else
		desc = `${progress}`;

	const embed = new Discord.MessageEmbed()
		.setColor(("#" + Math.floor(Math.random() * 16777215).toString(16)) as ColorResolvable)
		.setTitle(queue.current.title)
		.setURL(queue.current.url)
		.setImage(queue.current.thumbnail)
		.setDescription(desc);

	interaction.editReply({ embeds: [embed] });
}