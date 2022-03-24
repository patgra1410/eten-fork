import fs from "fs";
import cron from "cron";
import { IInfo } from "./types";

export default function() {
	let cronTime = JSON.parse(fs.readFileSync("./data/info.json", "utf8")).uptimeCron;
	if (!fs.existsSync("./data/uptime") || fs.existsSync("./data/crashed")) {
		fs.writeFileSync("./data/uptime", "0");

		if (fs.existsSync("./data/crashed")) {
			const date = new Date(Date.now());
			cronTime = `${date.getMinutes()} ${date.getHours()} * * *`;
			fs.rmSync("./data/crashed");

			const info: IInfo = JSON.parse(fs.readFileSync("./data/info.json", "utf8"));
			info.uptimeCron = cronTime;
			fs.writeFileSync("./data/info.json", JSON.stringify(info));
		}
	}

	new cron.CronJob(
		cronTime,
		async function() {
			fs.writeFileSync("./data/uptime", (parseInt(fs.readFileSync("./data/uptime", "utf-8")) + 1).toString());
		},
		null,
		true,
		"Europe/Warsaw"
	).start();
}