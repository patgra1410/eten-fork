import path from 'path'
import fetch from 'node-fetch'
import util from 'util'
import stream from 'stream'
import { Message } from 'discord.js'
const streamPipeline = util.promisify(stream.pipeline)
// const streamPipeline = util.promisify(require('stream').pipeline)
import formData from 'form-data'
import fs from 'fs'
import config from '../config.json'

export default async function(message: Message<boolean>) {
	if (config.archiwum.eneabled && message.channel.id == config.archiwum.channel && message.attachments.size) {
		if (message.content.length == 0) {
			await message.reply('Tagi są wymagane (zobacz opis kanału)')
			return
		}

		const url = message.attachments.first().url
		const ext = path.extname(url)
		const res = await fetch(url)
		await streamPipeline(res.body, fs.createWriteStream('tmp/tmparchive' + ext))

		const form = new formData()
		const stats = fs.statSync('tmp/tmparchive' + ext)
		const size = stats.size
		form.append('image', fs.createReadStream('tmp/tmparchive' + ext), { knownLength: size })
		form.append('password', config.archiwum.uploadPassword)
		form.append('tags', message.content)
		form.append('author', message.author.username + '#' + message.author.discriminator)

		console.log(config.archiwum.upload)

		const send = await fetch(config.archiwum.uploadURL, {
			method: 'POST',
			body: form
		})

		if (!send.ok) {
			await message.reply(send.statusText + ' ' + send.status)
			return
		}

		const text = await send.text()
		if (text != 'ok') await message.reply(text)
		else await message.reply('Dodano!')
	}
}