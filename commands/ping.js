const { SlashCommandBuilder } = require('@discordjs/builders')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('ping')
		.setDescription('Check if the bot is alive and get response time'),
	async execute(interaction) {
		await interaction.reply('Pinging...')
		await interaction.editReply(`Ping: \`${interaction.client.ws.ping}ms\``)
	},
}
