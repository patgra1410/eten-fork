import Discord from 'discord.js';
import config from './config.json';
import fs from 'fs';
const threadwatcher = require('./lib/threadwatcher')
import createRequiredFiles from './lib/createRequiredFiles'
import cronJobs from './lib/cronJobs';
import randomSounds from './lib/randomSoundOnVC';
import librus from './lib/librus';
import incrementDays from './lib/incrementDays';
import * as discordEvents from './lib/discordEvents'

// LOL
type SlashCommandFunction = ((interaction: Discord.CommandInteraction|Discord.ButtonInteraction|Discord.Message, args?: string) => Promise<unknown>);
declare module 'discord.js' {
	interface Client {
		commands: Discord.Collection<string, {data: string, execute: SlashCommandFunction, onMessage?: Function}>
		imageCdnChannel: Discord.TextChannel
	}
}

const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_MEMBERS, Discord.Intents.FLAGS.GUILD_VOICE_STATES, Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS], partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })
client.commands = new Discord.Collection()
// client.textTriggers = new Discord.Collection()

const commandFiles = fs.readdirSync('./commands').filter((file: string) => file.endsWith('.js'))

async function updateSlashCommands() {
	const slashCommands = []
	for (const file of commandFiles) {
		const command = require(`./commands/${file}`)
		client.commands.set(command.data.name, command)

		slashCommands.push(command.data.toJSON())

		for (const alias in command.aliases)
			client.commands.set(command.aliases[alias], command)
	}
	await client.application?.commands.set(slashCommands)
	// console.log(response)
}

threadwatcher.newReply.on('newPost', async (board: string, threadID: string, postID: string, text: string, attachmentUrl: string) => {
	// console.log(`${board}/${threadID}/p${postID}`)
	// console.log(text)
	// console.log(attachmentUrl)
	await client.imageCdnChannel.send({
		content: `<https://boards.4channel.org/${board}/thread/${threadID}#p${postID}>`,
		files: [attachmentUrl]
	})
	threadwatcher.changePo1stTimeoutEvent.emit('subtractTimeout')
})

client.once('ready', async () => {
	createRequiredFiles()

	client.user.setStatus('online')
	client.user.setActivity('twoja stara')

	updateSlashCommands()
	cronJobs(client)

	console.log(`Ready! Logged in as ${client.user.tag}`)

	client.imageCdnChannel = await client.channels.fetch(config.autoMemesChannel) as Discord.TextChannel

	incrementDays()
	librus(client)
	randomSounds(client)
})

client.on('messageReactionAdd', discordEvents.messageReactionAdd)
client.on('messageReactionRemove', discordEvents.messageReactionRemove)
client.on('messageCreate', discordEvents.messageCreate)
client.on('interactionCreate', discordEvents.interactionCreate)

client.login(config.token)
