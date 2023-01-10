import util from "util";
import * as stream from "stream";
const streamPipeline = util.promisify(stream.pipeline);
import fetch from "node-fetch";
import fs from "fs";
import Discord, { CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";

export const data = new SlashCommandBuilder()
	.setName("cursedkoteł")
	.setDescription("kiedy widze nowy filmik damonka :trolldog");
export const aliases = ["kotbingo", "rozpierdolkota"];

export async function execute(interaction: CommandInteraction) {
	const folderNumber = Math.floor((Math.random() * 6) + 1);
	let catNumber;
	let theMessage = "No cat for you, the was an error";
	switch (folderNumber) {
	case 1:
		catNumber = Math.floor((Math.random() * 5000) + 1);
		if (Math.random() < 0.5)
			theMessage = "01/cat" + catNumber + ".jpg";

		else
			theMessage = "04/cat" + catNumber + ".jpg";

		break;
	case 2:
		catNumber = Math.floor((Math.random() * 5000) + 1);
		if (Math.random() < 0.5)
			theMessage = "02/cat" + catNumber + ".jpg";

		else
			theMessage = "05/cat" + catNumber + ".jpg";

		break;
	case 3:
		catNumber = Math.floor((Math.random() * 5000) + 1);
		if (Math.random() < 0.5)
			theMessage = "03/cat" + catNumber + ".jpg";

		else
			theMessage = "06/cat" + catNumber + ".jpg";

		break;
	case 4:
		catNumber = Math.floor((Math.random() * 5000) + 1);
		theMessage = "04/cat" + catNumber + ".jpg";
		break;
	case 5:
		catNumber = Math.floor((Math.random() * 5000) + 1);
		theMessage = "05/cat" + catNumber + ".jpg";
		break;
	case 6:
		catNumber = Math.floor((Math.random() * 5000) + 1);
		theMessage = "06/cat" + catNumber + ".jpg";
		break;
	}
	const response = await fetch("https://d2ph5fj80uercy.cloudfront.net/" + theMessage)
		.catch(error => { throw new Error(error); });
	if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`);
	// console.log(response.body);
	await streamPipeline(response.body, fs.createWriteStream("./tmp/placeholder.jpg"));
	const attachment = new Discord.MessageAttachment("./tmp/placeholder.jpg");
	await interaction.reply({ files: [attachment] });
}
