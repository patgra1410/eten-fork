import fs from "fs";
import Discord, { ColorResolvable, CommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "@discordjs/builders";
import { IUserSettings } from "../../lib/types";

export const data = new SlashCommandBuilder()
	.setName("długi")
	.setDescription("List długów (pls chce bajgle)");

export async function execute(interaction: CommandInteraction) {
	const settings: IUserSettings = JSON.parse(fs.readFileSync("./data/userSettings.json", "utf8"));
	const ranking = [];
	for (const [uid, value] of Object.entries(settings)) {
		if (value.dlug !== undefined && uid != "230917788699459584")
			ranking.push({ uid: uid, val: value.dlug });
	}

	ranking.sort(function(a, b) {
		return b.val - a.val;
	});

	let desc = "";
	for (let i = 0; i < ranking.length; i++)
		desc += String(i + 1) + ". <@" + ranking[i].uid + "> " + ranking[i].val + " bajgele\n";

	const embed = new Discord.MessageEmbed()
		.setColor(("#" + Math.floor(Math.random() * 16777215).toString(16)) as ColorResolvable)
		.setTitle("Pls dajcie mi bajgle")
		.setDescription(desc);
	interaction.reply({ embeds: [embed] });
}
