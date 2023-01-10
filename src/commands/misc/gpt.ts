import Discord, { CommandInteraction } from "discord.js";
import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { askQuestion } from "../../openai";

export const data = new SlashCommandBuilder()
	.setName("gpt")
	.setDescription("Eten gpt")
	.addStringOption(
		new SlashCommandStringOption()
			.setName("message")
			.setDescription("wiadomość")
			.setRequired(true)
	);

export async function execute(interaction: CommandInteraction) {
	await interaction.deferReply();
	const response = await askQuestion(interaction.options.getString("message"));
	interaction.editReply(response);
}