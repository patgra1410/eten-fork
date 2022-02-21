'use strict'

const fetch = require('node-fetch')
const fs = require('fs')
const crypto = require('crypto')
const util = require('util')
const streamPipeline = util.promisify(require('stream').pipeline)

function get_url_extension(url) { // nie kradzione wcale
	return url.split(/[#?]/)[0].split('.').pop().trim()
}

function updateHashes() {
	const allHashes = require('../data/hashes.json')
	const newHashes = {}

	for (const [guildId, hashes] of Object.entries(allHashes)) {
		newHashes[guildId] = {}
		for (const [hash, link] of Object.entries(hashes)) {
			const splits = link.split('/')
			newHashes[guildId][hash] = splits[splits.length - 3] + ',' + splits[splits.length - 2] + ',' + splits[splits.length - 1]
		}
	}

	fs.writeFileSync('./data/hashes.json', JSON.stringify(newHashes, null, 2))
}

async function hashFile(attachment, message) {
	if (message.author.id == message.client.id)
		return

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
		const splits = hashes[message.guildId][hexHash].split(',')
		const link = 'https://discord.com/channels/' + splits[0] + '/' + splits[1] + '/' + splits[2]
		message.reply('repost :grimacing:\n' + link)
	}
	else {
		hashes[message.guildId][hexHash] = message.guildId + ',' + message.channelId + ',' + message.id
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
	hashFileFromMessageContent,
	updateHashes
}