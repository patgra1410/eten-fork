const { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('cum')
		.setDescription('kiedy widze nowy filmik damonka :trolldog'),
	async execute(interaction) {
		await interaction.reply('<:cum:867794003122454539>')
	}
}
