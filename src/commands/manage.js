'use strict'

const { SlashCommandBuilder, SlashCommandStringOption, SlashCommandUserOption, SlashCommandBooleanOption } = require('@discordjs/builders')
const fs = require('fs')
const config = require('../config.json')

function includesDict(array, dict) {
	for (const a of array) {
		if (JSON.stringify(dict) === JSON.stringify(a))
			return true
	}
	return false
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('manage')
		.setDescription('Różne ustawienia bota')
		.addSubcommand(subcommand =>
			subcommand
				.setName('guild')
				.setDescription('Ustawienia dotyczące tej gildii (lub innej wsm też)')
				.addStringOption(
					new SlashCommandStringOption()
						.setName('option')
						.setDescription('różne opcje')
						.setRequired(true)
						.addChoice('block jajco', 'banjajco')
						.addChoice('unblock jajco', 'unbanjajco')
				)
				.addStringOption(
					new SlashCommandStringOption()
						.setName('additional')
						.setDescription('Dodatkowe informacji (np. id guildi)')
						.setRequired(false)
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('user')
				.setDescription('Ustawienia dotyczące użytkownika')
				.addUserOption(
					new SlashCommandUserOption()
						.setName('user')
						.setDescription('Użytkownik')
						.setRequired(true)
				)
				.addStringOption(
					new SlashCommandStringOption()
						.setName('option')
						.setDescription('Opcje')
						.setRequired(true)
						.addChoice('ban jajco', 'banjajco')
						.addChoice('unban jajco', 'unbanjajco')
				)
		)
		.addSubcommand(subcommand =>
			subcommand
				.setName('channel')
				.setDescription('Ustawienia kanałów')
				.addStringOption(
					new SlashCommandStringOption()
						.setName('option')
						.setDescription('Opcja')
						.setRequired(true)
						.addChoice('dodaj', 'add')
						.addChoice('usuń', 'remove')
				)
				.addStringOption(
					new SlashCommandStringOption()
						.setName('what')
						.setDescription('co zmienić')
						.setRequired(true)
						.addChoice('pogoda', 'pogoda')
						.addChoice('inspiracja', 'inspiracja')
						.addChoice('ogłoszenia z librusa', 'notices')
				)
				.addStringOption(
					new SlashCommandStringOption()
						.setName('guild')
						.setDescription('ID Gildii')
						.setRequired(false)
				)
				.addStringOption(
					new SlashCommandStringOption()
						.setName('channel')
						.setDescription('ID kanału')
						.setRequired(false)
				)
				.addBooleanOption(
					new SlashCommandBooleanOption()
						.setName('roles')
						.setDescription('czy oznaczać role (wymagane tylko przy ogłoszeniach) default=false')
						.setRequired(false)
				)
		),
	async execute(interaction) {
		if (!config.adminID.includes(interaction.user.id))
			return

		const settings = require(`${__dirname}../data/settings.json`)

		if (interaction.options.getSubcommand() === 'guild') {
			const option = interaction.options.getString('option')
			const additional = interaction.options.getString('additional')

			if (option == 'banjajco') {
				if (!settings.jajco.bannedGuilds.includes((additional ? additional : interaction.guild.id))) {
					settings.jajco.bannedGuilds.push((additional ? additional : interaction.guild.id))
					fs.writeFileSync('./data/settings.json', JSON.stringify(settings, null, 2))
				}
				interaction.reply('ok')
			}
			else if (option == 'unbanjajco') {
				if (settings.jajco.bannedGuilds.includes((additional ? additional : interaction.guild.id))) {
					settings.jajco.bannedGuilds.splice(settings.jajco.bannedGuilds.indexOf((additional ? additional : interaction.guild.id)), 1)
					fs.writeFileSync('./data/settings.json', JSON.stringify(settings, null, 2))
				}
				interaction.reply('ok')
			}
		}

		if (interaction.options.getSubcommand() === 'user') {
			const option = interaction.options.getString('option')
			const user = interaction.options.getUser('user')

			if (option == 'banjajco') {
				if (!settings.jajco.bannedUsers.includes(user.id)) {
					settings.jajco.bannedUsers.push(user.id)
					fs.writeFileSync('./data/settings.json', JSON.stringify(settings, null, 2))
				}
				interaction.reply('ok')
			}
			else if (option == 'unbanjajco') {
				if (settings.jajco.bannedUsers.includes(user.id)) {
					settings.jajco.bannedUsers.splice(settings.jajco.bannedUsers.indexOf(user.id), 1)
					fs.writeFileSync('./data/settings.json', JSON.stringify(settings, null, 2))
				}
				interaction.reply('ok')
			}
		}

		if (interaction.options.getSubcommand() === 'channel') {
			const option = interaction.options.getString('option')
			const what = interaction.options.getString('what')
			let guild = interaction.options.getString('guild')
			let channel = interaction.options.getString('channel')
			let roles = interaction.options.getBoolean('roles')

			if (!guild) {
				guild = interaction.guildId
				channel = interaction.channelId
			}
			if (roles == null)
				roles = false

			if (what == 'pogoda') {
				if (option == 'add') {
					if (!includesDict(settings.pogoda.where, { guild: guild, channel: channel }))
						settings.pogoda.where.push({ guild: guild, channel: channel })
				}
				else if (includesDict(settings.pogoda.where, { guild: guild, channel: channel })) {settings.pogoda.where.splice(settings.pogoda.where.indexOf({ guild: guild, channel: channel }), 1)}
			}
			else if (what == 'inspiracja') {
				if (option == 'add') {
					if (!includesDict(settings.inspiracja.where, { guild: guild, channel: channel }))
						settings.inspiracja.where.push({ guild: guild, channel: channel })
				}
				else if (includesDict(settings.inspiracja.where, { guild: guild, channel: channel })) {settings.inspiracja.where.splice(settings.inspiracja.where.indexOf({ guild: guild, channel: channel }), 1)}
			}
			else if (what == 'notices') {
				if (option == 'add') {
					if (!includesDict(settings.notices.where, { guild: guild, channel: channel, roles: roles }))
						settings.notices.where.push({ guild: guild, channel: channel, roles: roles })
				}
				else if (includesDict(settings.notices.where, { guild: guild, channel: channel, roles: roles })) {settings.notices.where.splice(settings.notices.where.indexOf({ guild: guild, channel: channel, roles: roles }), 1)}
			}

			fs.writeFileSync('./data/settings.json', JSON.stringify(settings, null, 2))
			interaction.reply('ok')
		}
	}
}