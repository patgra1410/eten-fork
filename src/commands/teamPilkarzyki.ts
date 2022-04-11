import Board from "../lib/pilkarzyki/4players";
import Discord, { ButtonInteraction, Client, CommandInteraction, Message, MessageActionRow, MessageButtonStyleResolvable, TextChannel } from "discord.js";
import { APIMessage } from "discord-api-types";
import fs from "fs";
import { SlashCommandBuilder, SlashCommandUserOption } from "@discordjs/builders";
import config from "../config.json";
const Elo = require("elo-rating");

interface IUids {
	[uid: string]: number
}

interface IBoards {
	[id: string]: Board
}

interface IAccepts {
	[id: string]: {
		uids: Array<string>;
		usernames: Array<string>;
		accepted: Array<string>;
		message?: APIMessage | Message<boolean>;
	}
}

const uids: IUids = {};
const boards: IBoards = {};
let gameID = 1;
const accepts: IAccepts = {};

function getButtons(id: number): Array<MessageActionRow> {
	let indexes;
	try {
		indexes = boards[id].possibleMovesIndexes();
	}
	catch (error) {
		console.error("Couldnt get possibleMovesIndexes. Boards probably doesnt exist");
		return;
	}
	let style: MessageButtonStyleResolvable;
	if (boards[id].turn % 2 == 0)
		style = "PRIMARY";
	else
		style = "DANGER";

	const row1 = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId("teampilkarzyki#0")
				.setLabel("Lewo góra")
				.setStyle(style)
				.setDisabled(!indexes.includes(0)),
			new Discord.MessageButton()
				.setCustomId("teampilkarzyki#1")
				.setLabel("Góra")
				.setStyle(style)
				.setDisabled(!indexes.includes(1)),
			new Discord.MessageButton()
				.setCustomId("teampilkarzyki#2")
				.setLabel("Prawo góra")
				.setStyle(style)
				.setDisabled(!indexes.includes(2))
		);
	const row2 = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId("teampilkarzyki#3")
				.setLabel("Lewo     ")
				.setStyle(style)
				.setDisabled(!indexes.includes(3)),
			new Discord.MessageButton()
				.setCustomId("teampilkarzyki#disabled")
				.setLabel(" ")
				.setStyle(style)
				.setDisabled(true),
			new Discord.MessageButton()
				.setCustomId("teampilkarzyki#4")
				.setLabel("Prawo     ")
				.setStyle(style)
				.setDisabled(!indexes.includes(4))
		);
	const row3 = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId("teampilkarzyki#5")
				.setLabel("Lewo dół")
				.setStyle(style)
				.setDisabled(!indexes.includes(5)),
			new Discord.MessageButton()
				.setCustomId("teampilkarzyki#6")
				.setLabel("Dół")
				.setStyle(style)
				.setDisabled(!indexes.includes(6)),
			new Discord.MessageButton()
				.setCustomId("teampilkarzyki#7")
				.setLabel("Prawo dół")
				.setStyle(style)
				.setDisabled(!indexes.includes(7))
		);
	const row4 = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId("teampilkarzyki#remis")
				.setLabel("Remis")
				.setStyle("SECONDARY"),
			new Discord.MessageButton()
				.setCustomId("teampilkarzyki#surrender")
				.setLabel("Poddaj się")
				.setStyle("SECONDARY")
		);

	return [row1, row2, row3, row4];
}

export const data = new SlashCommandBuilder()
	.setName("teampilkarzyki")
	.setDescription("Piłkarzyki drużynowe")
	.addUserOption(
		new SlashCommandUserOption()
			.setName("gracz2")
			.setDescription("Drugi gracz (razem z tobą w drużynie)")
			.setRequired(true)
	)
	.addUserOption(
		new SlashCommandUserOption()
			.setName("gracz3")
			.setDescription("Trzeci gracz (w przeciwnej drużynie)")
			.setRequired(true)
	)
	.addUserOption(
		new SlashCommandUserOption()
			.setName("gracz4")
			.setDescription("Czwarty gracz (w przeciwnej drużynie)")
			.setRequired(true)
	);

