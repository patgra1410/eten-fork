import fs from "fs";
import Discord, { TextChannel } from "discord.js";
import config from "../config.json";
import { client } from "../index";

interface IBets {
	[user: string]: {
		time: number, message: string
	}
}

export async function addTime(time: Date) {
	const predictions = JSON.parse(fs.readFileSync("./data/predictions.json", "utf-8"));
	if (predictions.bets[time.getDay()] === undefined)
		predictions.bets[time.getDay()] = [];
	predictions.bets[time.getDay()].push(time.getTime());
	fs.writeFileSync("./data/predictions.json", JSON.stringify(predictions));
}

export async function check() {
	// eneabled?
	if (!config.bets.eneabled)
		return;

	const date = new Date();
	const now = date.getMilliseconds() + date.getSeconds() * 1000 + date.getMinutes() * 60 * 1000 + date.getHours() * 60 * 60 * 1000;

	const users = [];
	const bets: IBets = JSON.parse(fs.readFileSync("./data/bets.json", "utf8"));

	if (Object.keys(bets).length == 0)
		return;

	for (const [user, time] of Object.entries(bets)) {
		const diff = Math.abs(time.time - now);
		// let mili = parseInt(diff)
		// parseInt jest dla stringów, czy nie chciałeś tu roundować czy coś idk? podieniłem na math.round
		const mili = Math.round(diff);
		const sec = Math.floor(mili / 1000);
		const mins = Math.floor(sec / 60);
		const hours = Math.floor(mins / 60);
		// Mam nadzieję, że to działa, nie wiem co to za czarna magia że skaczesz z inta na stringa na inta (porównanie) na stringa
		const miliS = ("000" + (mili % 1000)).slice(-3);
		const secS = ("00" + (sec % 60)).slice(-2);
		const minsS = ("00" + (mins % 60)).slice(-2);
		const hoursS = ("00" + (hours % 60)).slice(-2);

		let niceDiff = "";
		if (time.time > now)
			niceDiff = "za pózno o ";
		else
			niceDiff = "za wcześnie o ";
		if (hours > 0)
			niceDiff += `${hoursS}:${minsS} godzin`;
		else if (mins > 0)
			niceDiff += `${minsS} minut`;
		else if (sec > 0)
			niceDiff += `${secS} sekund`;
		else if (mili > 0)
			niceDiff += `${miliS} milisekund`;

		users.push({
			user: user,
			time: time.time,
			message: time.message,
			diff: diff,
			niceDiff: niceDiff
		});
	}

	users.sort((a, b) => {
		return a.diff - b.diff;
	});

	let desc = "";
	let i = 1;
	for (const user of users) {
		desc += `**${i.toString()}.** <@${user.user}>: ${user.niceDiff} (podany czas: ${user.message})\n`;
		i++;
	}

	const embed = new Discord.MessageEmbed()
		.setColor(`#${Math.floor(Math.random() * 16777215).toString(16)}`)
		.setTitle("Dzisiejsze wyniki zakładuw")
		.setDescription(desc);

	(client.guilds.cache.get(config.bets.guild).channels.cache.get(config.bets.channel) as TextChannel).send({ embeds: [embed] });

	fs.writeFileSync("./data/bets.json", "{}");

	const ranking = JSON.parse(fs.readFileSync("./data/ranking.json", "utf-8"));

	if (!(users[0].user in ranking.bets))
		ranking.bets[users[0].user] = 0;
	ranking.bets[users[0].user]++;

	fs.writeFileSync("./data/ranking.json", JSON.stringify(ranking));
}