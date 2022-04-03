import Board from "./lib/pilkarzyki/2players";
import Discord, { ButtonInteraction, Client, CommandInteraction, Message, MessageButtonStyleResolvable, TextChannel } from "discord.js";
import Elo from "elo-rating";
import { performance } from "perf_hooks";
import { SlashCommandBuilder, SlashCommandUserOption } from "@discordjs/builders";
import ExtBoard from "./bot";
import config from "./config.json";
import { APIMessage } from "discord-api-types";

interface Iuids {
	[uid: string]: number
}

interface IBots {
	[bid: number]: {
		gameID: number,
		ext_board: ExtBoard,
		depth: number
	}
}

interface IBoards {
	[id: number]: Board
}

interface IAccept {
	usernames: Array<string>,
	uids: Array<string>,
	to: string, // uid
	from: string, // uid
	message: Message
}

const uids: Iuids = {};
const bots: IBots = {};
const boards: IBoards = {};
let gameID = 1;
let botID = 1;
let accepts: Array<IAccept> = [];

function getButtons(id: number): Array<Discord.MessageActionRow> {
	const indexes = boards[id].possibleMovesIndexes();
	let style: MessageButtonStyleResolvable;
	if (boards[id].turn == 0)
		style = "PRIMARY";
	else
		style = "DANGER";

	const row1 = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId("pilkarzyki#0")
				.setLabel("↖")
				.setStyle(style)
				.setDisabled(!indexes.includes(0)),
			new Discord.MessageButton()
				.setCustomId("pilkarzyki#1")
				.setLabel("⬆")
				.setStyle(style)
				.setDisabled(!indexes.includes(1)),
			new Discord.MessageButton()
				.setCustomId("pilkarzyki#2")
				.setLabel("↗")
				.setStyle(style)
				.setDisabled(!indexes.includes(2))
		);
	const row2 = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId("pilkarzyki#3")
				.setLabel("⬅")
				.setStyle(style)
				.setDisabled(!indexes.includes(3)),
			new Discord.MessageButton()
				.setCustomId("pilkarzyki#disabled")
				.setLabel(" ")
				.setStyle(style)
				.setDisabled(true),
			new Discord.MessageButton()
				.setCustomId("pilkarzyki#4")
				.setLabel("➡")
				.setStyle(style)
				.setDisabled(!indexes.includes(4))
		);
	const row3 = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId("pilkarzyki#5")
				.setLabel("↙")
				.setStyle(style)
				.setDisabled(!indexes.includes(5)),
			new Discord.MessageButton()
				.setCustomId("pilkarzyki#6")
				.setLabel("⬇")
				.setStyle(style)
				.setDisabled(!indexes.includes(6)),
			new Discord.MessageButton()
				.setCustomId("pilkarzyki#7")
				.setLabel("↘")
				.setStyle(style)
				.setDisabled(!indexes.includes(7))
		);
	const row4 = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId("pilkarzyki#remis")
				.setLabel("Remis")
				.setStyle("SECONDARY"),
			new Discord.MessageButton()
				.setCustomId("pilkarzyki#surrender")
				.setLabel("Poddaj się")
				.setStyle("SECONDARY")
		);

	return [row1, row2, row3, row4];
}

export const data = new SlashCommandBuilder()
	.setName("pilkarzyki")
	.setDescription("Pilkarzyki")
	.addSubcommand(subcommand =>
		subcommand
			.setName("player")
			.setDescription("Gra z innym graczem")
			.addUserOption(
				new SlashCommandUserOption()
					.setName("gracz")
					.setDescription("Drugi gracz")
					.setRequired(true)
			))
	.addSubcommand(subcommand =>
		subcommand
			.setName("bot")
			.setDescription("Gra z botem")
			.addIntegerOption(option =>
				option
					.setName("depth")
					.setDescription("Głębokość patrzenia (max. " + config.pilkarzykiBot.maxDepth + ")")
					.setRequired(true))
	);

export async function execute(interaction: CommandInteraction) {
	if (interaction.isButton()) {
		const mainMessage = await interaction.update({ content: interaction.message.content, fetchReply: true });
		interaction.customId = interaction.customId.slice(interaction.customId.indexOf("#") + 1);

		if (interaction.customId.startsWith("accept")) {
			manageAccept(interaction, mainMessage);
			return;
		}
	}
}

async function manageAccept(interaction: ButtonInteraction, mainMessage: APIMessage | Message<boolean>) {
	const buttonUids = interaction.customId.split("#");
	const inviter = buttonUids[1];
	const invited = buttonUids[2];

	if (invited != interaction.user.id)
		return;

	if (interaction.customId.startsWith("acceptNo")) {
		const accept = getAcceptByUids(inviter, invited);
		if (accept == undefined)
			return;

		const msg = `${accept.usernames[1]} nie zaakceptował gry z ${accept.usernames[0]}`;
		await accept.message.edit({ content: msg, components: [] });
		removeAcceptByUids(inviter, invited);
		return;
	}
	else {
		const accept = getAcceptByUids(inviter, invited);
		if (accept == undefined)
			return;

		const newAccepts: Array<IAccept> = [];
		for (const acc of accepts) {
			if (acc.to != invited && acc.from != inviter)
				newAccepts.push(acc);
			else
				acc.message.edit({ content: acc.message.content, components: [] });
		}
		accepts = newAccepts;

		const id = gameID;
		gameID++;
		uids[invited] = id;
		uids[inviter] = id;
		boards[id] = new Board(50, 50, 50, [inviter, invited], accept.usernames, id);

		sendBoard(id, interaction.client, mainMessage);
	}
}

function getAcceptByUids(inviter: string, invited: string): IAccept | undefined {
	for (const accept of accepts)
		if (accept.to == invited && accept.from == inviter)
			return accept;
	return undefined;
}

function removeAcceptByUids(inviter: string, invited: string): boolean {
	for (let i = 0; i < accepts.length; i++) {
		if (accepts[i].to == invited && accepts[i].from == inviter) {
			accepts.splice(i, 1);
			return true;
		}
	}
	return false;
}

async function sendBoard(id: number, client: Client, message: APIMessage | Message<boolean>) {
	boards[id].draw();
	const attachment = new Discord.MessageAttachment(`./tmp/boardPilkarzyki${id}.png`);
	const img = await (client.guilds.cache.get(config.junkChannel.guild).channels.cache.get(config.junkChannel.channel) as TextChannel).send({ files: [attachment] });
	const msg = `Tura: <@${boards[id].turnUID}>\n${img.attachments.first().url}`;
	message = await (message as Message).edit({ content: msg, components: getButtons(id) });
	boards[id].message = message;
}