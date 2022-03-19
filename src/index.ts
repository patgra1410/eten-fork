/* eslint-disable @typescript-eslint/no-var-requires */
import Discord from "discord.js";
import config from "./config.json";
import fs from "fs";
const threadwatcher = require("./lib/threadwatcher");
import createRequiredFiles from "./lib/createRequiredFiles";
import cronJobs from "./lib/cronJobs";
import randomSounds from "./lib/randomSoundOnVC";
import initLibrusManager from "./lib/librusManager";
import incrementDays from "./lib/incrementDays";
import * as discordEvents from "./lib/discordEvents";
import { SlashCommandBuilder } from "@discordjs/builders";

// LOL
type SlashCommandFunction = ((interaction: Discord.CommandInteraction|Discord.ButtonInteraction|Discord.Message, args?: string) => Promise<unknown>);
interface SlashCommandFile {
	__esModule: boolean;
	data: SlashCommandBuilder;
	execute: SlashCommandFunction;
	aliases?: string[];
	onMessage?: SlashCommandFunction;
}
declare module "discord.js" {
	interface Client {
		commands: Discord.Collection<string, SlashCommandFile>;
		imageCdnChannel: Discord.TextChannel;
	}
}

export const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MESSAGES, Discord.Intents.FLAGS.GUILD_MEMBERS, Discord.Intents.FLAGS.GUILD_VOICE_STATES, Discord.Intents.FLAGS.GUILD_MESSAGE_REACTIONS], partials: ["MESSAGE", "CHANNEL", "REACTION"] });
client.commands = new Discord.Collection();

async function updateSlashCommands() {
	const slashCommands = [];
	// for javascript command files
	const commandFiles: string[] = fs.readdirSync(`${__dirname}/commands`).filter((file: string) => (file.endsWith(".js") && !file.startsWith("ts_")));
	for (const file of commandFiles) {
		const command: SlashCommandFile = require(`${__dirname}/commands/${file}`);
		client.commands.set(command.data.name, command);
		slashCommands.push(command.data.toJSON());
		for (const alias in command.aliases)
			client.commands.set(command.aliases[alias], command);
	}
	// for typescript command files
	const tsCommandFiles: string[] = fs.readdirSync(`${__dirname}/commands`).filter((file: string) => (file.endsWith(".js") && file.startsWith("ts_")));
	for (const file of tsCommandFiles) {
		const command: SlashCommandFile = await import(`${__dirname}/commands/${file}`);
		client.commands.set(command.data.name, command);
		slashCommands.push(command.data.toJSON());
		for (const alias in command.aliases)
			client.commands.set(command.aliases[alias], command);
	}
	await client.application?.commands.set(slashCommands);
}

threadwatcher.newReply.on("newPost", async (board: string, threadID: string, postID: string, text: string, attachmentUrl: string) => {
	await client.imageCdnChannel.send({
		content: `<https://boards.4channel.org/${board}/thread/${threadID}#p${postID}>`,
		files: [attachmentUrl]
	});
	threadwatcher.changePo1stTimeoutEvent.emit("subtractTimeout");
});

client.once("ready", async () => {
	client.user.setStatus("online");
	client.user.setActivity("MASNY BEN - LOUDA", { type: "LISTENING" });
	await updateSlashCommands();

	createRequiredFiles();
	client.imageCdnChannel = await client.channels.fetch(config.autoMemesChannel) as Discord.TextChannel;
	cronJobs(client);
	await initLibrusManager();
	incrementDays();
	randomSounds();
	console.log(`Ready! Logged in as ${client.user.tag}`);
});

client.on("messageReactionAdd", discordEvents.messageReactionAdd);
client.on("messageReactionRemove", discordEvents.messageReactionRemove);
client.on("messageCreate", discordEvents.messageCreate);
client.on("interactionCreate", discordEvents.interactionCreate);

client.login(config.token);
