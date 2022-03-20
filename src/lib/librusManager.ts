import { Snowflake, TextChannel, Util } from "discord.js";
import config from "../config.json";
// import util from "util";
import { client } from "../index";
import * as bets from "./bets";
import LibrusClient from "./librus-api";
import { APIPushChanges, APISchoolNotice } from "./librus-api/librus-api-types";

interface IRoleRegexes {
	boldRegex: RegExp;
	roleRegex: RegExp;
	roleId: Snowflake;
}

interface IChannels {
	channel: TextChannel;
	rolesRegexArr: IRoleRegexes[];
}
const noticeListenerChannels: IChannels[] = [];
let librusClient: LibrusClient;

function isPlanChangeNotice(title: string): boolean {
	let flag = false;
	const titleLower = title.toLowerCase();
	const searchInterests: string[] = ["zmiany w planie", "poniedziałek", "wtorek", "środa", "czwartek", "piątek"];
	for (const searchString of searchInterests) {
		if (titleLower.search(searchString) !== -1) {
			flag = true;
			break;
		}
	}
	return flag;
}

async function fetchNewSchoolNotices(): Promise<void> {
	let pushChanges: APIPushChanges;
	try {
		// pushChanges = await librusClient.getPushChanges();
		pushChanges = await librusClient.getPushChanges();
	}
	catch (error) {
		console.log("Couldn't get PushChanges to get new SchoolNotices:".bgRed.white);
		console.error(error);
		return;
	}
	try {
		for (const update of pushChanges.Changes) {
			// Get the notice if the element is of type 'SchoolNotices'
			if (update.Resource?.Type !== "SchoolNotices")
				continue;
			const librusResponse = await librusClient.librusRequest(update.Resource.Url, {}, "json") as APISchoolNotice;
			// const librusResponse = config.testData;
			// Temporary
			if ("Code" in librusResponse) {
				console.error(`${update.Resource.Id} - has Code:`.yellow);
				console.error(librusResponse);
				continue;
			}

			let changeType = "YOU SHOULDN'T BE ABLE TO SEE THIS";
			if (update.Type === "Add")
				changeType = "Nowe";
			else if (update.Type === "Edit")
				changeType = "Zmienione";
			let messageText =
				`**__:loudspeaker: ${changeType} Ogłoszenie w Librusie__**
				**__${librusResponse.SchoolNotice.Subject}__**
				${librusResponse.SchoolNotice.Content}`.replace(/\t/g, "");

			for (const listener of noticeListenerChannels) {
				if (isPlanChangeNotice(librusResponse.SchoolNotice.Subject)) {
					for (const roleData of listener.rolesRegexArr) {
						messageText = messageText.replace(roleData.boldRegex, "**$&**");
						messageText = messageText.replace(roleData.roleRegex, `<@&${roleData.roleId}> $&`);
					}
				}
				for (const split of Util.splitMessage(messageText))
					await listener.channel.send(split);
			}
			console.log(`${librusResponse.SchoolNotice.Id}  --- Sent!`.green);
			// Do zmiany?
			if (isPlanChangeNotice(librusResponse.SchoolNotice.Subject)) {
				if (update.Type === "Add") {
					await bets.addTime(new Date());
					await bets.check();
				}
			}
		}
	}
	catch (error) {
		console.error("Something in updating notices failed:".bgRed.white);
		console.error(error);
		console.error("Retrying fetchNewSchoolNotices() in 2 mins.".bgRed.white);
		const failDelayTime = 2 * 60;
		setTimeout(fetchNewSchoolNotices, (failDelayTime * 1000));
		return;
	}
	const maxDelayTime = 5 * 60;
	const minDelayTime = 4 * 60;
	setTimeout(fetchNewSchoolNotices, ((Math.round(Math.random() * (maxDelayTime - minDelayTime) + minDelayTime)) * 1000));
}

async function prepareTrackedChannelData(): Promise<void> {
	const classRoleRegex = /^([1-3])([A-Ia-i])(3|4)?$/;
	const classGroupRoleRegex = /^([1-3])([A-Ia-i])( - gr\. p\. .*)$/;
	for (const channelConfig of config.librusNoticeChannels) {
		const channel = await client.channels.fetch(channelConfig.channel);
		if (channel == null) {
			console.log(`${channelConfig.channel} - channel fetch() returned null!!!`.white.bgRed);
			continue;
		}
		if (!channel.isText || channel.type !== "GUILD_TEXT") {
			console.log(`${channel.id} is not a valid guild text channel!!!`.white.bgRed);
			continue;
		}
		channel as TextChannel;
		const rolesRegexArr: IRoleRegexes[] = [];
		if (channelConfig.roles) {
			const guildRoles = await (await client.guilds.fetch(channelConfig.guild)).roles.fetch();
			// Hack na grupy - grupowe role muszą być przed
			// zwykłymi klasowymi inaczej się będzie źle tagowało prawdopodobnie
			for (const role of guildRoles) {
				// Check if a role is a class role (judged from name)
				if (classGroupRoleRegex.test(role[1].name)) {
					// Create the beautifully looking regex
					const res = classGroupRoleRegex.exec(role[1].name);
					if (res == null)
						throw new Error("RegEx result is null");
					const classYear = res[1];
					const classLetter = res[2];
					rolesRegexArr.push({
						boldRegex: new RegExp(
							`^${classYear}${classLetter}${res[3]}`, "gm"
						),
						roleRegex: new RegExp(
							`\\*\\*${classYear}${classLetter}${res[3]}\\*\\*`, "gm"
						),
						roleId: role[1].id
					});
				}
			}
			//
			for (const role of guildRoles) {
				// Check if a role is a class role (judged from name)
				if (classRoleRegex.test(role[1].name)) {
					// Create the beautifully looking regex
					const res = classRoleRegex.exec(role[1].name);
					if (res == null)
						throw new Error("RegEx result is null");
					const classYear = res[1];
					let years = "4";
					let badYears = "3";
					let letterForSuffix = res[2].toUpperCase();
					let letterForNoSuffix = res[2];
					if (res[2].toUpperCase() === res[2]) {
						years = "3";
						badYears = "4";
						letterForSuffix = res[2].toLowerCase();
						letterForNoSuffix = res[2];
					}
					rolesRegexArr.push({
						boldRegex: new RegExp(
							`^((?:${classYear}[A-Ia-i]*[${letterForNoSuffix}][A-Ia-i]*${years}?(?!${badYears}))|(?:${classYear}[A-Ia-i]*[${letterForSuffix}][A-Ia-i]*${years}))`, "gm"
						),
						roleRegex: new RegExp(
							`\\*\\*((?:${classYear}[A-Ia-i]*[${letterForNoSuffix}][A-Ia-i]*${years}?(?!${badYears}))|(?:${classYear}[A-Ia-i]*[${letterForSuffix}][A-Ia-i]*${years}))\\*\\*`, "gm"
						),
						roleId: role[1].id
					});
				}
			}
		}
		noticeListenerChannels.push({
			channel: channel,
			rolesRegexArr: rolesRegexArr
		});
	}
	// console.debug(util.inspect(trackingChannels, false, null, true));
}

export default async function initLibrusManager() {
	librusClient = new LibrusClient();
	await librusClient.login(config.librusLogin, config.librusPass);
	librusClient.pushDevice = parseInt(config.pushDevice);
	await prepareTrackedChannelData();
	setTimeout(fetchNewSchoolNotices, 2000);
}