export async function execute(interaction: CommandInteraction) {
	if (interaction.isButton()) {
		interaction.customId = interaction.customId.slice(interaction.customId.indexOf("#") + 1);

		if (interaction.customId.startsWith("accept")) {
			acceptManager(interaction);
			return;
		}

		if (uids[interaction.user.id] == undefined)
			return;

		if (interaction.customId == "surrender") {
			surrenderManager(interaction);
		}
	}
}

async function surrenderManager(interaction: ButtonInteraction) {
	const bid = uids[interaction.user.id];

	if (boards[bid].surrender[boards[bid].uids.indexOf(interaction.user.id) % 2].includes(interaction.user.id))
		return;
	boards[bid].surrender[boards[bid].uids.indexOf(interaction.user.id) % 2].push(interaction.user.id);

	if (boards[bid].surrender[boards[bid].uids.indexOf(interaction.user.id) % 2].length == 2) {
		const losers = boards[bid].uids.indexOf(interaction.user.id) % 2;
		const winners = (losers + 1) % 2;
		
	}
}

async function acceptManager(interaction: ButtonInteraction) {
	const bUids = interaction.customId.split("#");
	const acceptID = bUids[1];
	const accept = accepts[acceptID];

	if (!accept.uids.includes(interaction.user.id))
		return;

	if (interaction.customId.startsWith("acceptNo")) {
		(accept.message as Message).edit({
			content: `${interaction.user.username} nie zaakceptował gry`,
			components: []
		});
		delete accepts[acceptID];
		return;
	}
	else {
		if (accept.accepted.includes(interaction.user.id))
			return;
		accept.accepted.push(interaction.user.id);

		if (accept.accepted.length != 4) {
			const guids = accept.uids;
			const msg = `Drużynowe piłkarzyki: <@${guids[0]}> i <@${guids[2]}> przeciwko <@${guids[1]}> i <@${guids[3]}> (${accept.accepted.length}/4 osób zaakceptowało)`;
			const row = new Discord.MessageActionRow()
				.addComponents(
					new Discord.MessageButton()
						.setLabel("Tak")
						.setCustomId("teampilkarzyki#acceptYes#" + acceptID)
						.setStyle("PRIMARY"),
					new Discord.MessageButton()
						.setLabel("Nie")
						.setCustomId("teampilkarzyki#acceptNo#" + acceptID)
						.setStyle("DANGER")
				);
			interaction.update({ content: msg, components: [row] });
			return;
		}
		else {
			delete accepts[acceptID];

			for (const uid of accept.uids) {
				for (const [id, acc] of Object.entries(accepts)) {
					if (acc.uids.includes(uid)) {
						(acc.message as Message).edit({ content: acc.message.content, components: [] });
						delete accepts[id];
					}
				}
			}

			const gid = gameID;
			gameID++;
			for (const uid of accept.uids)
				uids[uid] = gameID;

			boards[gid] = new Board(50, 50, 50, 3, accept.uids, accept.usernames, gid);
			sendBoard(gid, interaction.client, interaction.message, `Tura: <@${boards[gid].turnUID}>`);
		}
	}
}

async function sendBoard(id: number, client: Client, message: APIMessage | Message<boolean>, content: string, components = true, interaction: CommandInteraction = undefined) {
	try {
		boards[id].draw();
	}
	catch {
		console.error("Couldnt draw board (Probably doesnt exist)");
	}

	const attachment = new Discord.MessageAttachment(`./tmp/boardTeamPilkarzyki${id}.png`);
	const img = await (client.guilds.cache.get(config.junkChannel.guild).channels.cache.get(config.junkChannel.channel) as TextChannel).send({ files: [attachment] });
	content += `\n${img.attachments.first().url}`;
	const messagePayload = {
		content: content,
		components: (components ? getButtons(id) : [])
	};

	if (interaction)
		message = await interaction.editReply(messagePayload);
	else
		message = await (message as Message).edit(messagePayload);

	try {
		boards[id].message = (message as Message<boolean>);
	}
	catch (error) {
		console.error("Couldn't set boards[id].message (probably boards[id] doesnt exist)");
	}
}