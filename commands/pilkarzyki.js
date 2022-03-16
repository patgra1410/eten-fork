'use strict'

const Board = require('../pilkarzykiRenderer.js')
const Discord = require('discord.js')
const fs = require('fs')
const Elo = require('elo-rating')
const { performance } = require('perf_hooks')
const { SlashCommandBuilder, SlashCommandUserOption } = require('@discordjs/builders')
const ExtBoard = require('../bot.js')
const config = require('../config.json')

const uids = {}
const bots = {}
const boards = {}
let gameID = 1
let botID = 1
let accepts = []

function buttons(id) {
	const indexes = boards[id].possibleMovesIndexes()
	let style
	if (boards[id].turn == 0)
		style = 'PRIMARY'
	else
	if (!boards[id].withBot)
		style = 'DANGER'

	const row1 = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId('pilkarzyki#0')
				.setLabel('Lewo góra')
				.setStyle(style)
				.setDisabled(!indexes.includes(0)),
			new Discord.MessageButton()
				.setCustomId('pilkarzyki#1')
				.setLabel('Góra')
				.setStyle(style)
				.setDisabled(!indexes.includes(1)),
			new Discord.MessageButton()
				.setCustomId('pilkarzyki#2')
				.setLabel('Prawo góra')
				.setStyle(style)
				.setDisabled(!indexes.includes(2))
		)
	const row2 = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId('pilkarzyki#3')
				.setLabel('Lewo     ')
				.setStyle(style)
				.setDisabled(!indexes.includes(3)),
			new Discord.MessageButton()
				.setCustomId('pilkarzyki#disabled')
				.setLabel(' ')
				.setStyle(style)
				.setDisabled(true),
			new Discord.MessageButton()
				.setCustomId('pilkarzyki#4')
				.setLabel('Prawo     ')
				.setStyle(style)
				.setDisabled(!indexes.includes(4))
		)
	const row3 = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId('pilkarzyki#5')
				.setLabel('Lewo dół')
				.setStyle(style)
				.setDisabled(!indexes.includes(5)),
			new Discord.MessageButton()
				.setCustomId('pilkarzyki#6')
				.setLabel('Dół')
				.setStyle(style)
				.setDisabled(!indexes.includes(6)),
			new Discord.MessageButton()
				.setCustomId('pilkarzyki#7')
				.setLabel('Prawo dół')
				.setStyle(style)
				.setDisabled(!indexes.includes(7))
		)
	const row4 = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId('pilkarzyki#remis')
				.setLabel('Remis')
				.setStyle('SECONDARY'),
			new Discord.MessageButton()
				.setCustomId('pilkarzyki#surrender')
				.setLabel('Poddaj się')
				.setStyle('SECONDARY')
		)

	return [row1, row2, row3, row4]
}

