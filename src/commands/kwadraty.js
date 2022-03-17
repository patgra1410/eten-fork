const Board = require('../kwadratyRenderer.js')
const Discord = require('discord.js')
const fs = require('fs')
const Elo = require('elo-rating')
const { SlashCommandBuilder, SlashCommandUserOption } = require('@discordjs/builders')

const uids = {}
const boards = {}
let gameID = 1
let accepts = []

function buttons() {
	const row = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId('kwadraty#remis')
				.setLabel('Remis')
				.setStyle('SECONDARY'),
			new Discord.MessageButton()
				.setCustomId('kwadraty#surrender')
				.setLabel('Poddaj się')
				.setStyle('SECONDARY')
		)

	return [row]
}

module.exports = {
	data: new SlashCommandBuilder()
		.setName('kwadraty')
		.setDescription('Ta gra co Staś pokazywał w pierwszej klasie')
		.addUserOption(
			new SlashCommandUserOption()
				.setName('gracz')
				.setDescription('Drugi gracz')
				.setRequired(true)
		),
	async execute(interaction, args) {
		if (interaction.isButton !== undefined && interaction.isButton()) {
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

					boards[id].draw()
					const attachment = new Discord.MessageAttachment('./tmp/boardKwadraty' + id + '.png')
					const img = await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({ files: [attachment] })

					const msg = 'Tura: <@' + boards[id].turnUID() + '>\n' + img.attachments.first().url

					await interaction.update({ content: msg, files: [], components: buttons() })

					boards[id].message = rightAccept.message
				}
			}

			if (uids[interaction.user.id] === undefined)
				return

			if (interaction.customId == 'surrender') {
				const ranking = JSON.parse(fs.readFileSync('./data/ranking.json'))
				const gameuids = boards[uids[[interaction.user.id]]].uids

				const rating1 = ranking['kwadraty'][gameuids[0]]['rating']
				const rating2 = ranking['kwadraty'][gameuids[1]]['rating']

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

				ranking['kwadraty'][gameuids[0]]['rating'] = newRating['playerRating']
				ranking['kwadraty'][gameuids[1]]['rating'] = newRating['opponentRating']

				ranking['kwadraty'][interaction.user.id]['lost']++
				ranking['kwadraty'][winner]['won']++
				fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

				boards[uids[[interaction.user.id]]].draw()
				const attachment = new Discord.MessageAttachment('./tmp/boardKwadraty' + uids[[interaction.user.id]] + '.png')
				const img = await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({ files: [attachment] })
				const msg = '<@' + winner + '> wygrał przez poddanie się\n' + img.attachments.first().url
				await interaction.update({ content: msg, files: [], components: [] })

				boards[uids[[interaction.user.id]]].removeBoard()
				delete boards[uids[[interaction.user.id]]]
				delete uids[winner]
				delete uids[interaction.user.id]

				return
			}
			else if (interaction.customId == 'remis') {
				if (boards[uids[interaction.user.id]].remis.includes(interaction.user.id))
					return

				boards[uids[interaction.user.id]].remis.push(interaction.user.id)
				if (boards[uids[interaction.user.id]].remis.length == 2) {
					boards[uids[[interaction.user.id]]].draw()
					const attachment = new Discord.MessageAttachment('./tmp/boardKwadraty' + uids[[interaction.user.id]] + '.png')
					const img = await interaction.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({ files: [attachment] })
					const msg = 'Remis\n' + img.attachments.first().url
					await interaction.update({ content: msg, files: [], components: [] })

					const gameuids = boards[uids[interaction.user.id]].uids
					boards[uids[[interaction.user.id]]].removeBoard()
					delete boards[uids[interaction.user.id]]
					delete uids[gameuids[0]]
					delete uids[gameuids[1]]

					return
				}
			}
		}

		let uid1, uid2, usernames
		if (interaction.isCommand !== undefined && interaction.isCommand()) {
			const secondUser = interaction.options.getUser('gracz')
			uid2 = secondUser.id
			uid1 = interaction.user.id
			usernames = [interaction.user.username, secondUser.username]
		}
		else {
			if (args === undefined)
				return


			if (args.length >= 1 && args[0] == 'save') {
				for (const [key, value] of Object.entries(boards))
					value.dump()

				return
			}

			if (args.length < 1 || interaction.mentions.users.length == 0) {
				interaction.reply('Potrzebny jest drugi gracz')
				return
			}
			uid2 = interaction.mentions.users.keys().next().value
			uid1 = interaction.author.id
			usernames = [interaction.author.username, interaction.mentions.users.entries().next().value[1].username]
		}

		if (uids[uid1] !== undefined) {
			interaction.reply('Już grasz w grę')
			return
		}
		if (uids[uid2] !== undefined) {
			interaction.reply('<@' + uid2 + '> już gra w grę')
			return
		}

		if (uid1 === uid2) {
			interaction.reply('Nie możesz grać z samym sobą')
			return
		}

		const ranking = JSON.parse(fs.readFileSync('./data/ranking.json'))
		if (ranking['kwadraty'][uid1] === undefined)
			ranking['kwadraty'][uid1] = { lost: 0, won: 0 }
		if (ranking['kwadraty'][uid1]['rating'] === undefined)
			ranking['kwadraty'][uid1]['rating'] = 1500

		if (ranking['kwadraty'][uid2] === undefined)
			ranking['kwadraty'][uid2] = { lost: 0, won: 0 }
		if (ranking['kwadraty'][uid2]['rating'] === undefined)
			ranking['kwadraty'][uid2]['rating'] = 1500

		fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

		for (let i = 0; i < accepts.length; i++) {
			if (accepts[i]['uidToAccept'] == uid2 && accepts[i]['acceptFrom'] == uid1) {
				await interaction.reply({ content: 'Już wyzwałeś tą osobę.' })
				return
			}
		}

		const newAccept = { usernames: usernames, uids: uids, uidToAccept: uid2, acceptFrom: uid1 }

		const row = new Discord.MessageActionRow()
			.addComponents(
				new Discord.MessageButton()
					.setLabel('Tak')
					.setCustomId('kwadraty#acceptYes#' + uid1 + '#' + uid2)
					.setStyle('PRIMARY'),
				new Discord.MessageButton()
					.setLabel('Nie')
					.setCustomId('kwadraty#acceptNo#' + uid1 + '#' + uid2)
					.setStyle('PRIMARY')
			)

		const msg = '<@' + uid2 + '>: ' + usernames[0] + ' chce z tobą zagrać'
		const message = await interaction.reply({ content: msg, components: [row], fetchReply: true })
		// console.log(message)
		newAccept['message'] = message
		accepts.push(newAccept)
	},
	async onMessage(message) {
		if (uids[message.author.id] === undefined)
			return
		const gid = uids[message.author.id]

		if (boards[gid].turnUID() != message.author.id)
			return

		if (!boards[gid].move(message.content))
			return

		boards[gid].draw()
		const attachment = new Discord.MessageAttachment('./tmp/boardKwadraty' + gid + '.png')
		const img = await message.client.guilds.cache.get('856926964094337044').channels.cache.get('892842178143997982').send({ files: [attachment] })

		let msg, components
		if (boards[gid].win == -1) {
			msg = 'Tura: <@' + boards[gid].turnUID() + '> '
			if (boards[gid].remis.length > 0)
				msg += ' (' + boards[gid].remis.length + '/2 osoby poprosiły o remis)'

		}
		else {
			msg = '<@' + boards[gid].uids[boards[gid].win] + '> wygrał'
		}

		if (boards[gid].win == -1)
			components = buttons()
		else
			components = []

		msg += '\n' + img.attachments.first().url
		const message2 = await boards[gid].message.edit({ content: msg, components: components })
		boards[gid].message = message2

		message.delete()

		if (boards[gid].win != -1) {
			const ranking = JSON.parse(fs.readFileSync('./data/ranking.json'))
			const gameuids = boards[gid].uids

			const player1 = ranking['kwadraty'][gameuids[0]]['rating']
			const player2 = ranking['kwadraty'][gameuids[1]]['rating']

			let newRating
			if (boards[gid].win == 0) {
				newRating = Elo.calculate(player1, player2, true)
				ranking['kwadraty'][gameuids[0]]['won']++
				ranking['kwadraty'][gameuids[1]]['lost']++
			}
			else {
				newRating = Elo.calculate(player1, player2, false)
				ranking['kwadraty'][gameuids[0]]['lost']++
				ranking['kwadraty'][gameuids[1]]['won']++
			}

			ranking['kwadraty'][gameuids[0]]['rating'] = newRating['playerRating']
			ranking['kwadraty'][gameuids[1]]['rating'] = newRating['opponentRating']

			fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking))

			boards[gid].removeBoard()
			delete boards[gid]
			delete uids[gameuids[0]]
			delete uids[gameuids[1]]
		}
	}
}