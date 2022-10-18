import Board from "../../lib/kwadraty/renderer";
import Discord, { ButtonInteraction, Client, CommandInteraction, Message, TextChannel } from "discord.js";
import { APIMessage } from "discord-api-types";
import fs from "fs";
import Elo from "elo-rating";
import config from "../../config.json";
import { SlashCommandBuilder, SlashCommandUserOption } from "@discordjs/builders";
import { IRanking } from "../../lib/types";

interface IAccept {
	usernames: Array<string>,
	uids: Array<string>,
	from: string,
	to: string,
	message?: APIMessage | Message<boolean>
}

const uids: { [uid: string]: number } = {};
const boards: { [id: number]: Board } = {};
let accepts: Array<IAccept> = [];
let gameID = 1;

function getButtons() {
	const row = new Discord.MessageActionRow()
		.addComponents(
			new Discord.MessageButton()
				.setCustomId("kwadraty#remis")
				.setLabel("Remis")
				.setStyle("SECONDARY"),
			new Discord.MessageButton()
				.setCustomId("kwadraty#surrender")
				.setLabel("Poddaj się")
				.setStyle("DANGER")
		);

	return [row];
}

export const data = new SlashCommandBuilder()
	.setName("kwadraty")
	.setDescription("Ta gra co Staś pokazywał w pierwszej klasie")
	.addUserOption(
		new SlashCommandUserOption()
			.setName("gracz")
			.setDescription("Drugi gracz")
			.setRequired(true)
	);

export async function execute(interaction: CommandInteraction) {
	if (interaction.isButton()) {
		const mainMessage = await interaction.update({ content: interaction.message.content, fetchReply: true });
		interaction.customId = interaction.customId.slice(interaction.customId.indexOf("#") + 1);

		if (interaction.customId.startsWith("accept")) {
			acceptManager(interaction, mainMessage);
			return;
		}

		if (!uids[interaction.user.id])
			return;

		if (interaction.customId == "surrender") {
			surrenderManager(interaction, mainMessage);
			return;
		}

		if (interaction.customId == "remis") {
			remisManager(interaction, mainMessage);
			return;
		}
	}
	else if (interaction.isCommand()) {
		const secondUser = interaction.options.getUser("gracz");
		const uid1 = interaction.user.id;
		const uid2 = secondUser.id;
		const usernames = [interaction.user.username, secondUser.username];

		if (uids[uid1]) {
			interaction.reply("Już grasz w grę");
			return;
		}
		if (uids[uid2]) {
			interaction.reply(`<@${uid2}> już gra w grę`);
			return;
		}

		if (uid1 == uid2) {
			interaction.reply("Nie możesz grać z samym sobą");
			return;
		}

		for (const accept of accepts) {
			if (accept.to == uid2 && accept.from == uid1) {
				await interaction.reply("Już wyzwałeś tą osobę");
				return;
			}
		}

		const ranking: IRanking = JSON.parse(fs.readFileSync("./data/ranking.json", "utf-8"));
		if (ranking.kwadraty[uid1] === undefined)
			ranking.kwadraty[uid1] = { lost: 0, won: 0, rating: (ranking.kwadraty[uid1].rating ? ranking.kwadraty[uid1].rating : 1500) };

		if (ranking.kwadraty[uid2] === undefined)
			ranking.kwadraty[uid2] = { lost: 0, won: 0, rating: (ranking.kwadraty[uid2].rating ? ranking.kwadraty[uid2].rating : 1500) };

		fs.writeFileSync("./data/ranking.json", JSON.stringify(ranking));

		const accept: IAccept = {
			usernames: usernames,
			uids: [uid1, uid2],
			to: uid2,
			from: uid1
		};

		const row = new Discord.MessageActionRow()
			.addComponents(
				new Discord.MessageButton()
					.setLabel("Tak")
					.setCustomId("kwadraty#acceptYes#" + uid1 + "#" + uid2)
					.setStyle("PRIMARY"),
				new Discord.MessageButton()
					.setLabel("Nie")
					.setCustomId("kwadraty#acceptNo#" + uid1 + "#" + uid2)
					.setStyle("DANGER")
			);

		accept.message = await interaction.reply({
			fetchReply: true,
			content: `<@${uid2}>: ${usernames[0]} chce z tobą zagrać`,
			components: [row]
		});

		accepts.push(accept);
	}
}

