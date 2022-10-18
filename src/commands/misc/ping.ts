import { SlashCommandBuilder } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";

export const data = new SlashCommandBuilder()
	.setName("ping")
	.setDescription("Check if the bot is alive and get response time");

export async function execute(interaction: CommandInteraction) {
	await interaction.reply("Pinging...");
	await interaction.editReply(`Ping: \`${interaction.client.ws.ping}ms\``);
}
