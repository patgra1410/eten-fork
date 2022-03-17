/* eslint-disable @typescript-eslint/no-var-requires */
const { SlashCommandBuilder, SlashCommandStringOption, SlashCommandIntegerOption } = require('@discordjs/builders')
const { watchThread } = require('../lib/threadwatcher')
const config = require('../config.json')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('watch')
		.setDescription('Add a new thread to be watched. Thread will be auto-unwatched when archived')
		.addStringOption(
			function stringopts() {
				const scso = new SlashCommandStringOption()
					.setName('board')
					.setDescription('Shortened board name')
					.setRequired(true)
				for (const element in config.allowedBoardsForTracking)
					scso.addChoice(config.allowedBoardsForTracking[element], element)

				return scso
			}
		)
		.addIntegerOption(
			new SlashCommandIntegerOption()
				.setName('thread_id')
				.setDescription('ID of the thread to be watched')
				.setRequired(true)
		),
	async execute(interaction) {
		await interaction.deferReply()
		const board = interaction.options.getString('board')
		const threadID = interaction.options.getInteger('thread_id')
		const result = await watchThread(board, threadID)
		if (result.added === true)
			await interaction.editReply(`Now watching <https://boards.4channel.org/${board}/thread/${threadID}>`)

		else
			await interaction.editReply(`Error: ${result.reason}`)

	}
}
