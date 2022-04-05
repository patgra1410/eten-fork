import { SlashCommandBuilder, SlashCommandUserOption } from "@discordjs/builders";
import { APIMessage } from "discord-api-types";
import Discord, { ButtonInteraction, Client, CommandInteraction, Message, MessageButtonStyleResolvable, TextChannel } from "discord.js";
import Elo from "elo-rating";
import fs from "fs";
import { performance } from "perf_hooks";
import ExtBoard from "../bot";
import config from "../config.json";
import Board from "../lib/pilkarzyki/2players";
import { IRanking } from "../lib/types";

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
	[id: string]: Board
}

interface IAccept {
	usernames: Array<string>,
	uids: Array<string>,
	to: string, // uid
	from: string, // uid
	message?: APIMessage | Message<boolean>
}

const uids: Iuids = {};
const bots: IBots = {};
const boards: IBoards = {};
let gameID = 1;
let botID = 1;
let accepts: Array<IAccept> = [];

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

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
					.setRequired(true)
					.setMinValue(1)
					.setMaxValue(config.pilkarzykiBot.maxDepth)
			)
	);

export async function execute(interaction: CommandInteraction) {
	if (interaction.isButton()) {
		const mainMessage = await interaction.update({ content: interaction.message.content, fetchReply: true });
		interaction.customId = interaction.customId.slice(interaction.customId.indexOf("#") + 1);

		if (interaction.customId.startsWith("accept")) {
			acceptManager(interaction, mainMessage);
			return;
		}

		const uid = interaction.user.id;
		const id = uids[uid];

		if (uids[interaction.user.id] == undefined)
			return;

		if (interaction.customId == "surrender") {
			surrenderManager(interaction, mainMessage);
			return;
		}
		else if (interaction.customId == "remis") {
			if (await remisManager(interaction, mainMessage))
				return;
		}
		else if (!boards[id].withBot) {
			buttonWithoutBot(interaction);
		}
		else {
			buttonWithBot(interaction, mainMessage);
			return;
		}

		let msg, components = true;

		if (boards[id].win == -1) {
			msg = `Tura: <@${boards[id].turnUID}>`;

			if (boards[id].remis.length > 0)
				msg += ` (${boards[id].remis.length}/2 osoby poprosiły o remis)`;
		}
		else {
			msg = `<@${boards[id].uids[boards[id].win]}> wygrał!`;
			components = false;
		}

		sendBoard(id, interaction.client, mainMessage, msg, components);

		if (boards[id].win != -1) {
			const gameuids = boards[id].uids;
			updateLongestGame(id, gameuids);
			const ranking: IRanking = JSON.parse(fs.readFileSync("./data/ranking.json", "utf8"));

			const player1 = ranking.pilkarzyki[gameuids[0]].rating;
			const player2 = ranking.pilkarzyki[gameuids[1]].rating;

			let newRating;
			if (boards[id].win == 0) {
				newRating = Elo.calculate(player1, player2, true);
				ranking.pilkarzyki[gameuids[0]].won++;
				ranking.pilkarzyki[gameuids[1]].lost++;
			}
			else {
				newRating = Elo.calculate(player1, player2, false);
				ranking.pilkarzyki[gameuids[0]].lost++;
				ranking.pilkarzyki[gameuids[1]].won++;
			}

			ranking.pilkarzyki[gameuids[0]].rating = newRating["playerRating"];
			ranking.pilkarzyki[gameuids[1]].rating = newRating["opponentRating"];

			fs.writeFileSync("./data/ranking.json", JSON.stringify(ranking));

			delete boards[id];
			delete uids[gameuids[0]];
			delete uids[gameuids[1]];
		}
		return;
	}
	else if (interaction.isCommand()) {
		const message = await interaction.deferReply({ fetchReply: true });
		let usernames;
		const id = gameID;
		gameID++;

		if (interaction.options.getSubcommand() == "player") {
			const secondUser = interaction.options.getUser("gracz");
			const uid2 = secondUser.id;
			const uid1 = interaction.user.id;
			usernames = [interaction.user.username, secondUser.username];

			if (uids[uid1] != undefined) {
				interaction.editReply("Już grasz w grę");
				return;
			}
			if (uids[uid2] != undefined) {
				interaction.editReply(`<@${uid2}> już gra w grę`);
				return;
			}
			if (uid1 == uid2) {
				interaction.editReply("Nie możesz grać z samym sobą");
				return;
			}

			for (const accept of accepts) {
				if (accept.to == uid2 && accept.from == uid1) {
					await interaction.editReply("Już wyzwałeś tą osobę");
					return;
				}
			}

			const ranking: IRanking = JSON.parse(fs.readFileSync("./data/ranking.json", "utf8"));
			if (ranking.pilkarzyki[uid1] == undefined)
				ranking.pilkarzyki[uid1] = {
					lost: 0,
					won: 0,
					rating: (ranking.pilkarzyki[uid1].rating ? ranking.pilkarzyki[uid1].rating : 1500)
				};
			if (ranking.pilkarzyki[uid2] == undefined)
				ranking.pilkarzyki[uid2] = {
					lost: 0,
					won: 0,
					rating: (ranking.pilkarzyki[uid2].rating ? ranking.pilkarzyki[uid2].rating : 1500)
				};

			fs.writeFileSync("./data/ranking.json", JSON.stringify(ranking));

			const newAccept: IAccept = {
				usernames: usernames,
				uids: [uid1, uid2],
				to: uid2,
				from: uid1
			};

			const row = new Discord.MessageActionRow()
				.addComponents(
					new Discord.MessageButton()
						.setLabel("Tak")
						.setCustomId("pilkarzyki#acceptYes#" + uid1 + "#" + uid2)
						.setStyle("PRIMARY"),
					new Discord.MessageButton()
						.setLabel("Nie")
						.setCustomId("pilkarzyki#acceptNo#" + uid1 + "#" + uid2)
						.setStyle("DANGER")
				);

			newAccept.message = await interaction.editReply({
				content: `<@${uid2}>: ${usernames[0]} chce z tobą zagrać`,
				components: [row]
			});

			accepts.push(newAccept);
		}
		else if (interaction.options.getSubcommand() == "bot") {
			const uid = interaction.user.id;
			const bid = botID;
			botID++;
			usernames = [interaction.user.username, "Bot"];

			let evalFunctionPath = undefined;
			for (const func of config.pilkarzykiBot.evaluationFunctionConfig) {
				if (eval(func.condition)) {
					evalFunctionPath = func.path;
				}
			}

			if (evalFunctionPath === undefined) {
				interaction.editReply("Nie znaleziono odpowiedniej funkcjievaluacyjnej (być może config jest źle skonfigurowany albo ja nie umiem pisać Etena jak zwykle)");
				return;
			}
			evalFunctionPath = evalFunctionPath[Math.floor(Math.random() * evalFunctionPath.length)];
			console.log("evalFunctionPath = " + evalFunctionPath);

			uids[uid] = id;
			boards[id] = new Board(50, 50, 50, 3, [uid, bid.toString()], usernames, id, true);

			sendBoard(id, interaction.client, message, `Tura: <@${boards[id].turnUID}>`);
			return;
		}
	}
}

