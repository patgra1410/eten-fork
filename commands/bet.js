'use strict'

const { SlashCommandBuilder, SlashCommandStringOption } = require('@discordjs/builders')
const Discord = require('discord.js')
const fs = require('fs')
const config = require('../config.json')
const betsFunc = require('../lib/bets')

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
				.setName('zmień')
				.setDescription('Zmień swój zakład')
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
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('check')
				.setDescription('Tylko dla administratorów bota')
		),
	async execute(interaction) {
		if (interaction.options.getSubcommand() == 'bet' || interaction.options.getSubcommand() == 'zmień') {
			const content = interaction.options.getString('czas')
			if (!/[0-2]{1}[0-9]{1}:[0-6]{1}[0-9]{1}:[0-6]{1}[0-9]{1}.[0-9]{3}$|[0-2]{1}[0-9]{1}:[0-6]{1}[0-9]{1}:[0-6]{1}[0-9]{1}$|[0-2]{1}[0-9]{1}:[0-6]{1}[0-9]{1}$/.test(content)) {
				interaction.reply('Zły format (dozwolone formaty: godzina:minuta, godzina:minuta:sekunda, godzina:minuta:sekunda.milisekunda)')
				return
			}

			const bets = JSON.parse(fs.readFileSync('./data/bets.json'))

			if (interaction.user.id in bets && interaction.options.getSubcommand() != 'zmień') {
				interaction.reply('Już się założyłeś. <:qiqifallen:936561167709646860>')
				return
			}

			const time = Date.parse('1970-01-01 ' + content + ' GMT')
			if (isNaN(time)) {
				interaction.reply('Zły czas. <:widelinus:687065253153996835>')
				return
			}

			if (time >= Date.parse('1970-01-01 10:00 GMT')) {
				interaction.reply('Nie oszukuj <:waznaDissapoint:833355180329926696>')
				return
			}

			bets[interaction.user.id] = {
				time: time,
				message: content
			}
			fs.writeFileSync('./data/bets.json', JSON.stringify(bets))

			if (interaction.options.getSubcommand() == 'bet')
				interaction.reply('Dodano!')
			else
				interaction.reply('Zmieniono!')
		} else if (interaction.options.getSubcommand() == 'list') {
			const bets = JSON.parse(fs.readFileSync('./data/bets.json'))

			const users = []
			for (const [user, time] of Object.entries(bets)) {
				users.push({
					user: user,
					time: time.time,
					message: time.message
				})
			}
			users.sort((a, b) => {
				return a.time - b.time
			})

			let desc = ''
			for (const time of users)
				desc += `<@${time.user}>: ${time.message}\n`

			if (desc == '')
				desc = 'Jeszcze nikt się nie założył <:widenatchuz:706934562961358888>'

			const embed = new Discord.MessageEmbed()
				.setColor('#' + Math.floor(Math.random() * 16777215).toString(16))
				.setTitle('Aktualne zakłady')
				.setDescription(desc)

			interaction.reply({ embeds: [embed] })
		} else if (interaction.options.getSubcommand() == 'check') {
			if (config.adminID.indexOf(interaction.user.id) == -1) {
				interaction.reply({ content: 'Tylko dla administratorów', ephemeral: true })
				return
			}

			betsFunc.check(interaction.client)
			interaction.reply({ content: 'ok', ephemeral: true })
		}
	}
}