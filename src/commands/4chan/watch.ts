import { CommandInteraction } from "discord.js";
import nodeFetch from "node-fetch";
import { SlashCommandBuilder, SlashCommandStringOption, SlashCommandIntegerOption } from "@discordjs/builders";
import { checkThreads, watchedThreads } from "../../lib/threadManager";
import * as config from "../../config.json";

export const data = new SlashCommandBuilder()
	.setName("watch")
	.setDescription("Add a new thread to be watched. Thread will be auto-unwatched when archived")
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
			.setDescription("ID of the thread to be watched")
			.setRequired(true)
	);

export async function execute(interaction: CommandInteraction) {
	await interaction.deferReply();
	const board = interaction.options.getString("board");
	const threadId = interaction.options.getInteger("thread_id");
	// Add https://boards.4channel.org/${board}/thread/${threadid} to watched threads
	const threadKey = `${board}/${threadId}`;
	if (watchedThreads.has(threadKey)) {
		await interaction.editReply("Thread is already tracked");
		return;
	}

	let threadResultJson;
	try {
		const threadResult = await nodeFetch(`https://a.4cdn.org/${board}/thread/${threadId}.json`);
		threadResultJson = await threadResult.json();
	}
	catch (error) {
		console.error(error);
		await interaction.editReply("4chan did not respond correctly; try again later");
		return;
	}
	if (threadResultJson.posts[0].archived || threadResultJson.posts[0].closed) {
		await interaction.editReply("Thread is archived or locked.");
		return;
	}

	await interaction.editReply(`Now watching <https://boards.4channel.org/${board}/thread/${threadId}>`);
	watchedThreads.set(threadKey, {
		threadId: threadId.toString(),
		boardId: board,
		errorStrikes: 0,
		knownPosts: new Map()
	});
	checkThreads;
}