async function acceptManager(interaction: ButtonInteraction, mainMessage: APIMessage | Message<boolean>) {
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
		await (accept.message as Message).edit({ content: msg, components: [] });
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
				(acc.message as Message).edit({ content: acc.message.content, components: [] });
		}
		accepts = newAccepts;

		const id = gameID;
		gameID++;
		uids[invited] = id;
		uids[inviter] = id;
		boards[id] = new Board(50, 50, 50, 3, [inviter, invited], accept.usernames, id);

		sendBoard(id, interaction.client, mainMessage, `Tura: <@${boards[id].turnUID}>`);
	}
}

async function surrenderManager(interaction: ButtonInteraction, mainMessage: APIMessage | Message<boolean>) {
	const uid = interaction.user.id;
	const id = uids[uid];

	if (boards[id].withBot) {
		sendBoard(id, interaction.client, mainMessage, `<@${uid}> poddał się`);
		const bid: number = parseInt(boards[id].uids[1 - boards[id].uids.indexOf(uid)]);

		delete bots[bid];
		delete boards[id];
		delete uids[uid];
		return;
	}
	else {
		const gameuids = boards[id].uids;
		updateLongestGame(id, gameuids);
		const ranking: IRanking = JSON.parse(fs.readFileSync("./data/ranking.json", "utf8"));

		const rating1 = ranking.pilkarzyki[gameuids[0]].rating;
		const rating2 = ranking.pilkarzyki[gameuids[1]].rating;

		let winner, win;
		if (gameuids[0] == uid) {
			winner = gameuids[1];
			win = false;
		}
		else {
			winner = gameuids[0];
			win = true;
		}

		const newRating = Elo.calculate(rating1, rating2, win);
		ranking.pilkarzyki[gameuids[0]].rating = newRating["playerRating"];
		ranking.pilkarzyki[gameuids[1]].rating = newRating["opponentRating"];

		ranking.pilkarzyki[uid].lost++;
		ranking.pilkarzyki[winner].won++;
		fs.writeFileSync("./data/ranking.json", JSON.stringify(ranking));

		sendBoard(id, interaction.client, mainMessage, `<@${winner}> wygrał przez poddanie się przeciwnika.`, false);
		delete boards[id];
		delete uids[winner];
		delete uids[uid];
	}
}

