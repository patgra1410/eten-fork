import { CommandInteraction } from "discord.js";
import { SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption } from "@discordjs/builders";
import * as config from "../config.json";
import { watchedThreads } from "../lib/threadManager";

export const data = new SlashCommandBuilder()
	.setName("unwatch")
	.setDescription("Manually unwatch a thread - use for threads that get derailed or are insanenly shit")
	.addStringOption(
		function stringopts() {
			const option = new SlashCommandStringOption()
				.setName("board")
				.setDescription("Shortened board name")
				.setRequired(true);
			for (const element of config.allowedBoardsForTracking)
				option.addChoice(element, element);
			return option;
		}
	)
	.addIntegerOption(
		new SlashCommandIntegerOption()
			.setName("thread_id")
			.setDescription("ID of the thread to be unwatched")
			.setRequired(true)
	);

export async function execute(interaction: CommandInteraction) {
	await interaction.deferReply();
	const board = interaction.options.getString("board");
	const threadID = interaction.options.getInteger("thread_id");
	const threadKey = `${board}/${threadID}`;
	const deletedKeys = watchedThreads.delete(threadKey);
	if (deletedKeys)
		await interaction.reply(`${board}/${threadID} - Thread unwatched`);
	else
		await interaction.reply("This thread isn't being watched");
}
