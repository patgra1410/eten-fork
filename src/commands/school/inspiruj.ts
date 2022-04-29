import util from "util";
import { pipeline } from "stream";
const streamPipeline = util.promisify(pipeline);
import fetch from "node-fetch";
import fs from "fs";
import Discord, { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";

export const data = new SlashCommandBuilder()
	.setName("inspiruj")
	.setDescription("Zainspiruj się");
export const aliases = ["inspiracja"];

export async function execute(interaction: CommandInteraction) {
	const res = await fetch("https://inspirobot.me/api?generate=true");
	if (!res.ok) throw new Error(`Unexpected response ${res.statusText}`);
	const response = await fetch(await res.text());
	if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`);
	await streamPipeline(response.body, fs.createWriteStream("./tmp/placeholder.jpg"));
	const attachment = new Discord.MessageAttachment("./tmp/placeholder.jpg");
	interaction.reply({ files: [attachment] });
}