async function remisManager(interaction: ButtonInteraction, mainMessage: APIMessage | Message<boolean>): Promise<boolean> {
	const uid = interaction.user.id;
	const id = uids[uid];

	if (boards[id].withBot)
		return true;
	if (boards[id].remis.includes(uid))
		return true;

	boards[id].remis.push(uid);
	if (boards[id].remis.length == 2) {
		const gameuids = boards[id].uids;
		await sendBoard(id, interaction.client, mainMessage, "Remis", false);
		updateLongestGame(id, boards[id].uids);

		delete boards[id];
		delete uids[gameuids[0]];
		delete uids[gameuids[1]];
		return true;
	}
	return false;
}

async function buttonWithoutBot(interaction: ButtonInteraction) {
	const uid = interaction.user.id;
	const id = uids[uid];

	if (uid != boards[id].turnUID)
		return;

	const indexes = boards[id].possibleMovesIndexes();
	if (!indexes.includes(parseInt(interaction.customId)))
		return;

	boards[id].currMoveLen++;
	if (!boards[id].move(indexes.indexOf(parseInt(interaction.customId)))) {
		console.error("Move wasnt possible");
		return;
	}

	if (boards[id].turnUID != uid) {
		boards[id].longestMove[uid] = Math.max(boards[id].longestMove[uid], boards[id].currMoveLen);
		boards[id].currMoveLen = 0;

		const ranking: IRanking = JSON.parse(fs.readFileSync("./data/ranking.json", "utf8"));
		if (ranking.najdluzszyruch[uid] == undefined)
			ranking.najdluzszyruch[uid] = 0;
		ranking.najdluzszyruch[uid] = Math.max(ranking.najdluzszyruch[uid], boards[id].longestMove[uid]);
		fs.writeFileSync("./data/ranking.json", JSON.stringify(ranking));
	}
}

