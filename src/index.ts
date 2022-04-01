/* eslint-disable @typescript-eslint/no-var-requires */
import Discord from "discord.js";
import config from "./config.json";
import fs from "fs";
import initThreadManager from "./lib/threadManager";
import createRequiredFiles from "./lib/createRequiredFiles";
import cronJobs from "./lib/cronJobs";
import randomSounds from "./lib/randomSoundOnVC";
import initLibrusManager from "./lib/librusManager";
import incrementDays from "./lib/incrementDays";
import * as discordEvents from "./lib/discordEvents";
import { SlashCommandBuilder } from "@discordjs/builders";

// LOL
type SlashCommandFunction = ((interaction: Discord.CommandInteraction|Discord.ButtonInteraction|Discord.Message|Discord.ContextMenuInteraction, args?: string) => Promise<unknown>);
interface SlashCommandFile {
	__esModule: boolean;
	data: SlashCommandBuilder;
	execute: SlashCommandFunction;
	aliases?: string[];
	// pls delete
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
		if ("aliases" in command && command.aliases != null) {
			for (const alias of command.aliases)
				client.commands.set(alias, command);
		}
	}
	// for typescript slash command files
	const tsCommandFiles: string[] = fs.readdirSync(`${__dirname}/commands`).filter((file: string) => (file.endsWith(".js") && file.startsWith("ts_")));
	for (const file of tsCommandFiles) {
		const command: SlashCommandFile = await import(`${__dirname}/commands/${file}`);
		client.commands.set(command.data.name, command);
		slashCommands.push(command.data.toJSON());
		// This won't set the aliases in Discord?
		if ("aliases" in command && command.aliases != null) {
			for (const alias of command.aliases)
				client.commands.set(alias, command);
		}
	}
	// for typescript context menu interaction files
	const contextMenuFiles: string[] = fs.readdirSync(`${__dirname}/contextMenus`);
	for (const file of contextMenuFiles) {
		const command: SlashCommandFile = await import(`${__dirname}/contextMenus/${file}`);
		client.commands.set(command.data.name, command);
		slashCommands.push(command.data.toJSON());
	}
	// const guild = await (await client.guilds.fetch("653601807481962534")).commands.set(slashCommands);
	// console.log(await client.application?.commands.set(slashCommands));
	await client.application?.commands.set(slashCommands);
}

client.once("ready", async () => {
	if (client.user == null)
		throw new Error("user does not exist on client");
	console.log(`Logged in as ${client.user.tag}`);
	client.user.setStatus("online");
	client.user.setActivity("Dosko - Jacek Stachursky", { type: "LISTENING" });
	await updateSlashCommands();

	createRequiredFiles();
	client.imageCdnChannel = await client.channels.fetch(config.autoMemesChannel) as Discord.TextChannel;
	cronJobs(client);
	if (config.librus)
		await initLibrusManager();
	await initThreadManager();
	incrementDays();
	randomSounds();
	console.log("Ready!");
});

client.on("messageReactionAdd", discordEvents.messageReactionAdd);
client.on("messageReactionRemove", discordEvents.messageReactionRemove);
client.on("messageCreate", discordEvents.messageCreate);
client.on("interactionCreate", discordEvents.interactionCreate);

client.login(config.token);
