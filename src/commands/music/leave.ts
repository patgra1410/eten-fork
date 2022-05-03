import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { player } from "../../index";

export const data = new SlashCommandBuilder()
	.setName("leave")
	.setDescription("Opuść kanał głosowy i usuń kolejkę");

export async function execute(interaction: CommandInteraction) {
	await interaction.deferReply();

	const guild = interaction.client.guilds.cache.get(interaction.guild.id);
	const user = guild.members.cache.get(interaction.user.id);

	if (!user.voice.channel) {
		interaction.editReply("Nie jesteś na VC");
		return;
	}

	const queue = player.getQueue(interaction.guild.id);
	queue.destroy();
	interaction.editReply("Usunięto kolejkę");
}