async function buttonWithBot(interaction: ButtonInteraction, mainMessage: APIMessage | Message<boolean>) {
	const uid = interaction.user.id;
	const id = uids[uid];
	const bid = parseInt(boards[id].uids[1 - boards[id].uids.indexOf(uid)]);
	const indexes = boards[id].possibleMovesIndexes();

	if (!indexes.includes(parseInt(interaction.customId)))
		return;
	if (!boards[id].move(indexes.indexOf(parseInt(interaction.customId)))) {
		console.error("Move wasnt possible");
		return;
	}

	bots[bid].ext_board.makeMove([interaction.customId]);

	let msg, components = true;
	if (boards[id].win != -1) {
		if (boards[id].uids[boards[id].win] == uid)
			msg = `<@${uid}> wygrał!`;
		else
			msg = "Bot wygrał!";
	}
	else if (boards[id].turnUID == uid)
		msg = `Tura: <@${uid}>`;
	else {
		components = false;
		msg = "Bot myśli...";
	}

	sendBoard(id, interaction.client, mainMessage, msg, components);

	if (boards[id].win != -1) {
		delete bots[bid];
		delete boards[id];
		delete uids[uid];
		return;
	}
	if (boards[id].turnUID == uid)
		return;

	const start = performance.now();
	bots[bid].ext_board.nodes = 0;
	const move = bots[bid].ext_board.search(bots[bid].depth, boards[id].turn, -2000, 2000)[1];
	const end = performance.now();

	if (move.length == 0) {
		sendBoard(id, interaction.client, mainMessage, `<@${uid}> wygrał!`);
		delete bots[bid];
		delete boards[id];
		delete uids[uid];
		return;
	}

	const nodes = bots[bid].ext_board.nodes;`Bot myślał${Math.round(((end - start) * 100) / 100)}ms i policzył ${nodes} nodów (${Math.round((nodes / ((end - start) / 1000)) * 100) / 100} nodes/s)`;
	sendBoard(id, interaction.client, mainMessage, msg);
	console.log((Math.round((end - start) * 100) / 100) + "ms, " + nodes + " nodes, " + Math.round((nodes / ((end - start) / 1000)) * 100) / 100 + " nodes/s", move);

	let num = 0;
	for (const dir of move) {
		num++;
		await sleep(500);

		const ind = boards[id].possibleMovesIndexes();
		if (!boards[id].move(ind.indexOf(dir))) {
			console.log("AaAAAAAAAAAAaAAAA A aaA wszystko sie jebie");
			return;
		}

		if (num == move.length)
			continue;

		sendBoard(id, interaction.client, mainMessage, msg);
	}

	bots[bid].ext_board.makeMove(move);

	if (boards[id].win != -1) {
		if (boards[id].uids[boards[id].win] == uid)
			msg = `<@${uid}> wygrał!`;
		else
			msg = "Bot wygrał!";

		sendBoard(id, interaction.client, mainMessage, msg, false);
		delete bots[bid];
		delete boards[id];
		delete uids[uid];
		return;
	}

	sendBoard(id, interaction.client, mainMessage, `Tura: <@${uid}>`);
}

function updateLongestGame(gameid: number, gameuids: Array<string>) {
	const ranking: IRanking = JSON.parse(fs.readFileSync("./data/ranking.json", "utf8"));
	const tempuids = [...gameuids];
	let uidsString = "";

	for (const tuid of tempuids.sort())
		uidsString += tuid + "#";
	uidsString = uidsString.substring(0, uidsString.length - 1);

	if (ranking.najdluzszagrapilkarzyki[uidsString] == undefined)
		ranking.najdluzszagrapilkarzyki[uidsString] = 0;
	ranking.najdluzszagrapilkarzyki[uidsString] = Math.max(boards[gameid].totalMoves, ranking.najdluzszagrapilkarzyki[uidsString]);

	fs.writeFileSync("./data/ranking.json", JSON.stringify(ranking));
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

async function sendBoard(id: number, client: Client, message: APIMessage | Message<boolean>, content: string, components = true) {
	boards[id].draw();
	const attachment = new Discord.MessageAttachment(`./tmp/boardPilkarzyki${id}.png`);
	const img = await (client.guilds.cache.get(config.junkChannel.guild).channels.cache.get(config.junkChannel.channel) as TextChannel).send({ files: [attachment] });
	content += `\n${img.attachments.first().url}`;
	message = await (message as Message).edit({ content: content, components: (components ? getButtons(id) : []) });
	try {
		boards[id].message = message;
	}
	catch (error) {
		console.error("Couldn't set boards[id].message (probably boards[id] doesnt exist)");
	}
}