export async function onMessage(message: Message) {
	const uid = message.author.id;

	if (!uids[uid])
		return;

	const id = uids[uid];

	if (boards[id].turnUID != uid)
		return;

	if (!boards[id].move(message.content))
		return;

	let msg, components;
	if (boards[id].win == -1) {
		msg = `Tura: <@${boards[id].turnUID}> `;
		if (boards[id].remis.length > 0)
			msg += ` (${boards[id].remis.length}/2 osoby poprosiły o remis)`;

	}
	else {
		msg = `<@${boards[id].uids[boards[id].win]}> wygrał`;
	}

	if (boards[id].win == -1)
		components = true;
	else
		components = false;

	await sendBoard(id, message.client, boards[id].message, msg, components);

	message.delete();

	if (boards[id].win != -1) {
		const ranking: IRanking = JSON.parse(fs.readFileSync("./data/ranking.json", "utf-8"));
		const gameuids = boards[id].uids;

		const player1 = ranking.kwadraty[gameuids[0]].rating;
		const player2 = ranking.kwadraty[gameuids[1]].rating;

		let newRating;
		if (boards[id].win == 0) {
			newRating = Elo.calculate(player1, player2, true);
			ranking.kwadraty[gameuids[0]].won++;
			ranking.kwadraty[gameuids[1]].lost++;
		}
		else {
			newRating = Elo.calculate(player1, player2, false);
			ranking.kwadraty[gameuids[0]].lost++;
			ranking.kwadraty[gameuids[1]].won++;
		}

		ranking.kwadraty[gameuids[0]].rating = newRating["playerRating"];
		ranking.kwadraty[gameuids[1]].rating = newRating["opponentRating"];

		fs.writeFileSync("./data/ranking.json", JSON.stringify(ranking));

		boards[id].removeBoard();
		delete boards[id];
		delete uids[gameuids[0]];
		delete uids[gameuids[1]];
	}
}

async function remisManager(interaction: ButtonInteraction, mainMessage: APIMessage | Message<boolean>) {
	const uid = interaction.user.id, id = uids[uid];

	if (boards[id].remis.includes(uid))
		return;

	boards[id].remis.push(uid);
	if (boards[id].remis.length == 2) {
		await sendBoard(id, interaction.client, mainMessage, "Remis", false);

		const guids = boards[id].uids;
		boards[id].removeBoard();
		delete boards[id];
		delete uids[guids[0]];
		delete uids[guids[1]];
	}
}

async function surrenderManager(interaction: ButtonInteraction, mainMessage: APIMessage | Message<boolean>) {
	const uid = interaction.user.id;
	const ranking: IRanking = JSON.parse(fs.readFileSync("./data/ranking.json", "utf-8"));
	const gameuids = boards[uids[uid]].uids;

	const rating1 = ranking.kwadraty[gameuids[0]].rating;
	const rating2 = ranking.kwadraty[gameuids[1]].rating;

	let winner, win;
	if (gameuids[0] == interaction.user.id) {
		winner = gameuids[1];
		win = false;
	}
	else {
		winner = gameuids[0];
		win = true;
	}

	const newRating = Elo.calculate(rating1, rating2, win);

	ranking.kwadraty[gameuids[0]].rating = newRating["playerRating"];
	ranking.kwadraty[gameuids[1]].rating = newRating["opponentRating"];

	ranking.kwadraty[interaction.user.id].lost++;
	ranking.kwadraty[winner].won++;
	fs.writeFileSync("./data/ranking.json", JSON.stringify(ranking));

	await sendBoard(uids[uid], interaction.client, mainMessage, `<@${winner}> wygrał przez poddanie się przeciwnika`, false);
	boards[uids[uid]].removeBoard();
	delete boards[uids[uid]];
	delete uids[winner];
	delete uids[uid];
}

async function acceptManager(interaction: ButtonInteraction, mainMessage: APIMessage | Message<boolean>) {
	const uidsButton = interaction.customId.split("#");
	const from = uidsButton[1];
	const to = uidsButton[2];

	if (to != interaction.user.id)
		return;

	if (interaction.customId.startsWith("acceptNo")) {
		for (let i = 0; i < accepts.length; i++) {
			const accept = accepts[i];
			if (accept.to == to && accept.from == from) {
				const msg = `${accept.usernames[1]} nie zaakceptował gry z ${accept.usernames[0]}`;
				(accept.message as Message).edit({ content: msg, components: [] });
				accepts.splice(i, 1);
				return;
			}
		}
	}
	else {
		let accept = undefined;
		for (const a of accepts) {
			if (a.to == to && a.from == from) {
				accept = a;
				break;
			}
		}

		if (!accept)
			return;

		const newAccepts = [];
		for (const a of accepts) {
			if (a.from != from && a.to != to)
				newAccepts.push(a);
			else
				(a.message as Message).edit({ content: a.message.content, components: [] });
		}

		accepts = newAccepts;
		const id = gameID;
		gameID++;
		uids[from] = id;
		uids[to] = id;

		boards[id] = new Board(50, 50, 50, 3, [from, to], accept.usernames, id);
		boards[id].message = mainMessage as Message;

		sendBoard(id, interaction.client, mainMessage, `Tura: <@${boards[id].turnUID}>\n`);
	}
}

async function sendBoard(id: number, client: Client, message: APIMessage | Message<boolean>, content: string, components = true, interaction: CommandInteraction = undefined) {
	try {
		boards[id].draw();
	}
	catch {
		console.error("Couldnt draw board (Probably doesnt exist)");
	}

	const attachment = new Discord.MessageAttachment(`./tmp/boardKwadraty${id}.png`);
	const img = await (client.guilds.cache.get(config.junkChannel.guild).channels.cache.get(config.junkChannel.channel) as TextChannel).send({ files: [attachment] });
	content += `\n${img.attachments.first().url}`;
	const messagePayload = {
		content: content,
		components: (components ? getButtons() : [])
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