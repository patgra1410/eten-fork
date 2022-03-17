import { Client, Collection, GuildMember } from "discord.js"

import config from '../config.json'
import fs from 'fs'
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from '@discordjs/voice'
const player = createAudioPlayer()
let client: Client<boolean>

function sleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms)
	})
}

async function randomSoundOnVoice() {
	const channels = client.guilds.cache.get(config.guild)?.channels.cache.filter(c => c.type == 'GUILD_VOICE')

	let isThereAnyone = false
	for (const [id, channel] of channels) {
		if ((channel.members as Collection<string, GuildMember>).size == 0 || Math.random() >= config.randomSoundeffectChance)
			continue
		isThereAnyone = true

		const connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator
		})

		const files = fs.readdirSync('./soundeffects')

		const resource = createAudioResource('./soundeffects/' + files[Math.floor(Math.random() * files.length)])
		connection.subscribe(player)
		player.play(resource)
		while (player.state.status != 'idle')
			await sleep(100)
		connection.disconnect()
	}

	setTimeout(randomSoundOnVoice, (isThereAnyone ? 1000 * 60 : 1000 * 60 * 15))
}

export default async function(cl: Client<boolean>) {
	client = cl
	if (config.playRandomSoundeffects)
		setTimeout(randomSoundOnVoice, 1000 * 60)
}
