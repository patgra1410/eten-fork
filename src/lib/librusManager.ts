import { MessageEmbed, Snowflake, TextChannel } from "discord.js";
import config from "../config.json";
// import util from "util";
import { client } from "../index";
import * as bets from "./bets";
import LibrusClient from "./librus-api";
import * as librusApiTypes from "./librus-api/librus-api-types";

interface IRoleRegexes {
	boldRegex: RegExp;
	roleRegex: RegExp;
	roleId: Snowflake;
}

interface IChannels {
	channelId: Snowflake;
	knownNotices: Map<string, Snowflake>;
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
	try {
		const pushChanges = await librusClient.getPushChanges();
		const pushChangesToDelete: number[] = [];
		for (const update of pushChanges.Changes) {
			librusClient.log(update);
			// Get the notice if the element is of type 'SchoolNotices'
			pushChangesToDelete.push(update.Id);
			if (update.Resource?.Type === "SchoolNotices") {
				let schoolNoticeResponse: librusApiTypes.ISchoolNotice;
				try {
					schoolNoticeResponse = await librusClient.schoolNotices.fetch(update.Resource.Id, { force: true });
				}
				catch (error) {
					console.error(error);
					continue;
				}
				librusClient.log(schoolNoticeResponse);
				// Handle blocked SchoolNotices
				let changeType = `changetype: ${update.Type}`;
				if (update.Type === "Add") {
					changeType = "Nowe ogłoszenie";
				}
				else if (update.Type === "Edit") {
					changeType = "Najnowsza zmiana ogłoszenia";
				}
				else if (update.Type === "Delete") {
					console.error(`${update.Resource.Id} - Is deleted but accessible???`.yellow);
					console.error(schoolNoticeResponse);
					continue;
				}
				const baseMessageText = schoolNoticeResponse.Content;

				for (const listener of noticeListenerChannels) {
					let messageText = baseMessageText;
					let tagText = "";
					if (isPlanChangeNotice(schoolNoticeResponse.Subject) && listener.rolesRegexArr.length > 0) {
						for (const roleData of listener.rolesRegexArr) {
							if (roleData.boldRegex.test(messageText))
								tagText = tagText.concat(`<@&${roleData.roleId}>`);
							messageText = messageText.replace(roleData.boldRegex, "**$&**");
							messageText = messageText.replace(roleData.roleRegex, `<@&${roleData.roleId}> $&`);
						}
					}
					const embed = new MessageEmbed()
						.setColor("#D3A5FF")
						.setAuthor({
							name: `📣 ${changeType} w Librusie`
						})
						.setTitle(`**__${schoolNoticeResponse.Subject}__**`)
						.setDescription(messageText.substring(0, 6000))
						.setFooter({ text: `Dodano: ${schoolNoticeResponse.CreationDate}` });
					const channel = await client.channels.fetch(listener.channelId) as TextChannel; // We're guaranteed it's TextChannel from prepareTrackedChannels()
					if (listener.knownNotices.has(schoolNoticeResponse.Id)) {
						const messageId = listener.knownNotices.get(schoolNoticeResponse.Id);
						const message = await channel.messages.fetch(messageId);
						await message.edit({
							content: ((tagText.length > 0) ? tagText : null),
							embeds: [embed.setFooter({ text: `Dodano: ${schoolNoticeResponse.CreationDate} | Ostatnia zmiana: ${update.AddDate}` })]
						});
						await channel.send({
							reply: { messageReference: messageId, failIfNotExists: false },
							content: "Zmieniono ogłoszenie ^"
						});
					}
					else {
						const message = await channel.send({
							content: ((tagText.length > 0) ? tagText : null),
							embeds: [embed]
						});
						listener.knownNotices.set(schoolNoticeResponse.Id, message.id);
					}
				}
				console.log(`${schoolNoticeResponse.Id}  --- Sent!`.green);
				if (isPlanChangeNotice(schoolNoticeResponse.Subject) && update.Type === "Add") {
					const date = new Date("1970-01-01 " + update.AddDate.split(" ")[1]);
					await bets.addTime(new Date(Date.now()));
					await bets.check(date);
				}
			}
			else if (update.Resource?.Type === "Calendars/TeacherFreeDays") {
				const teacherFreeDayResponse = await librusClient.customLibrusRequest(update.Resource.Url, { response: "json" }) as librusApiTypes.APICalendarsTeacherFreeDay;
				if ("Code" in teacherFreeDayResponse) {
					console.error(`TeacherFreeDay ${update.Resource.Id} - has Code:`.yellow);
					console.error(teacherFreeDayResponse);
					continue;
				}
				const teacherFreeDay = teacherFreeDayResponse.TeacherFreeDay;
				librusClient.log(teacherFreeDay);
				const teacher = (await librusClient.customLibrusRequest(teacherFreeDay.Teacher.Url, { response: "json" }) as librusApiTypes.APIUser).User;
				librusClient.log(teacher);
				let changeType = `changetype: ${update.Type}`;
				if (update.Type === "Add")
					changeType = "Dodano nieobecność nauczyciela";
				else if (update.Type === "Edit")
					changeType = "Zmieniono nieobecność nauczyciela";
				else if (update.Type === "Delete")
					changeType = "Usunięto nieobecność nauczyciela";
				let description = `${teacher.FirstName} ${teacher.LastName}`;
				if (update.extraData?.length > 0)
					description = description.concat("\n" + update.extraData);
				if (teacherFreeDay.Name?.length > 0)
					description = description.concat("\n" + teacherFreeDay.Name);
				let timestampFrom = teacherFreeDay.DateFrom;
				let timestampTo = teacherFreeDay.DateTo;
				if ("TimeFrom" in teacherFreeDay)
					timestampFrom = timestampFrom.concat(" " + teacherFreeDay.TimeFrom);
				if ("TimeTo" in teacherFreeDay)
					timestampTo = timestampTo.concat(" " + teacherFreeDay.TimeTo);
				const embed = new MessageEmbed()
					.setColor("#E56390")
					.setTitle(changeType)
					.setDescription(description)
					.setFields([
						{ name: "Od:", value: timestampFrom },
						{ name: "Do:", value: timestampTo }
					])
					.setFooter({ text: `Dodano: ${update.AddDate}` });
				for (const listener of noticeListenerChannels) {
					const channel = await client.channels.fetch(listener.channelId) as TextChannel; // We're guaranteed it's TextChannel from prepareTrackedChannels()
					await channel.send({ embeds: [embed] });
					console.log(`${update.Resource.Url}  --- Sent!`.green);
				}
			}
			else if (update.Resource?.Type === "Calendars/Substitutions") {
				const substitutionResponse = await librusClient.customLibrusRequest(update.Resource.Url, { response: "json" }) as librusApiTypes.APICalendarsSubstitution;
				if ("Code" in substitutionResponse) {
					console.error(`Substitution ${update.Resource.Id} - has Code:`.yellow);
					console.error(substitutionResponse);
					continue;
				}
				const substitution = substitutionResponse.Substitution;
				librusClient.log(substitution);
				// TODO: Caching
				// Error handling? If these don't respond something is very wrong anyways.
				const orgSubject = (await librusClient.customLibrusRequest(substitution.OrgSubject.Url, { response: "json" }) as librusApiTypes.APISubject).Subject;
				librusClient.log(orgSubject);
				const orgTeacher = await librusClient.users.fetch(substitution.OrgTeacher.Id);
				librusClient.log(orgTeacher);
				let newSubject = null;
				if ("Subject" in substitution)
					newSubject = (await librusClient.customLibrusRequest(substitution.Subject.Url, { response: "json" }) as librusApiTypes.APISubject).Subject;
				librusClient.log(newSubject);
				let newTeacher = null;
				if ("Teacher" in substitution)
					newTeacher = await librusClient.users.fetch(substitution.Teacher.Id);
				librusClient.log(newTeacher);
				let changeType = `changetype: ${update.Type}`;
				if (substitution.IsShifted)
					changeType = "Przesunięto zajęcia";
				else if (substitution.IsCancelled)
					changeType = "Odwołano zajęcia";
				else if (update.Type === "Add")
					changeType = "Dodano zastępstwo";
				else if (update.Type === "Edit")
					changeType = "Zmieniono zastępstwo";
				else if (update.Type === "Delete")
					changeType = "Usunięto zastępstwo";
				let lessonNo = substitution.OrgLessonNo;
				if ("LessonNo" in substitution) {
					if (substitution.OrgLessonNo !== substitution.LessonNo)
						lessonNo = `${substitution.OrgLessonNo} ➡️ ${substitution.LessonNo}`;
				}
				let subject = orgSubject.Name;
				if (newSubject != null) {
					if (orgSubject.Id !== newSubject.Id)
						subject = `${orgSubject.Name} ➡️ ${newSubject.Name}`;
				}
				let teacher = `${orgTeacher.FirstName} ${orgTeacher.LastName}`;
				if (newTeacher != null) {
					if (orgTeacher.Id !== newTeacher.Id)
						teacher = `${orgTeacher.FirstName} ${orgTeacher.LastName} ➡️ ${newTeacher.FirstName} ${newTeacher.LastName}`;
				}
				let date = substitution.OrgDate;
				if ("Date" in substitution) {
					if (substitution.OrgDate !== substitution.Date)
						date = `${substitution.OrgDate} ➡️ ${substitution.Date}`;
				}
				const embed = new MessageEmbed()
					.setColor("#9B3089")
					.setTitle(changeType)
					.setFields([
						{ name: "Nr Lekcji:", value: lessonNo },
						{ name: "Przedmiot:", value: subject },
						{ name: "Nauczyciel:", value: teacher },
						{ name: "Data i czas:", value: date }
					])
					.setFooter({
						text: `Dodano: ${update.AddDate}`
					});
				if (update.extraData?.length > 0)
					embed.setDescription(update.extraData);
				for (const listener of noticeListenerChannels) {
					// Temporary
					if (listener.channelId === "884370476128944148") {
						const channel = await client.channels.fetch(listener.channelId) as TextChannel; // We're guaranteed it's TextChannel from prepareTrackedChannels()
						await channel.send({ content: "<@&885211432025731092>", embeds: [embed] });
						console.log(`${update.Resource.Url}  --- Sent!`.green);
					}
				}
			}
			else {
				console.log(`Skipping ${update.Resource.Url}`.bgMagenta.white);
			}
		}
		// do the DELETE(s) only once everything else succeeded
		await librusClient.deletePushChanges(pushChangesToDelete);
	}
	catch (error) {
		console.error("Something in updating notices failed:".bgRed.white);
		console.error(error);
		console.error("Retrying fetchNewSchoolNotices() in 2 mins.".bgRed.white);
		const failDelayTimeMs = 2 * 60 * 1000;
		setTimeout(fetchNewSchoolNotices, (failDelayTimeMs));
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
						throw new Error("RegExp result is null");
					const classYear = res[1];
					const groupText = res[3]; // " - gr. p. TeacherNameHere"
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
							`^((?:${classYear}[A-Ia-i]*[${letterForNoSuffix}][A-Ia-i]*${years}?(?!${badYears}))|(?:${classYear}[A-Ia-i]*[${letterForSuffix}][A-Ia-i]*${years}))${groupText}`, "gm"
						),
						roleRegex: new RegExp(
							`\\*\\*((?:${classYear}[A-Ia-i]*[${letterForNoSuffix}][A-Ia-i]*${years}?(?!${badYears}))|(?:${classYear}[A-Ia-i]*[${letterForSuffix}][A-Ia-i]*${years}))${groupText}\\*\\*`, "gm"
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
						throw new Error("RegExp result is null");
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
			channelId: channel.id,
			rolesRegexArr: rolesRegexArr,
			knownNotices: new Map<string, Snowflake>()
		});
	}
	// console.debug(util.inspect(noticeListenerChannels, false, null, true));
}

export default async function initLibrusManager() {
	librusClient = new LibrusClient({ debug: true });
	await librusClient.login(config.librusLogin, config.librusPass);
	librusClient.pushDevice = parseInt(config.pushDevice);
	// await librusClient.newPushDevice();
	await prepareTrackedChannelData();
	setTimeout(fetchNewSchoolNotices, 2000);
}
