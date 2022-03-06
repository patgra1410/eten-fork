'use strict'

const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders')
const Discord = require('discord.js')
const fs = require('fs')

module.exports = {
	data: new SlashCommandBuilder()
		.setName('bet')
		.setDescription('Zakłady')
		.addSubcommand(subcommand =>
			subcommand
				.setName('bet')
				.setDescription('Załóż się')
				.addStringOption(
					new SlashCommandStringOption()
						.setName('czas')
						.setDescription('Godzina')
						.setRequired(true)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('list')
				.setDescription('Lista zakładów')
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() == 'bet') {
			const content = interaction.options.getString('czas')
			if (!/[0-2]{1}[0-9]{1}:[0-6]{1}[0-9]{1}:[0-6]{1}[0-9]{1}.[0-9]{3}$|[0-2]{1}[0-9]{1}:[0-6]{1}[0-9]{1}:[0-6]{1}[0-9]{1}$|[0-2]{1}[0-9]{1}:[0-6]{1}[0-9]{1}$/.test(content)) {
				interaction.reply('Zły format (dozwolone formaty: godzina:minuta, godzina:minuta:sekunda, godzina:minuta:sekunda.milisekunda)')
				return
			}

			const bets = JSON.parse(fs.readFileSync('./data/bets.json'))

			if (interaction.user.id in bets) {
				interaction.reply('Już się założyłeś. <:qiqifallen:936561167709646860>')
				return
			}

			const time = Date.parse('1970-01-01 ' + content + ' GMT')

			bets[interaction.user.id] = {
				time: time,
				message: content
			}
			fs.writeFileSync('./data/bets.json', JSON.stringify(bets))

			interaction.reply('gaming')
		} else if (interaction.options.getSubcommand() == 'list') {
			const bets = JSON.parse(fs.readFileSync('./data/bets.json'))

			let desc = ''
			for (const [user, time] of Object.entries(bets))
				desc += `<@${user}>: ${time.message}\n`

			if (desc == '')
				desc = 'Jeszcze nikt się nie założył...'

			const embed = new Discord.MessageEmbed()
				.setColor('#' + Math.floor(Math.random() * 16777215).toString(16))
				.setTitle('Aktualne zakłady')
				.setDescription(desc)

			interaction.reply({ embeds: [embed] })
		}
	}
}