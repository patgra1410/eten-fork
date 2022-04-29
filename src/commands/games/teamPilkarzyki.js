const Board = require("../../teamPilkarzykiRenderer.js.js");
const Discord = require("discord.js");
const fs = require("fs");
const Elo = require("elo-rating");
const { SlashCommandBuilder, SlashCommandUserOption } = require("@discordjs/builders");

const uids = {};
const boards = {};
let gameID = 1;
const accepts = {};
let newAcceptID = 1;

function buttons(id) {
	const indexes = boards[id].possibleMoveIndexes();
	let style;
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

module.exports = {
	data: new SlashCommandBuilder()
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
		),
	async execute(interaction, args) {
		if (interaction.isButton !== undefined && interaction.isButton()) {
			interaction.customId = interaction.customId.slice(interaction.customId.indexOf("#") + 1);
			if (interaction.customId.startsWith("accept")) {
				if (interaction.customId.startsWith("acceptNo")) {
					const uidsButton = interaction.customId.split("#");
					const acceptID = uidsButton[1];
					if (!accepts[acceptID]["uids"].includes(interaction.user.id))
						return;

					if (accepts[acceptID]["uids"].includes(interaction.user.id)) {
						const msg = interaction.user.username + " nie zaakceptował gry";
						await accepts[acceptID]["message"].edit({ content: msg, components: [] });
						delete accepts[acceptID];
						return;
					}
				}
				else {
					const uidsButton = interaction.customId.split("#");
					const acceptID = uidsButton[1];
					if (accepts[acceptID] === undefined) {
						console.log("accpets[" + acceptID + "]=undefined");
						return;
					}
					if (!accepts[acceptID]["uids"].includes(interaction.user.id))
						return;

					if (accepts[acceptID]["accepted"] === undefined)
						accepts[acceptID]["accepted"] = [];

					if (accepts[acceptID]["accepted"].includes(interaction.user.id))
						return;

					accepts[acceptID]["accepted"].push(interaction.user.id);
					if (accepts[acceptID]["accepted"].length != 4) {
						const guids = accepts[acceptID]["uids"];
						const msg = "Drużynowe piłarzyki: <@" + guids[0] + "> i <@" + guids[2] + "> przeciwko <@" + guids[1] + "> i <@" + guids[3] + "> (" + accepts[acceptID]["accepted"].length + "/4 osób zaakceptowało)";
						const buttonsID = acceptID;

						const row = new Discord.MessageActionRow()
							.addComponents(
								new Discord.MessageButton()
									.setLabel("Tak")
									.setCustomId("teampilkarzyki#acceptYes#" + buttonsID)
									.setStyle("PRIMARY"),
								new Discord.MessageButton()
									.setLabel("Nie")
									.setCustomId("teampilkarzyki#acceptNo#" + buttonsID)
									.setStyle("PRIMARY")
							);

						let error = false;
						do {
							try {
								interaction.update({ content: msg, components: [row] });
							}
							catch (err) {
								error = true;
								console.log(err);
							}
						} while (error);
						return;
					}

					const accept = accepts[acceptID];
					delete accepts[acceptID];

					for (const uid of accept["uids"]) {
						for (const [key, value] of Object.entries(accepts)) {
							if (value["uids"].includes(uid)) {
								value["message"].edit({ content: value["message"].content, components: [] });
								delete accepts[key];
							}
						}
					}

					for (const uid of accept["uids"])
						uids[uid] = gameID;

					boards[gameID] = new Board(50, 50, 50, accept["uids"], accept["usernames"], gameID);
					const id = gameID;
					gameID++;

					for (let i = 1; i <= 10; i++) {
						try {
							boards[id].draw();
							break;
						}
						catch (error) {
							console.log("Draw failed " + i + ". time(s) color: " + boards[id].lastColor + " " + boards[id].lastColor.toString(16));
							if (i == 10)
								console.log(error);
						}
					}
					const attachment = new Discord.MessageAttachment("./tmp/boardTeamPilkarzyki" + id + ".png");
					const img = await interaction.client.guilds.cache.get("856926964094337044").channels.cache.get("892842178143997982").send({ files: [attachment] });

					const msg = "Tura: <@" + boards[id].turnUID() + ">\n" + img.attachments.first().url;

					let error = false;
					do {
						try {
							const message = await interaction.update({ content: msg, files: [], components: buttons(id) });
							boards[id].message = message;
						}
						catch (err) {
							error = true;
							console.log(err);
						}
					} while (error);
				}
			}
			if (uids[interaction.user.id] === undefined)
				return;

			let boardID;
			if (interaction.customId == "surrender") {
				boardID = uids[interaction.user.id];

				if (boards[boardID].surrender[boards[boardID].uids.indexOf(interaction.user.id) % 2].includes(interaction.user.id))
					return;

				boards[boardID].surrender[boards[boardID].uids.indexOf(interaction.user.id) % 2].push(interaction.user.id);

				if (boards[boardID].surrender[boards[boardID].uids.indexOf(interaction.user.id) % 2].length == 2) {
					const losers = boards[boardID].uids.indexOf(interaction.user.id) % 2;
					const winners = (losers + 1) % 2;

					for (let i = 1; i <= 10; i++) {
						try {
							boards[boardID].draw();
							break;
						}
						catch (error) {
							console.log("Draw failed " + i + ". time(s) color: " + boards[boardID].lastColor + " " + boards[boardID].lastColor.toString(16));
							if (i == 10)
								console.log(error);
						}
					}
					const attachment = new Discord.MessageAttachment("./tmp/boardTeamPilkarzyki" + uids[interaction.user.id] + ".png");
					const img = await interaction.client.guilds.cache.get("856926964094337044").channels.cache.get("892842178143997982").send({ files: [attachment] });

					const msg = "<@" + boards[boardID].uids[losers] + "> i <@" + boards[boardID].uids[losers + 2] + "> poddali się\n" + img.attachments.first().url;

					let error = false;
					do {
						try {
							await interaction.update({ content: msg, components: [] });
						}
						catch (err) {
							error = true;
							console.log(err);
						}
					} while (error);

					const wholeRanking = JSON.parse(fs.readFileSync("./data/ranking.json"));
					const ranking = wholeRanking["teampilkarzyki"];
					const guids = boards[boardID].uids;

					const tempuids = [...guids];
					let uidsString = "";
					for (const uid of tempuids.sort())
						uidsString += uid + "#";
					uidsString = uidsString.substring(0, uidsString.length - 1);

					if (wholeRanking["najdluzszagrateampilkarzyki"][uidsString] === undefined)
						wholeRanking["najdluzszagrateampilkarzyki"][uidsString] = 0;
					wholeRanking["najdluzszagrateampilkarzyki"][uidsString] = Math.max(boards[boardID].totalMoves, wholeRanking["najdluzszagrateampilkarzyki"][uidsString]);

					const losersAverage = (ranking[guids[losers]]["rating"] + ranking[guids[losers + 2]]["rating"]) / 2;
					const winnersAverage = (ranking[guids[winners]]["rating"] + ranking[guids[winners + 2]]["rating"]) / 2;

					ranking[guids[winners]]["rating"] = Elo.calculate(ranking[guids[winners]]["rating"], losersAverage, true)["playerRating"];
					ranking[guids[winners + 2]]["rating"] = Elo.calculate(ranking[guids[winners + 2]]["rating"], losersAverage, true)["playerRating"];

					ranking[guids[losers]]["rating"] = Elo.calculate(ranking[guids[losers]]["rating"], winnersAverage, false)["playerRating"];
					ranking[guids[losers + 2]]["rating"] = Elo.calculate(ranking[guids[losers + 2]]["rating"], winnersAverage, false)["playerRating"];

					ranking[guids[losers]]["lost"]++;
					ranking[guids[losers + 2]]["lost"]++;
					ranking[guids[winners]]["won"]++;
					ranking[guids[winners + 2]]["won"]++;

					wholeRanking["teampilkarzyki"] = ranking;
					fs.writeFileSync("./data/ranking.json", JSON.stringify(wholeRanking));

					boards[boardID].removeBoard();
					for (const uid of boards[boardID].uids)
						delete uids[uid];
					delete boards[boardID];

					return;
				}
			}
			else if (interaction.customId == "remis") {
				boardID = uids[interaction.user.id];
				if (boards[boardID].remis.includes(interaction.user.id))
					return;

				boards[boardID].remis.push(interaction.user.id);
				if (boards[boardID].remis.length == 4) {
					for (let i = 1; i <= 10; i++) {
						try {
							boards[boardID].draw();
							break;
						}
						catch (error) {
							console.log("Draw failed " + i + ". time(s) color: " + boards[boardID].lastColor + " " + boards[boardID].lastColor.toString(16));
							if (i == 10)
								console.log(error);
						}
					}
					const attachment = new Discord.MessageAttachment("./tmp/boardTeamPilkarzyki" + uids[interaction.user.id] + ".png");
					const img = await interaction.client.guilds.cache.get("856926964094337044").channels.cache.get("892842178143997982").send({ files: [attachment] });
					const msg = "Remis\n" + img.attachments.first().url;

					let error = false;
					do {
						try {
							await interaction.update({ content: msg, components: [] });
						}
						catch (err) {
							error = true;
							console.log(err);
						}
					} while (error);

					const wholeRanking = JSON.parse(fs.readFileSync("./data/ranking.json"));
					const guids = boards[boardID].uids;

					const tempuids = [...guids];
					let uidsString = "";
					for (const uid of tempuids.sort())
						uidsString += uid + "#";
					uidsString = uidsString.substring(0, uidsString.length - 1);

					if (wholeRanking["najdluzszagrateampilkarzyki"][uidsString] === undefined)
						wholeRanking["najdluzszagrateampilkarzyki"][uidsString] = 0;
					wholeRanking["najdluzszagrateampilkarzyki"][uidsString] = Math.max(boards[boardID].totalMoves, wholeRanking["najdluzszagrateampilkarzyki"][uidsString]);
					fs.writeFileSync("./data/ranking.json", JSON.stringify(wholeRanking));

					boards[boardID].removeBoard();
					for (const uid of boards[boardID].uids)
						delete uids[uid];
					delete boards[boardID];

					return;
				}
			}
			else {
				boardID = uids[interaction.user.id];

				if (interaction.user.id != boards[boardID].turnUID())
					return;

				const indexes = boards[boardID].possibleMoveIndexes();
				if (!indexes.includes(parseInt(interaction.customId)))
					return;

				boards[boardID].currentMoveLength++;
				if (!boards[boardID].move(indexes.indexOf(parseInt(interaction.customId))))
					return;

				if (boards[boardID].turnUID() != interaction.user.id) {
					boards[boardID].longestMove[interaction.user.id] = Math.max(boards[boardID].currentMoveLength, boards[boardID].longestMove[interaction.user.id]);
					boards[boardID].currentMoveLength = 0;

					const ranking = JSON.parse(fs.readFileSync("./data/ranking.json"));
					if (ranking["najdluzszyruch"][interaction.user.id] === undefined)
						ranking["najdluzszyruch"][interaction.user.id] = 0;
					ranking["najdluzszyruch"][interaction.user.id] = Math.max(ranking["najdluzszyruch"][interaction.user.id], boards[boardID].longestMove[interaction.user.id]);

					fs.writeFileSync("./data/ranking.json", JSON.stringify(ranking));
				}
			}

			for (let i = 1; i <= 10; i++) {
				try {
					boards[boardID].draw();
					break;
				}
				catch (error) {
					console.log("Draw failed " + i + ". time(s) color: " + boards[boardID].lastColor + " " + boards[boardID].lastColor.toString(16));
					if (i == 10)
						console.log(error);
				}
			}

			let msg, components;
			if (boards[boardID].win == -1) {
				components = buttons(boardID);
				msg = "Tura: <@" + boards[boardID].turnUID() + "> ";
				if (boards[boardID].remis.length > 0)
					msg += " (" + boards[boardID].remis.length + "/4 osoby poprosiły o remis) ";

				for (let i = 0; i <= 1; i++) {
					if (boards[boardID].surrender[i].length == 1)
						msg += " (<@" + boards[boardID].surrender[i] + "> głosuje za poddaniem się)";
				}
			}
			else {
				components = [];
				msg = "<@" + boards[boardID].uids[boards[boardID].win] + "> i <@" + boards[boardID].uids[boards[boardID].win + 2] + "> wygrali";
			}

			const attachment = new Discord.MessageAttachment("./tmp/boardTeamPilkarzyki" + boardID + ".png");
			const img = await interaction.client.guilds.cache.get("856926964094337044").channels.cache.get("892842178143997982").send({ files: [attachment] });

			msg += "\n" + img.attachments.first().url;

			let error = false;
			do {
				try {
					const message = await interaction.update({ content: msg, components: components });
					boards[boardID].message = message;
				}
				catch (err) {
					error = true;
					console.log(err);
				}
			} while (error);

			if (boards[boardID].win != -1) {
				const winners = boards[boardID].win;
				const losers = (winners + 1) % 2;

				const wholeRanking = JSON.parse(fs.readFileSync("./data/ranking.json"));
				const ranking = wholeRanking["teampilkarzyki"];
				const guids = boards[boardID].uids;

				const tempuids = [...guids];
				let uidsString = "";
				for (const uid of tempuids.sort())
					uidsString += uid + "#";
				uidsString = uidsString.substring(0, uidsString.length - 1);

				if (wholeRanking["najdluzszagrateampilkarzyki"][uidsString] === undefined)
					wholeRanking["najdluzszagrateampilkarzyki"][uidsString] = 0;
				wholeRanking["najdluzszagrateampilkarzyki"][uidsString] = Math.max(boards[boardID].totalMoves, wholeRanking["najdluzszagrateampilkarzyki"][uidsString]);

				const losersAverage = (ranking[guids[losers]]["rating"] + ranking[guids[losers + 2]]["rating"]) / 2;
				const winnersAverage = (ranking[guids[winners]]["rating"] + ranking[guids[winners + 2]]["rating"]) / 2;

				ranking[guids[winners]]["rating"] = Elo.calculate(ranking[guids[winners]]["rating"], losersAverage, true)["playerRating"];
				ranking[guids[winners + 2]]["rating"] = Elo.calculate(ranking[guids[winners + 2]]["rating"], losersAverage, true)["playerRating"];

				ranking[guids[losers]]["rating"] = Elo.calculate(ranking[guids[losers]]["rating"], winnersAverage, false)["playerRating"];
				ranking[guids[losers + 2]]["rating"] = Elo.calculate(ranking[guids[losers + 2]]["rating"], winnersAverage, false)["playerRating"];

				ranking[guids[losers]]["lost"]++;
				ranking[guids[losers + 2]]["lost"]++;
				ranking[guids[winners]]["won"]++;
				ranking[guids[winners + 2]]["won"]++;

				wholeRanking["teampilkarzyki"] = ranking;
				fs.writeFileSync("./data/ranking.json", JSON.stringify(wholeRanking));

				boards[boardID].removeBoard();
				for (const uid of boards[boardID].uids)
					delete uids[uid];
				delete boards[boardID];
			}

			return;
		}

		let guids, usernames;
		if (interaction.isCommand !== undefined && interaction.isCommand()) {
			const gracz1 = interaction.user;
			const gracz2 = interaction.options.getUser("gracz2");
			const gracz3 = interaction.options.getUser("gracz3");
			const gracz4 = interaction.options.getUser("gracz4");

			guids = [gracz1.id, gracz3.id, gracz2.id, gracz4.id];
			usernames = [gracz1.username, gracz3.username, gracz2.username, gracz4.username];
		}
		else {
			if (args === undefined)
				return;
			if (args.length >= 1 && args[0] == "save") {
				for (const [key, value] of Object.entries(boards))
					value.dump(key);

				return;
			}

			if (args.length < 3 || interaction.mentions.users.length == 0) {
				interaction.reply("Format: ty z graczem1 przeciwko graczowi2 z graczem3");
				return;
			}

			guids = new Array(4);
			usernames = new Array(4);

			guids[0] = interaction.author.id;
			usernames[0] = interaction.author.username;
			let i = 1;
			for (const [uid, value] of interaction.mentions.users.entries()) {
				if (i == 1) {
					guids[2] = uid;
					usernames[2] = value.username;
				}
				else if (i == 2) {
					guids[1] = uid;
					usernames[1] = value.username;
				}
				else if (i == 3) {
					guids[3] = uid;
					usernames[3] = value.username;
				}
				i++;
			}
		}

		if (uids[guids[0]] !== undefined) {
			interaction.reply("Już grasz w grę");
			return;
		}
		for (let i = 1; i <= 3; i++) {
			if (uids[guids[i]] !== undefined) {
				interaction.reply("<@" + guids[i] + "> już gra w grę");
				return;
			}
		}

		const check = {};
		for (const uid of guids) {
			if (check[uid]) {
				interaction.reply("Osoby nie mogą się powtarzać");
				return;
			}
			check[uid] = true;
		}

		const wholeRanking = JSON.parse(fs.readFileSync("./data/ranking.json"));
		const ranking = wholeRanking["teampilkarzyki"];

		for (const uid of guids) {
			if (ranking[uid] === undefined)
				ranking[uid] = { lost: 0, won: 0, rating: 1500 };
		}

		wholeRanking["teampilkarzyki"] = ranking;
		fs.writeFileSync("./data/ranking.json", JSON.stringify(wholeRanking));

		const newAccept = { usernames: usernames, uids: guids, accepted: [] };

		const buttonsID = newAcceptID;

		const row = new Discord.MessageActionRow()
			.addComponents(
				new Discord.MessageButton()
					.setLabel("Tak")
					.setCustomId("teampilkarzyki#acceptYes#" + buttonsID)
					.setStyle("PRIMARY"),
				new Discord.MessageButton()
					.setLabel("Nie")
					.setCustomId("teampilkarzyki#acceptNo#" + buttonsID)
					.setStyle("PRIMARY")
			);

		const msg = "Drużynowe piłarzyki: <@" + guids[0] + "> i <@" + guids[2] + "> przeciwko <@" + guids[1] + "> i <@" + guids[3] + ">";
		let error = false;
		do {
			try {
				const message = await interaction.reply({ content: msg, components: [row], fetchReply: true });
				newAccept["message"] = message;
			}
			catch (err) {
				error = true;
				console.log(err);
			}
		} while (error);

		accepts[newAcceptID] = newAccept;
		newAcceptID++;
	}
};
