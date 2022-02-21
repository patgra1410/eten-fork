'use strict'

const fetch = require('node-fetch')
const fs = require('fs')
const crypto = require('crypto')
const util = require('util')
const streamPipeline = util.promisify(require('stream').pipeline)

function get_url_extension(url) { // nie kradzione wcale
	return url.split(/[#?]/)[0].split('.').pop().trim()
}

async function hashFile(attachment, message) {
	console.time('Downloading')
	const extension = get_url_extension(attachment.url)
	const imgResult = await fetch(attachment.url)
	await streamPipeline(imgResult.body, fs.createWriteStream('./data/tmp.' + extension))
	console.timeEnd('Downloading')

	console.time('Hashing')
	const img = fs.readFileSync('./data/tmp.' + extension)
	const hashSum = crypto.createHash('sha256')
	hashSum.update(img)
	const hexHash = hashSum.digest('hex')

	const hashes = require('../data/hashes.json')

	if (!(message.guildId in hashes))
		hashes[message.guildId] = {}

	if (hexHash in hashes[message.guildId]) {
		message.reply('repost :grimacing:\n' + hashes[message.guildId][hexHash])
	}
	else {
		hashes[message.guildId][hexHash] = 'https://discord.com/channels/' + message.guildId + '/' + message.channelId + '/' + message.id
		fs.writeFileSync('./data/hashes.json', JSON.stringify(hashes, null, 2))
	}

	console.timeEnd('Hashing')
}

async function hashFileFromMessageContent(message) {
	const regex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig
	let match
	while (match = regex.exec(message.content))
		hashFile({ url: message.content.slice(regex.lastIndex - match[0].length, regex.lastIndex) }, message)
}

module.exports = {
	hashFile,
	hashFileFromMessageContent
}