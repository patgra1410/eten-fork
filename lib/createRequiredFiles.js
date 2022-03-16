'use strict'

const fs = require('fs')

module.exports = function() {

	// SETTINGS

	if (!fs.existsSync('./data/settings.json'))
		fs.writeFileSync('./data/settings.json', '{}')

	const settings = require('../data/settings.json')

	if (!('jajco' in settings))
		settings.jajco = {}
	if (!('bannedGuilds' in settings.jajco))
		settings.jajco.bannedGuilds = []
	if (!('bannedUsers' in settings.jajco))
		settings.jajco.bannedUsers = []

	if (!('inspiracja' in settings))
		settings.inspiracja = {}
	if (!('where' in settings.inspiracja))
		settings.inspiracja.where = []

	if (!('pogoda' in settings))
		settings.pogoda = {}
	if (!('where' in settings.pogoda))
		settings.pogoda.where = []

	if (!('notices' in settings))
		settings.notices = {}
	if (!('where' in settings.notices))
		settings.notices.where = []

	fs.writeFileSync('./data/settings.json', JSON.stringify(settings))

	// RANKINGS

	if (!fs.existsSync('./data/ranking.json'))
		fs.writeFileSync('./data/ranking.json', '{}')

	const ranking = require('../data/ranking.json')
	for (const option of ['pilkarzyki', 'kwadraty', 'teampilkarzyki', 'najdluzszyruch', 'najdluzszagrateampilkarzyki', 'najdluzszagrapilkarzyki', 'sumaruchow', 'jajco', 'bets']) {
		if (!(option in ranking))
			ranking[option] = {}
	}
	fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

	// USER SETTINGS

	if (!fs.existsSync('./data/userSettings.json'))
		fs.writeFileSync('./data/userSettings.json', '{}')

	// HASHES

	if (!fs.existsSync('./data/hashes.json'))
		fs.writeFileSync('./data/hashes.json', '{}')

	// BETS

	if (!fs.existsSync('./data/bets.json'))
		fs.writeFileSync('./data/bets.json', '{}')

	// PREDICTIONS

	if (!fs.existsSync('./data/predictions.json'))
		fs.writeFileSync('./data/predictions.json', '{"bets": {}}')
}