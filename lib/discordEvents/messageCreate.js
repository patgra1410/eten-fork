'use strict'

const path = require('path')
const fetch = require('node-fetch')
const util = require('util')
const streamPipeline = util.promisify(require('stream').pipeline)
const fs = require('fs')
const formData = require('form-data')
const jajco = require('../jajco.js')
const config = require('../../config.json')

module.exports = async function(message) {
	const client = message.client

	if (message.author.bot) return
	if (!client.application?.owner) await client.application?.fetch()

	if (message.channel.id === '813703962838564865') {
		try {
			await message.react('<:among_us:754362953104359747>')
		}
		catch (error) {
			console.error('Failed to react in #amogus channel')
		}
	}

	if (message.channel.id === '854294979849748510') {
		try {
			await message.react('❤')
		}
		catch (error) {
			console.error('Failed to react in #bardzo-wazny-kanal')
		}
	}

	// TODO: ===
	if (message.content.length == 4) {
		await client.commands.get('kwadraty').onMessage(message)
	}

	if (message.content.startsWith(config.prefix)) {
		const args = message.content.slice(config.prefix.length).trim().split(/ +/)
		const command = args.shift().toLowerCase()

		if (!client.commands.has(command)) return

		message.reply('Deprecated. Jebać (wszystkie) nie slashowe komendy')
		return
	}

	jajco.run(message)

	if (message.content.toLowerCase().search('rozpierdol kota') != -1) {
		client.commands.get('cursedkoteł').execute(message)
	}

	if (/https?:\/\/media.discordapp.net\/attachments\/[0-9]+\/[0-9]+\/[^ ^\n\t\r]+\.(webm|mp4|mov|avi|flv|mkv|wmv|m4v)/g.test(message.content)) {
		const foundMediaLinks = message.content.match(/https?:\/\/media.discordapp.net\/attachments\/[0-9]+\/[0-9]+\/[^ ^\n\t\r]+\.(webm|mp4|mov|avi|flv|mkv|wmv|m4v)/g)
		for (const mediaLink of foundMediaLinks)
			message.reply(`${mediaLink.replace(/media/, 'cdn').replace(/net/, 'com')}\nFucking goofy ass media link`)
	}

	if (config.archiwum.eneabled && message.channel.id == config.archiwum.channel && message.attachments.size) {
		if (message.content.length == 0) {
			await message.reply('Tagi są wymagane (zobacz opis kanału)')
			return
		}

		const url = message.attachments.first().url
		const ext = path.extname(url)
		const res = await fetch(url)
		await streamPipeline(res.body, fs.createWriteStream('data/tmp' + ext))

		const form = formData()
		const stats = fs.statSync('data/tmp' + ext)
		const size = stats.size
		form.append('image', fs.createReadStream('data/tmp' + ext), { knownLength: size })
		form.append('password', config.archiwum.uploadPassword)
		form.append('tags', message.content)
		form.append('author', message.author.username + '#' + message.author.discriminator)

		console.log(config.archiwum.upload)

		const send = await fetch(config.archiwum.uploadURL, {
			method: 'POST',
			body: form,
		})

		if (!send.ok) {
			await message.reply(send.statusText + ' ' + send.status)
			return
		}

		const text = await send.text()
		if (text != 'ok') {await message.reply(text)}
		else {await message.reply('Dodano!')}
	}
}
