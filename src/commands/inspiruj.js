const util = require("util");
const streamPipeline = util.promisify(require("stream").pipeline);
const fetch = require("node-fetch");
const fs = require("fs");
const Discord = require("discord.js");
const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
	data: new SlashCommandBuilder()
		.setName("inspiruj")
		.setDescription("Zainspiruj się"),
	aliases: ["inspiracja"],
	async execute(interaction) {
		const res = await fetch("https://inspirobot.me/api?generate=true");
		if (!res.ok) throw new Error(`Unexpected response ${res.statusText}`);
		const response = await fetch(await res.text());
		if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`);
		await streamPipeline(response.body, fs.createWriteStream("./tmp/placeholder.jpg"));
		const attachment = new Discord.MessageAttachment("./tmp/placeholder.jpg");
		interaction.reply({ files: [attachment] });
	}
};
