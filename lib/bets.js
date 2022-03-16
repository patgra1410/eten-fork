'use strict'

const fs = require('fs')
const Discord = require('discord.js')
const config = require('../config.json')

module.exports = {
	async addTime(time) {
		const predictions = JSON.parse(fs.readFileSync('./data/predictions.json'))
		if (predictions.bets[time.getDay()] === undefined)
			predictions.bets[time.getDay()] = []
		predictions.bets[time.getDay()].push(time.getTime())
		fs.writeFileSync('./data/predictions.json', JSON.stringify(predictions))
	},
	async check(client) {
		if (!config.bets.eneabled)
			return

		const date = new Date()
		const now = date.getMilliseconds() + date.getSeconds() * 1000 + date.getMinutes() * 60 * 1000 + date.getHours() * 60 * 60 * 1000

		const users = []
		const bets = JSON.parse(fs.readFileSync('./data/bets.json'))

		if (Object.keys(bets).length == 0)
			return

		for (const [user, time] of Object.entries(bets)) {
			const diff = Math.abs(time.time - now)
			let mili = parseInt(diff)
			let sec = Math.floor(mili / 1000)
			let mins = Math.floor(sec / 60)
			let hours = Math.floor(mins / 60)
			mili = ('000' + (mili % 1000)).slice(-3)
			sec = ('00' + (sec % 60)).slice(-2)
			mins = ('00' + (mins % 60)).slice(-2)
			hours = ('00' + (hours % 60)).slice(-2)

			let niceDiff = ''
			if (time.time > now)
				niceDiff = 'za pózno o '
			else
				niceDiff = 'za wcześnie o '
			if (hours > 0)
				niceDiff += `${hours}:${mins} godzin`
			else if (mins > 0)
				niceDiff += `${mins} minut`
			else if (sec > 0)
				niceDiff += `${sec} sekund`
			else if (mili > 0)
				niceDiff += `${mili} milisekund`

			users.push({
				user: user,
				time: time.time,
				message: time.message,
				diff: diff,
				niceDiff: niceDiff
			})
		}

		users.sort((a, b) => {
			return a.diff - b.diff
		})

		let desc = ''
		let i = 1
		for (const user of users) {
			desc += `**${i.toString()}.** <@${user.user}>: ${user.niceDiff} (podany czas: ${user.message})\n`
			i++
		}

		const embed = new Discord.MessageEmbed()
			.setColor('#' + Math.floor(Math.random() * 16777215).toString(16))
			.setTitle('Dzisiejsze wyniki zakładuw')
			.setDescription(desc)

		client.guilds.cache.get(config.bets.guild).channels.cache.get(config.bets.channel).send({ embeds: [embed] })

		fs.writeFileSync('./data/bets.json', '{}')

		const ranking = JSON.parse(fs.readFileSync('./data/ranking.json'))

		if (!(users[0].user in ranking.bets))
			ranking.bets[users[0].user] = 0
		ranking.bets[users[0].user]++

		fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))
	}
}