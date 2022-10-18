import Discord, { CommandInteraction } from "discord.js";
import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";

export const data = new SlashCommandBuilder()
	.setName("lmgtfy")
	.setDescription("gdy ktoś nie wie co to internet")
	.addStringOption(
		new SlashCommandStringOption()
			.setName("query")
			.setDescription("zapytanie")
			.setRequired(true)
	);

export async function execute(interaction: CommandInteraction) {
	const query = encodeURIComponent(interaction.options.getString("query"));
	interaction.reply(`https://lmgt.org/?q=${query}&iie=1`);
}