function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms))
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('pilkarzyki')
		.setDescription('Pilkarzyki')
		.addSubcommand(subcommand =>
			subcommand
				.setName('player')
				.setDescription('Gra z innym graczem')
				.addUserOption(
					new SlashCommandUserOption()
						.setName('gracz')
						.setDescription('Drugi gracz')
						.setRequired(true)
				))
		.addSubcommand(subcommand =>
			subcommand
				.setName('bot')
				.setDescription('Gra z botem')
				.addIntegerOption(option =>
					option
						.setName('depth')
						.setDescription('Głębokość patrzenia (max. ' + config.pilkarzykiBot.maxDepth + ')')
						.setRequired(true))
		),
	async execute(interaction, args) {
		if (interaction.isButton !== undefined && interaction.isButton()) {
			const mainMessage = await interaction.update({ content: interaction.message.content, fetchReply: true })

			interaction.customId = interaction.customId.slice(interaction.customId.indexOf('#') + 1)
			if (interaction.customId.startsWith('accept')) {
				if (interaction.customId.startsWith('acceptNo')) {
					const uidsButton = interaction.customId.split('#')
					if (uidsButton[2] != interaction.user.id)
						return
					const uid1 = uidsButton[1]
					const uid2 = uidsButton[2]

					for (let i = 0; i < accepts.length; i++) {
						const accept = accepts[i]
						if (accept['uidToAccept'] == uid2 && accept['acceptFrom'] == uid1) {
							const msg = accept['usernames'][1] + ' nie zaakceptował gry z ' + accept['usernames'][0]
							await accept['message'].edit({ content: msg, components: [] })
							accepts.splice(i, 1)
							return
						}
					}
				}
				else {
					const uidsButton = interaction.customId.split('#')
					if (uidsButton[2] != interaction.user.id)
						return
					const uid1 = uidsButton[1]
					const uid2 = uidsButton[2]

					let rightAccept = undefined
					for (let i = 0; i < accepts.length; i++) {
						const accept = accepts[i]
						if (accept['uidToAccept'] == uid2 && accept['acceptFrom'] == uid1) {
							rightAccept = accept
							break
						}
					}
					if (rightAccept === undefined)
						return

					const newAccepts = []
					for (let i = 0; i < accepts.length; i++) {
						if (accepts[i]['fromAccept'] != uid1 && accepts[i]['uidToAccept'] != uid2) {newAccepts.push(accepts[i])}
						else {
							// if(accepts[i]['fromAccept']==uid1 && accepts[i]['uidToAccept']==uid2)
							//     continue

							accepts[i]['message'].edit({ content: accepts[i]['message'].content, components: [] })
						}
					}
					accepts = newAccepts

					uids[uid1] = gameID
					uids[uid2] = gameID

					boards[gameID] = new Board(50, 50, 50, [uid1, uid2], rightAccept.usernames, gameID)
					const id = gameID
					gameID++

					for (let i = 1; i <= 10; i++) {
						try {
							boards[id].draw()
							break
						}
						catch (error) {
							console.log('Draw failed ' + i + '. time(s) color: ' + boards[id].lastColor + ' ' + boards[id].lastColor.toString(16))
							if (i == 10)
								console.log(error)
						}
					}
					const attachment = new Discord.MessageAttachment('./tmp/boardPilkarzyki' + id + '.png')
					const img = await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({ files: [attachment] })

					const msg = 'Tura: <@' + boards[id].turnUID() + '>\n' + img.attachments.first().url

					let error = false
					do {
						try {
							const message = await mainMessage.edit({ content: msg, files: [], components: buttons(id) })
							boards[id].message = message
						}
						catch (err) {
							error = true
							console.log(err)
							await sleep(1000)
						}
					} while (error)
				}
			}
			if (uids[interaction.user.id] === undefined)
				return

			if (interaction.customId == 'surrender') {
				if (boards[uids[interaction.user.id]].withBot) {
					for (let i = 1; i <= 10; i++) {
						try {
							boards[uids[interaction.user.id]].draw()
							break
						}
						catch (error) {
							console.log('Draw failed ' + i + '. time(s) color: ' + boards[uids[interaction.user.id]].lastColor + ' ' + boards[uids[interaction.user.id]].lastColor.toString(16))
							if (i == 10)
								console.log(error)
						}
					}
					const attachment = new Discord.MessageAttachment('./tmp/boardPilkarzyki' + uids[interaction.user.id] + '.png')
					const img = await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({ files: [attachment] })
					const msg = '<@' + interaction.user.id + '> poddał się\n' + img.attachments.first().url

					let error = false
					do {
						try {
							await mainMessage.edit({ content: msg, files: [], components: [] })
						}
						catch (err) {
							error = true
							console.log(err)
							await sleep(1000)
						}
					} while (error)

					const bid = boards[uids[interaction.user.id]].uids[1 - boards[uids[interaction.user.id]].uids.indexOf(interaction.user.id)]
					boards[uids[interaction.user.id]].removeBoard()
					delete bots[bid]
					delete boards[uids[interaction.user.id]]
					delete uids[interaction.user.id]

					return
				}
				const ranking = JSON.parse(fs.readFileSync('./data/ranking.json'))
				const gameuids = boards[uids[interaction.user.id]].uids

				const tempuids = [...gameuids]
				let uidsString = ''
				for (const uid of tempuids.sort())
					uidsString += uid + '#'
				uidsString = uidsString.substring(0, uidsString.length - 1)

				if (ranking['najdluzszagrapilkarzyki'][uidsString] === undefined)
					ranking['najdluzszagrapilkarzyki'][uidsString] = 0
				ranking['najdluzszagrapilkarzyki'][uidsString] = Math.max(boards[uids[interaction.user.id]].totalMoves, ranking['najdluzszagrapilkarzyki'][uidsString])

				const rating1 = ranking['pilkarzyki'][gameuids[0]]['rating']
				const rating2 = ranking['pilkarzyki'][gameuids[1]]['rating']

				let winner, win
				if (gameuids[0] == interaction.user.id) {
					winner = gameuids[1]
					win = false
				}
				else {
					winner = gameuids[0]
					win = true
				}

				const newRating = Elo.calculate(rating1, rating2, win)

				ranking['pilkarzyki'][gameuids[0]]['rating'] = newRating['playerRating']
				ranking['pilkarzyki'][gameuids[1]]['rating'] = newRating['opponentRating']

				ranking['pilkarzyki'][interaction.user.id]['lost']++
				ranking['pilkarzyki'][winner]['won']++
				fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

				for (let i = 1; i <= 10; i++) {
					try {
						boards[uids[interaction.user.id]].draw()
						break
					}
					catch (error) {
						console.log('Draw failed ' + i + '. time(s) color: ' + boards[uids[interaction.user.id]].lastColor + ' ' + boards[uids[interaction.user.id]].lastColor.toString(16))
						if (i == 10)
							console.log(error)
					}
				}
				const attachment = new Discord.MessageAttachment('./tmp/boardPilkarzyki' + uids[interaction.user.id] + '.png')
				const img = await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({ files: [attachment] })
				const msg = '<@' + winner + '> wygrał przez poddanie się\n' + img.attachments.first().url

				let error = false
				do {
					try {
						await mainMessage.edit({ content: msg, files: [], components: [] })
					}
					catch (err) {
						error = true
						console.log(err)
						await sleep(1000)
					}
				} while (error)

				boards[uids[interaction.user.id]].removeBoard()
				delete boards[uids[interaction.user.id]]
				delete uids[winner]
				delete uids[interaction.user.id]

				return
			}
			else if (interaction.customId == 'remis') {
				if (boards[uids[interaction.user.id]].withBot)
					return

				if (boards[uids[interaction.user.id]].remis.includes(interaction.user.id))
					return

				boards[uids[interaction.user.id]].remis.push(interaction.user.id)
				if (boards[uids[interaction.user.id]].remis.length == 2) {
					for (let i = 1; i <= 10; i++) {
						try {
							boards[uids[interaction.user.id]].draw()
							break
						}
						catch (error) {
							console.log('Draw failed ' + i + '. time(s) color: ' + boards[uids[interaction.user.id]].lastColor + ' ' + boards[uids[interaction.user.id]].lastColor.toString(16))
							if (i == 10)
								console.log(error)
						}
					}
					const attachment = new Discord.MessageAttachment('./tmp/boardPilkarzyki' + uids[interaction.user.id] + '.png')
					const img = await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({ files: [attachment] })
					const msg = 'Remis\n' + img.attachments.first().url

					let error = false
					do {
						try {
							await mainMessage.edit({ content: msg, files: [], components: [] })
						}
						catch (err) {
							error = true
							console.log(err)
							await sleep(1000)
						}
					} while (error)

					const gameuids = boards[uids[interaction.user.id]].uids

					const ranking = JSON.parse(fs.readFileSync('./data/ranking.json'))
					const tempuids = [...gameuids]
					let uidsString = ''
					for (const uid of tempuids.sort())
						uidsString += uid + '#'
					uidsString = uidsString.substring(0, uidsString.length - 1)

					if (ranking['najdluzszagrapilkarzyki'][uidsString] === undefined)
						ranking['najdluzszagrapilkarzyki'][uidsString] = 0
					ranking['najdluzszagrapilkarzyki'][uidsString] = Math.max(boards[uids[interaction.user.id]].totalMoves, ranking['najdluzszagrapilkarzyki'][uidsString])
					fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

					boards[uids[interaction.user.id]].removeBoard()
					delete boards[uids[interaction.user.id]]
					delete uids[gameuids[0]]
					delete uids[gameuids[1]]

					return
				}
			}
			else if (!boards[uids[interaction.user.id]].withBot) {
				if (interaction.user.id != boards[uids[interaction.user.id]].turnUID())
					return

				const indexes = boards[uids[interaction.user.id]].possibleMovesIndexes()
				if (!indexes.includes(parseInt(interaction.customId)))
					return

				boards[uids[interaction.user.id]].currentMoveLength++
				if (!boards[uids[interaction.user.id]].move(indexes.indexOf(parseInt(interaction.customId))))
					return

				if (boards[uids[interaction.user.id]].turnUID() != interaction.user.id) {
					boards[uids[interaction.user.id]].longestMove[interaction.user.id] = Math.max(boards[uids[interaction.user.id]].currentMoveLength, boards[uids[interaction.user.id]].longestMove[interaction.user.id])
					boards[uids[interaction.user.id]].currentMoveLength = 0

					const ranking = JSON.parse(fs.readFileSync('./data/ranking.json'))
					if (ranking['najdluzszyruch'][interaction.user.id] === undefined)
						ranking['najdluzszyruch'][interaction.user.id] = 0
					ranking['najdluzszyruch'][interaction.user.id] = Math.max(ranking['najdluzszyruch'][interaction.user.id], boards[uids[interaction.user.id]].longestMove[interaction.user.id])

					fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))
				}
			}
			else {
				const gID = uids[interaction.user.id]
				const bid = boards[gID].uids[1 - boards[gID].uids.indexOf(interaction.user.id)]
				const indexes = boards[gID].possibleMovesIndexes()
				if (!indexes.includes(parseInt(interaction.customId)))
					return
				if (!boards[gID].move(indexes.indexOf(parseInt(interaction.customId))))
					return

				bots[bid].ext_board.makeMove([interaction.customId])

				for (let i = 1; i <= 10; i++) {
					try {
						boards[gID].draw()
						break
					}
					catch (error) {
						console.log('Draw failed ' + i + '. time(s) color: ' + boards[gID].lastColor + ' ' + boards[uids[interaction.user.id]].lastColor.toString(16))
						if (i == 10)
							console.log(error)
					}
				}
				let attachment = new Discord.MessageAttachment('./tmp/boardPilkarzyki' + gID + '.png')
				let img = await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({ files: [attachment] })

				let msg, components
				if (boards[gID].win != -1) {
					if (boards[gID].usernames[boards[gID].win] == interaction.user.username)
						msg = '<@' + interaction.user.id + '> wygrał!'
					else
						msg = 'Bot wygrał!'
				}
				else if (boards[gID].turnUID() == interaction.user.id) {
					components = buttons(gID)
					msg = 'Tura: <@' + interaction.user.id + '>'
				}
				else {
					components = []
					msg = 'Bot myśli...'
				}

				msg += '\n' + img.attachments.first().url

				let error = false
				do {
					try {
						const message = await mainMessage.edit({ content: msg, components: components })
						boards[gID].message = message
					}
					catch (err) {
						error = true
						console.log(err)
						await sleep(1000)
					}
				} while (error)

				if (boards[gID].win != -1) {
					boards[gID].removeBoard()
					delete bots[bid]
					delete boards[gID]
					delete uids[interaction.user.id]
					return
				}
				if (boards[gID].turnUID() == interaction.user.id)
					return

				const start = performance.now()
				bots[bid].ext_board.nodes = 0
				const move = bots[bid].ext_board.search(bots[bid].depth, boards[gID].turn, -2000, 2000)[1]
				const end = performance.now()

				if (move.length == 0) {
					error = false
					do {
						try {
							const message = await boards[gID].message.edit({ content: '<@' + interaction.user.id + '> wygrał!\n' + img.attachments.first().url, files: [], components: [] })
							boards[gID].message = message
						}
						catch (err) {
							error = true
							console.log(err)
							await sleep(1000)
						}
					} while (error)

					boards[gID].removeBoard()
					delete bots[bid]
					delete boards[gID]
					delete uids[interaction.user.id]

					return
				}

				const nodes = bots[bid].ext_board.nodes
				msg = 'Bot myślał ' + (Math.round((end - start) * 100) / 100) + 'ms i policzył ' + nodes + ' nodów (' + Math.round((nodes / ((end - start) / 1000)) * 100) / 100 + ' nodes/s)' + '\n' + img.attachments.first().url

				error = false
				do {
					try {
						const message = await boards[gID].message.edit({ content: msg, files: [], components: [] })
						boards[gID].message = message
					}
					catch (err) {
						error = true
						console.log(err)
						await sleep(1000)
					}
				} while (error)

				console.log((Math.round((end - start) * 100) / 100) + 'ms, ' + nodes + ' nodes, ' + Math.round((nodes / ((end - start) / 1000)) * 100) / 100 + ' nodes/s', move)
				let num = 0
				for (const dir of move) {
					num++
					await sleep(500)

					const ind = boards[gID].possibleMovesIndexes()
					if (!boards[gID].move(ind.indexOf(dir))) {
						console.log('AAAAAAAAAAAAaAAAAAaaa')
						return
					}

					if (num == move.length)
						continue

					for (let i = 1; i <= 10; i++) {
						try {
							boards[gID].draw()
							break
						}
						catch (errorr) {
							console.log('Draw failed ' + i + '. time(s) color: ' + boards[gID].lastColor + ' ' + boards[uids[interaction.user.id]].lastColor.toString(16))
							if (i == 10)
								console.log(errorr)
						}
					}

					attachment = new Discord.MessageAttachment('./tmp/boardPilkarzyki' + gID + '.png')
					img = await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({ files: [attachment] })

					msg = 'Bot myślał ' + (Math.round((end - start) * 100) / 100) + 'ms i policzył ' + nodes + ' nodów (' + Math.round((nodes / ((end - start) / 1000)) * 100) / 100 + ' nodes/s)' + '\n' + img.attachments.first().url

					error = false
					do {
						try {
							const message = await boards[gID].message.edit({ content: msg, files: [], components: [] })
							boards[gID].message = message
						}
						catch (err) {
							error = true
							console.log(err)
							await sleep(1000)
						}
					} while (error)
				}

				bots[bid].ext_board.makeMove(move)

				for (let i = 1; i <= 10; i++) {
					try {
						boards[gID].draw()
						break
					}
					catch (err) {
						console.log('Draw failed ' + i + '. time(s) color: ' + boards[gID].lastColor + ' ' + boards[uids[interaction.user.id]].lastColor.toString(16))
						if (i == 10)
							console.log(err)
					}
				}

				attachment = new Discord.MessageAttachment('./tmp/boardPilkarzyki' + gID + '.png')
				img = await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({ files: [attachment] })

				if (boards[bid].win != -1) {
					if (boards[bid].uids[boards[bid].win] == interaction.user.id)
						msg = '<@' + interaction.user.id + '> wygrał!'
					else
						msg = 'Bot wygrał!'
					msg += '\n' + img.attachments.first().url
					error = false
					do {
						try {
							const message = await boards[gID].message.edit({ content: msg, files: [], components: [] })
							boards[gID].message = message
						}
						catch (err) {
							error = true
							console.log(err)
							await sleep(1000)
						}
					} while (error)

					boards[gID].removeBoard()
					delete bots[bid]
					delete boards[gID]
					delete uids[interaction.user.id]
					return
				}

				msg = 'Tura: <@' + interaction.user.id + '>\n' + img.attachments.first().url

				error = false
				do {
					try {
						const message = await boards[gID].message.edit({ content: msg, files: [], components: buttons(gID) })
						boards[gID].message = message
					}
					catch (err) {
						error = true
						console.log(err)
						await sleep(1000)
					}
				} while (error)

				return
			}

			for (let i = 1; i <= 10; i++) {
				try {
					boards[uids[interaction.user.id]].draw()
					break
				}
				catch (error) {
					console.log('Draw failed ' + i + '. time(s) color: ' + boards[uids[interaction.user.id]].lastColor + ' ' + boards[uids[interaction.user.id]].lastColor.toString(16))
					if (i == 10)
						console.log(error)
				}
			}
			const attachment = new Discord.MessageAttachment('./tmp/boardPilkarzyki' + uids[interaction.user.id] + '.png')

			let msg, components
			if (boards[uids[interaction.user.id]].win == -1) {
				msg = 'Tura: <@' + boards[uids[interaction.user.id]].turnUID() + '> '

				if (boards[uids[interaction.user.id]].remis.length > 0)
					msg += ' (' + boards[uids[interaction.user.id]].remis.length + '/2 osoby poprosiły o remis)'

			}
			else {
				msg = '<@' + boards[uids[interaction.user.id]].uids[boards[uids[interaction.user.id]].win] + '> wygrał'
			}

			if (boards[uids[interaction.user.id]].win == -1)
				components = buttons(uids[interaction.user.id])
			else
				components = []

			// boards[uids[interaction.user.id]].message.edit({components: []})
			const img = await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({ files: [attachment] })

			// var message=await boards[uids[interaction.user.id]].message.channel.send({content: msg, files: [attachment], components: components})
			msg += '\n' + img.attachments.first().url

			let error = false
			do {
				try {
					const message = await mainMessage.edit({ content: msg, files: [], components: components })
					boards[uids[interaction.user.id]].message = message
				}
				catch (err) {
					error = true
					console.log(err)
					await sleep(1000)
				}
			} while (error)

			if (boards[uids[interaction.user.id]].win != -1) {
				const ranking = JSON.parse(fs.readFileSync('./data/ranking.json'))
				const gameuids = boards[uids[interaction.user.id]].uids

				const tempuids = [...gameuids]
				let uidsString = ''
				for (const uid of tempuids.sort())
					uidsString += uid + '#'
				uidsString = uidsString.substring(0, uidsString.length - 1)

				if (ranking['najdluzszagrapilkarzyki'][uidsString] === undefined)
					ranking['najdluzszagrapilkarzyki'][uidsString] = 0
				ranking['najdluzszagrapilkarzyki'][uidsString] = Math.max(boards[uids[interaction.user.id]].totalMoves, ranking['najdluzszagrapilkarzyki'][uidsString])

				const player1 = ranking['pilkarzyki'][gameuids[0]]['rating']
				const player2 = ranking['pilkarzyki'][gameuids[1]]['rating']

				let newRating
				if (boards[uids[interaction.user.id]].win == 0) {
					newRating = Elo.calculate(player1, player2, true)
					ranking['pilkarzyki'][gameuids[0]]['won']++
					ranking['pilkarzyki'][gameuids[1]]['lost']++
				}
				else {
					newRating = Elo.calculate(player1, player2, false)
					ranking['pilkarzyki'][gameuids[0]]['lost']++
					ranking['pilkarzyki'][gameuids[1]]['won']++
				}

				ranking['pilkarzyki'][gameuids[0]]['rating'] = newRating['playerRating']
				ranking['pilkarzyki'][gameuids[1]]['rating'] = newRating['opponentRating']

				fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

				boards[uids[interaction.user.id]].removeBoard()
				delete boards[uids[interaction.user.id]]
				delete uids[gameuids[0]]
				delete uids[gameuids[1]]
			}

			return
		}

		let uid1, uid2, usernames
		if (interaction.isCommand !== undefined && interaction.isCommand()) {
			await interaction.deferReply()

			if (interaction.options.getSubcommand() === 'player') {
				const secondUser = interaction.options.getUser('gracz')
				uid2 = secondUser.id
				uid1 = interaction.user.id
				usernames = [interaction.user.username, secondUser.username]
			}
			else if (interaction.options.getSubcommand() === 'bot') {
				const depth = interaction.options.getInteger('depth')
				if (depth <= 0 || depth > config.pilkarzykiBot.maxDepth) {
					interaction.editReply('Podałeś złą głębokość. Powinna być w przedziale [1, ' + config.pilkarzykiBot.maxDepth + ']')
					return
				}
				const uid = interaction.user.id
				const bid = botID
				const id = gameID
				botID++
				usernames = [interaction.user.username, 'Bot']

				let evalFunctionPath = []
				for (const func of config.pilkarzykiBot.evaluationFunctionConfig) {
					if (eval(func.condition)) {
						evalFunctionPath = func.path
						break
					}
				}
				if (evalFunctionPath === []) {
					interaction.editReply('Nie znaleziono odpowiedniej funkcji evaluacyjnej (być może config jest źle skonfigurowany)')
					return
				}
				evalFunctionPath = evalFunctionPath[Math.floor(Math.random() * evalFunctionPath.length)]
				console.log('evalFunctionPath = ' + evalFunctionPath)

				uids[uid] = gameID
				boards[gameID] = new Board(50, 50, 50, [uid, bid], usernames, gameID, true)
				bots[bid] = { gameID: gameID, ext_board: new ExtBoard(boards[gameID], 9, 13, require(evalFunctionPath)), depth: depth }
				gameID++

				for (let i = 1; i <= 10; i++) {
					try {
						boards[id].draw()
						break
					}
					catch (error) {
						console.log('Draw failed ' + i + '. time(s) color: ' + boards[id].lastColor + ' ' + boards[id].lastColor.toString(16))
						if (i == 10)
							console.log(error)
					}
				}

				const attachment = new Discord.MessageAttachment('./tmp/boardPilkarzyki' + id + '.png')
				const img = await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({ files: [attachment] })

				const msg = 'Tura: <@' + boards[id].turnUID() + '>\n' + img.attachments.first().url

				let error = false
				do {
					try {
						const message = await interaction.editReply({ content: msg, files: [], components: buttons(id) })
						boards[id].message = message
					}
					catch (err) {
						error = true
						console.log(err)
						await sleep(1000)
					}
				} while (error)

				return
			}
		}
		else {
			interaction.reply('Deprecated (zbyt dużo pisania przy nie slash komendach)')
			return
		}


		if (uids[uid1] !== undefined) {
			interaction.editReply('Już grasz w grę')
			return
		}
		if (uids[uid2] !== undefined) {
			interaction.editReply('<@' + uid2 + '> już gra w grę')
			return
		}

		if (uid1 === uid2) {
			interaction.editReply('Nie możesz grać z samym sobą')
			return
		}

		const ranking = JSON.parse(fs.readFileSync('./data/ranking.json'))
		if (ranking['pilkarzyki'][uid1] === undefined)
			ranking['pilkarzyki'][uid1] = { lost: 0, won: 0 }
		if (ranking['pilkarzyki'][uid1]['rating'] === undefined)
			ranking['pilkarzyki'][uid1]['rating'] = 1500

		if (ranking['pilkarzyki'][uid2] === undefined)
			ranking['pilkarzyki'][uid2] = { lost: 0, won: 0 }
		if (ranking['pilkarzyki'][uid2]['rating'] === undefined)
			ranking['pilkarzyki'][uid2]['rating'] = 1500

		fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

		for (let i = 0; i < accepts.length; i++) {
			if (accepts[i]['uidToAccept'] == uid2 && accepts[i]['acceptFrom'] == uid1) {
				await interaction.editReply({ content: 'Już wyzwałeś tą osobę.' })
				return
			}
		}

		const newAccept = { usernames: usernames, uids: uids, uidToAccept: uid2, acceptFrom: uid1 }

		const row = new Discord.MessageActionRow()
			.addComponents(
				new Discord.MessageButton()
					.setLabel('Tak')
					.setCustomId('pilkarzyki#acceptYes#' + uid1 + '#' + uid2)
					.setStyle('PRIMARY'),
				new Discord.MessageButton()
					.setLabel('Nie')
					.setCustomId('pilkarzyki#acceptNo#' + uid1 + '#' + uid2)
					.setStyle('PRIMARY')
			)

		const msg = '<@' + uid2 + '>: ' + usernames[0] + ' chce z tobą zagrać'

		let error = false
		do {
			try {
				const message = await interaction.editReply({ content: msg, components: [row], fetchReply: true })
				newAccept['message'] = message
			}
			catch (err) {
				error = true
				console.log(err)
				await sleep(1000)
			}
		} while (error)
		accepts.push(newAccept)
	}
}
