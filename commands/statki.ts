import { CommandInteraction } from "discord.js"

const { SlashCommandBuilder } = require('@discordjs/builders')

import StatkiManager from '../lib/statkiManager'
const manager = new StatkiManager()

module.exports = {
	data: new SlashCommandBuilder()
		.setName('statki')
		.setDescription('nowa gra w statki')
		.addUserOption(option => {
			option
				.setName('gracz')
				.setDescription('Przeciwnika wybierz kurwa no')
				.setRequired(true)
		}),
	async execute(interaction: CommandInteraction) {
		// await interaction.reply('<:cum:867794003122454539>')
		const challengerUserId = interaction.user.id
		const challengedUserId = interaction.options.getUser('gracz').id
		if (manager.gryMap.has(challengerUserId) || manager.gryMap.has(challengedUserId)) {
			interaction.reply('Gracz jest już w grze.')
			return
		}
		manager.newGame(challengerUserId, challengedUserId)
	}
}
