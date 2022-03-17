import { Client, Message, TextChannel } from "discord.js"

import fs from 'fs'

let coChannel: string = undefined
let coUsers: any

function deleteMessage(message: Message<boolean>) {
	message.delete()
}

function updateMessage(message: Message<boolean>) {
	message.edit('jajco')
}

async function coCountdown(client: Client<boolean>) {
	try {
		if (coUsers.count == 0)
			clearInterval(coUsers.interval)

		if (coUsers.count >= 0) {
			(client.channels.cache.get(coChannel) as TextChannel).send(String(coUsers.count)).then(message => {
				setTimeout(deleteMessage.bind(null, message), 10000 + parseInt(message.content) * 1000)
			})

			coUsers.count--
			if (coUsers.count >= 0)
				return
		}
		const msg = '<@' + coUsers.jajco + '> skisł*ś'

		const ranking = JSON.parse(fs.readFileSync('./data/ranking.json', 'utf-8'))
		if (ranking['jajco'][coUsers.jajco] === undefined)
			ranking['jajco'][coUsers.jajco] = 0
		ranking['jajco'][coUsers.jajco]++

		fs.writeFileSync('./data/ranking.json', JSON.stringify(ranking));

		(client.channels.cache.get(coChannel) as TextChannel).send(msg)
		coChannel = undefined
		coUsers = undefined
	}
	catch (error) {
		console.log(error)
	}
}

export async function run(message: Message) {
	// const settings = require(`${process.cwd()}/data/settings.json`)
	const settings = JSON.parse(fs.readFileSync('./data/settings.json', 'utf-8'));
	let isBanned = false

	if (settings.jajco && (settings.jajco.bannedGuilds.includes(message.guild.id) || settings.jajco.bannedUsers.includes(message.author.id)))
		isBanned = true

	const messageLower = message.content.toLowerCase()
	if ((messageLower.endsWith(' co') || messageLower.endsWith(' co?') || messageLower == 'co' || messageLower == 'co?') && coChannel === undefined && !isBanned) {
		coUsers = {
			jajco: message.author.id,
			daszek: [],
			count: 10,
			interval: undefined,
			messages: []
		}
		coChannel = message.channel.id

		coUsers.interval = setInterval(coCountdown.bind(null, message.client), 1000)

		const msg = await message.channel.send('https://cdn.discordapp.com/attachments/455236204477022208/899223760488497242/109.173.177.194-2021.10.05.16.37.49.jpg')
		setTimeout(updateMessage.bind(null, msg), 25000)
	}
	else if (message.content == '^' && coChannel !== undefined) {
		coUsers.daszek.push(message.author.id)
	}
	else if (coChannel !== undefined && message.author.id === coUsers.jajco && message.mentions.users.size > 0 && !coUsers.daszek.includes(message.mentions.users.keys().next().value) && message.type != 'REPLY') {
		const uid = message.mentions.users.keys().next().value
		if (uid == message.client.user.id) {
			if (Math.random() <= 0.01 && !coUsers.daszek.includes('257119850026106880')) {
				message.channel.send('<@257119850026106880>')
				coUsers.jajco = '257119850026106880'
				return
			}
			else {
				message.channel.send('Twoja stara')
				return
			}
		}
		coUsers.jajco = uid
	}
}