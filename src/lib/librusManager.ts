import { MessageEmbed, Snowflake, TextBasedChannel, TextChannel } from "discord.js";
import config from "../config.json";
// import util from "util";
import { client } from "../index";
import * as bets from "./bets";
import LibrusClient from "./librus-api";
import * as librusApiTypes from "./librus-api/librus-api-types";
import { sha256 } from "./util";
import fs from "fs";

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
const globalKnownNotices = new Map<string, string>();

async function tempFunnyKnownNotices() {
	const why = {
		"LID-NBOARD-NOTICE-1882-NMXSZSSWUYD4EXTN6WXJ": "a471787e8b596426f2de004bc15ce3de646bd84e105094bd50e162331e85aa67",
		"LID-NBOARD-NOTICE-1882-8H6K7SQCKBFCGGVKKZNK": "829be06a669a5b1cf28443ee3abbb1af5dae164460e57003ddd09b68052c3a2f",
		"LID-NBOARD-NOTICE-1882-EO4M56547L8YTCIWN3SG": "3d7da2b89395b88cfcc5513898eb7486351d38641cd1667e87bd849744d75cc0",
		"LID-NBOARD-NOTICE-1882-UD55TKRMAZ6RFHAYS4JD": "be7a7202846a96e06b496e46725c35ae92366b01524eda0237bb0f6e618f0f24",
		"LID-NBOARD-NOTICE-1882-A8CF6HLGRX7ZGQQDRVSL": "a77322c763fd22bab3ae536be46b134105d7672e59c49a0379d98ca8428a0b8f",
		"LID-NBOARD-NOTICE-1882-MMJTUPBOMTPWBSVYAVOQ": "985fff6afc95df0063ed0e3aeaa61984d2fda7f754b2da4ee2ed3caba5439226",
		"LID-NBOARD-NOTICE-1882-VHGJTVLP5AVUVAKFRBXE": "963293746950127644894c3d0beb0770c067b30ed560f8cab2e198f9b0466175",
		"LID-NBOARD-NOTICE-1882-EVNYDH4KGQRJVTKY3DIL": "a8103ce79422c2e0b0f39398081baa27f839199f5e691f1a34811bc0fd719f3b",
		"LID-NBOARD-NOTICE-1882-WWXQOYXRAEWHMFOP6ULK": "dfec004879301d93d0f4e9f168fbf44cba6a7f147d6d6f7c3f38c8db7947ce7d",
		"LID-NBOARD-NOTICE-1882-WOTS4R37OWYSO8JDT3X8": "d00c346594f730f3191d00e88e96f8d9d63b306d5e901cfb6f5aef651301a7e3",
		"LID-NBOARD-NOTICE-1882-ILLXRLYZWFRXKVLGJZ65": "2ff583cba81fc1ea0fe3328d47f203405ed2ca268a7505339b5b2dbd06da6c92",
		"LID-NBOARD-NOTICE-1882-IDZLUFHFSM7XRXWOXZIM": "180f1032a7b0b0c3a4cacb832cc42e40a0b933e10f2924bac8d5a8338df30e87",
		"LID-NBOARD-NOTICE-1882-RCZEOGFBLQVKZAE3ZDCB": "112a81fd9a45ce6e931eb8883209ca4cf0c9d4e609a3a75477849d95194c709b",
		"LID-NBOARD-NOTICE-1882-KSRWAOUR6GGOUYVG6AMG": "6c03f2680d08cab9e9cd4ce83b603d22426e430305107ddd1079dd085232df78",
		"LID-NBOARD-NOTICE-1882-DHYSVBXBLLYWOPJYLCMS": "9297fe78618cbf0d476dacc1edcbfb78b3a1e30788fee59ed41439a0fac7d138",
		"LID-NBOARD-NOTICE-1882-SR7OCDCFEEPEGWID4A7A": "39b935510dc2a39a729b655f28ec88f5853d030b67f4e57a90aef43f3c038807",
		"LID-NBOARD-NOTICE-1882-MCZITLKZ8ONC6O6WNZY7": "fb48682a43f2d7fa86294192e4a850afcb7363a349718039cab5fa4f6e297c99",
		"LID-NBOARD-NOTICE-1882-OSZ67RGUKV446UJSX8Q3": "3a9b84ab4eeb3d9779a8bdc84ed7e831ecfcec5f8efa393c65faf1c80522aa7a",
		"LID-NBOARD-NOTICE-1882-P8LOOYKJMROMWASLFTXV": "dc48efd8c593650b16a5e3276687ba3f488c326b2dd5707fe1c003192d2f50ee",
		"LID-NBOARD-NOTICE-1882-43KWO4XSSKU4AQU8HMJ7": "d8d41337ff500ed599daa6b891a57696e61fad34e8a218b91e9ff79007330573",
		"LID-NBOARD-NOTICE-1882-PA8JOMZUT76WQDNYWECJ": "c3064b0c5d89a737a1fd568d75fa3da1a394ef43c5932db69c3526a1fab27589",
		"LID-NBOARD-NOTICE-1882-TLOVQVVSA7OG3CWUZ6DT": "84e6e82296ba170d7b7e37cd9d07f6a4dfc07ff4542e34d1d8e4fa597f1eec8e",
		"LID-NBOARD-NOTICE-1882-OMCLGL8RY6WKHOAMSDW3": "bcaa47b526fa70bb5ecbf4e831f9014a9e65d1a88639b6a66c2b1803da4ed379",
		"LID-NBOARD-NOTICE-1882-A65OY4AACE8M7VDSLOXX": "68c722afbe5a840908dc16a4201d6682f4cacd53f19a10d437c9053983649b4e",
		"LID-NBOARD-NOTICE-1882-GMCRP8OSJJZMA5Y86FM5": "dc000c4da6d05987f5eb9c9a16d05608cdbf6a2e965b0844aae3782b7ffe1abb",
		"LID-NBOARD-NOTICE-1882-QFV6OMOM858N4TNZZZTJ": "9b730365315de1f88468a4c35ae350709bdbf6b3dafe37831ad3cc484161f60e",
		"LID-NBOARD-NOTICE-1882-RVUYKDAU88UUY4Y8VG37": "da85c3f663dcd32667d5f3eb016d12098bf4637699b34ad7c41c14b581a2998b",
		"LID-NBOARD-NOTICE-1882-ERSULV4QAZBCAB7LEX38": "c4fff5d5d96c7480f17be05c1af93603c4f8298f40620609fe71fdf2519f7b62",
		"LID-NBOARD-NOTICE-1882-FHB7RW33UDHD8X4ANDI7": "1bf22a1980ee8075b651b0afb4ccd6677a8d04e736a9a64c8d3115b0ed014a6c",
		"LID-NBOARD-NOTICE-1882-6IOGNTUIYHBYOQIUTUQQ": "d39ad0604bcde494df465c2f12104dd729bf810765c8f22af6b4bbfafb1286b8",
		"LID-NBOARD-NOTICE-1882-4P4AAXZOU3LK4BIT87PE": "400d79bd7ef729a105f7eb8eacef498843bcfb1bc30d96e2d8ce1eb3479b226e",
		"LID-NBOARD-NOTICE-1882-CFHMDCJPOKPQ7ANXH7CK": "014ba7f54346a1a9fdb7c6dafe5e1e7adc3efec119b82c15dd4142e5d056d88e",
		"LID-NBOARD-NOTICE-1882-JTMO4EW4M7SOL47VCMZL": "ece4352f8d74cccaecbf05251477ed50a467cba3cbc3623a5b52e82b28000804",
		"LID-NBOARD-NOTICE-1882-PFLHSBOPU6NCY64DERE8": "dd73753ddb2889a8baaf2b653de5fb7c370426fde720167cc4e1006190363f91",
		"LID-NBOARD-NOTICE-1882-VJOJK3EHZIR4YHH7XAVZ": "a8137411e194b654ff0bbd6a893511dab1876041b1e84a958cb4db4a566101a6",
		"LID-NBOARD-NOTICE-1882-7LXQAK74R7HFRHSTAL8W": "8f27852045dfde3b05056a450984a88de8afb2e7bed4958d50e6338de2b3ccf4",
		"LID-NBOARD-NOTICE-1882-6J3NURGACW8LS65ILZED": "1b7c9ec9701df27f6aa2cd5af53df2d73c371351c6ad082e0248c3c1151813d0",
		"LID-NBOARD-NOTICE-1882-6OHCRTDH3335NLY7DY3D": "6c4fdee479738dfd9744b323d233f807fbeaf7dce66a0fabf9adcd972a2a162f",
		"LID-NBOARD-NOTICE-1882-ERROF3T77JBZAMSQOND3": "d0535b5c4c76b3d416402f1c6fc944bbb0bf32afb26155cba5fd2d46133c6984",
		"LID-NBOARD-NOTICE-1882-L4EGSMYCNT6ZDTLMYSAK": "c5cc5fa7c1eb69a50fbd24630493719c901c11408849ccea73d3beae87197ec7",
		"LID-NBOARD-NOTICE-1882-ITYG7QEAXKTH43RCUFOJ": "456b29b720c320eb062a34fac2731886a0b1c1dcc86bf86fcf19fa3ee546fd4b",
		"LID-NBOARD-NOTICE-1882-SNWZY7XQAPAJMGXF4RFM": "733a49941aae70862c46a6664c82075de5937ac0d4d4a6ee67b8b35d0bc9eb20",
		"LID-NBOARD-NOTICE-1882-RVUDJZWSFWHC7FKKJMDC": "cc5546d4fb7861bdcbcbed717fe7f09025649ec54d6544971b21dd23df7aa507",
		"LID-NBOARD-NOTICE-1882-GBKMBKZK3OT5V3MLI7N5": "b0ee645eb7031218a2020a6b7bfe49b1a5efa1ee5ae28f215894a59dadb7bc65",
		"LID-NBOARD-NOTICE-1882-IWCPUNMGNYMDCN5KRT6U": "a79f51fab1455b8191b44bdbbc1365cb78c3bf9ed939d34a6a153ff78dea3b1c",
		"LID-NBOARD-NOTICE-1882-PHF8RN84HAVHFNOPJW5Z": "89be779fbd5fe6fbfe67009b8d490a2d60e472fd07cbba3682407a2e59a8ff9a",
		"LID-NBOARD-NOTICE-1882-S53T87XTLPM3MARKJGKQ": "641579714746a65eee2d486d1209a12baaa40e5b9ff944ab32ee8ab202b3cec5",
		"LID-NBOARD-NOTICE-1882-55CGP6UQZCCIEOBRSETL": "c1b47cb78afb0bc339fea9538d4ea16055e6fe6c63f528c48dc4ceaa7fe6a28c",
		"LID-NBOARD-NOTICE-1882-D8SIX8DLOPIMTZR47P36": "c6cf508db8021d85f54da59a05e3d4d4db0fe832953c20f7aad2f2eda9a592da",
		"LID-NBOARD-NOTICE-1882-WNHCB4DAGYFBOCI44MP7": "dc2f6e5c490d017ebbd28202aa9b8cb2ef7c8f6da3d06f1cfeac40ca70a8d059",
		"LID-NBOARD-NOTICE-1882-U5ZFY3PVLDTJ7OT5JM5L": "aea51f2422cc071a8cc60f6b213c1cd2a34a3a0a865b6bddbf844a103eda9161",
		"LID-NBOARD-NOTICE-1882-XNO5ID8ZGGHZR8NEPCSR": "226b6d9edea5c5b4ae3437169dcd0a1d427cd7c3ae95496d680a8b5537b975e5",
		"LID-NBOARD-NOTICE-1882-8TYLTIXJXAAHFRFC4C7Z": "484a48d33dc2e877165bf2512f27e6316d3430230f2a4483f0286ed5cb0120b8",
		"LID-NBOARD-NOTICE-1882-F8UZ7QK5OWKQ4QG8NCM3": "a4088a8a09534575df0583144aafe779056b9b58e1a45bcae1ea4675c85cf2b6",
		"LID-NBOARD-NOTICE-1882-JG45BZTFCIUQIZFGERXR": "21d2a912112cd4e0fe323ce63d3d3bac01f02cd62b3bc58046c25ce7d3498d72",
		"LID-NBOARD-NOTICE-1882-7AORNJTVDPCOE53BPNUD": "ae7bd7d6bcc106ca7c7009e0f68aabe07cc9e5dc1c95ee0164dc224d2ccf4f18",
		"LID-NBOARD-NOTICE-1882-6ASAZ6458REBWL84G6NT": "39c1e910177d4651998d7c84562b39ed76dd1deedd662aacaf74bfc13b00bbe1",
		"LID-NBOARD-NOTICE-1882-3O6G6DTX5KPPP57FH7O5": "196490f8b19f6b73ab349ef973e4253cd85394bf5c7aa629ffd658cf889724e3",
		"LID-NBOARD-NOTICE-1882-Z5BCZKBEIACKEAU6XUHX": "029d2d816c6e3c8a3cf5822ddc9b2220d13fa25853ebf8031f6982472ac7fc88",
		"LID-NBOARD-NOTICE-1882-KNMGCLP7A5S4H6QBHN6J": "801cafe2b942344b91c2015a3606e65297eb91fbe3e61b2786ea49f91ea82dbe",
		"LID-NBOARD-NOTICE-1882-YKBB8IZ6CFXFCS84UHKM": "8def433f63d1567320345765286beb424788d31942bc2d69e13f3792fa64bae3",
		"LID-NBOARD-NOTICE-1882-Q3SYVLYASSC3RNWLXWMT": "c54f0d4f04ba720f5db2831b4d11ef71f45bdd76d6cac3e508c8707626aca91d",
		"LID-NBOARD-NOTICE-1882-S4KRNSBVUEFH3HXMVRY4": "de6b8a736eed47627ef207da6fc27e397feb28736d8f464a4ebffa36cf4565a3",
		"LID-NBOARD-NOTICE-1882-WTWMQ8KCX5BVQPRTLXQG": "cadb2e1f5c2f2bab4602f1582d63dd86a1f74af32d33a581dbb8642048b95eb5",
		"LID-NBOARD-NOTICE-1882-X4JZCRQVGZIZTVE6WJDA": "9a1d9498d36c51979373f797c632c933e79ee0cc464862004fa03d6ddc628cfd",
		// "LID-NBOARD-NOTICE-1882-DIGU48FKE3Z8IOJNBDRW": "d46e82f33c2999d0c17344ca6c6de87856f440f03a2fd17327f535056425dccb",
		"LID-NBOARD-NOTICE-1882-4IEBQRT7ISTJQ8PIHPPV": "5cac45ad2aa02550c0a9460c63024c95dc4dfb9bd605897ccea3dc32230397a1"
	};
	for (const [k, v] of Object.entries(why)) {
		globalKnownNotices.set(k, v);
	}
}

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
	const failDelayTimeMs = 2 * 60 * 1000;
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
						.setDescription(messageText.substring(0, 4096)) // TODO lepiej
						.setFooter({ text: `Dodano: ${schoolNoticeResponse.CreationDate}` });
					const origChannel = await client.channels.fetch(listener.channelId);
					const channel = origChannel as TextChannel; // We're guaranteed it's TextChannel from prepareTrackedChannels()
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
						globalKnownNotices.set(schoolNoticeResponse.Id, sha256(schoolNoticeResponse.Content));
						if (origChannel.type == "GUILD_NEWS")
							await message.crosspost();
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
				const teacherFreeDayResponse = await ((await librusClient.customLibrusRequest(update.Resource.Url)) as Response).json() as librusApiTypes.APICalendarsTeacherFreeDay;
				if ("Code" in teacherFreeDayResponse) {
					console.error(`TeacherFreeDay ${update.Resource.Id} - has Code:`.yellow);
					console.error(teacherFreeDayResponse);
					continue;
				}
				const teacherFreeDay = teacherFreeDayResponse.TeacherFreeDay;
				librusClient.log(teacherFreeDay);
				const teacher = (await ((await librusClient.customLibrusRequest(teacherFreeDay.Teacher.Url)) as Response).json() as librusApiTypes.APIUser).User;
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
					const origChannel = await client.channels.fetch(listener.channelId);
					const channel = origChannel as TextChannel; // We're guaranteed it's TextChannel from prepareTrackedChannels()
					const message = await channel.send({ embeds: [embed] });
					if (origChannel.type == "GUILD_NEWS")
						await message.crosspost();
					console.log(`${update.Resource.Url}  --- Sent!`.green);
				}
			}
			else if (update.Resource?.Type === "Calendars/Substitutions") {
				const substitutionResponse = await ((await librusClient.customLibrusRequest(update.Resource.Url)) as Response).json() as librusApiTypes.APICalendarsSubstitution;
				if ("Code" in substitutionResponse) {
					console.error(`Substitution ${update.Resource.Id} - has Code:`.yellow);
					console.error(substitutionResponse);
					continue;
				}
				const substitution = substitutionResponse.Substitution;
				librusClient.log(substitution);
				// TODO: Caching
				// Error handling? If these don't respond something is very wrong anyways.
				const orgSubject = (await ((await librusClient.customLibrusRequest(substitution.OrgSubject.Url)) as Response).json() as librusApiTypes.APISubject).Subject;
				librusClient.log(orgSubject);
				const orgTeacher = await librusClient.users.fetch(substitution.OrgTeacher.Id);
				librusClient.log(orgTeacher);
				let newSubject = null;
				if ("Subject" in substitution)
					newSubject = (await ((await librusClient.customLibrusRequest(substitution.Subject.Url)) as Response).json() as librusApiTypes.APISubject).Subject;
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
		console.error("Something in checking pushChanges failed:".bgRed.white);
		console.error(error);
		console.error(`Retrying fetchNewSchoolNotices() in ${failDelayTimeMs / 60000} mins.`.bgRed.white);
		setTimeout(fetchNewSchoolNotices, failDelayTimeMs);
		return;
	}
	try {
		// Override na czas gdy librus ssie masywnego footlonga subwayowego
		const schoolNotices = await librusClient.schoolNotices.fetchAll();
		// TODO: Sort, but safe to assume it's sorted
		for (const notice of schoolNotices) {
			for (const listener of noticeListenerChannels) {
				let messageText = notice.Content;
				let tagText = "";
				// If is plan change notice, tag appropriate roles and highlight them in content text
				if (isPlanChangeNotice(notice.Subject) && listener.rolesRegexArr.length > 0) {
					for (const roleData of listener.rolesRegexArr) {
						if (roleData.boldRegex.test(messageText))
							tagText = tagText.concat(`<@&${roleData.roleId}>`);
						messageText = messageText.replace(roleData.boldRegex, "**$&**");
						messageText = messageText.replace(roleData.roleRegex, `<@&${roleData.roleId}> $&`);
					}
				}
				let footerText = `❗ Fallback | Dodano: ${notice.CreationDate}`;
				let changeType = "Nowe ogłoszenie";
				if (globalKnownNotices.has(notice.Id)) {
					const contentHash = sha256(notice.Content);
					const knownContentHash = globalKnownNotices.get(notice.Id);
					if (contentHash !== knownContentHash) {
						console.log(`Hash mismatch: ${contentHash} ${knownContentHash}`);
						changeType = "Najnowsza zmiana ogłoszenia";
						footerText = footerText.concat(` | Zarejestrowano zmianę: ${new Date().toISOString().replace(/T/, " ").replace(/\..+/, "")}`);
					}
					else {
						continue;
					}
				}
				const embed = new MessageEmbed()
					.setColor("#D3A5FF")
					.setAuthor({ name: `📣 ${changeType} Ogłoszenie w Librusie` })
					.setTitle(`**__${notice.Subject}__**`)
					.setDescription(messageText.substring(0, 4096)) // TODO lepiej
					.setFooter({ text: footerText });
				const channel = await client.channels.fetch(listener.channelId) as TextBasedChannel;
				if (listener.knownNotices.has(notice.Id)) {
					const messageId = listener.knownNotices.get(notice.Id);
					const message = await channel.messages.fetch(messageId);
					await message.edit({
						content: ((tagText.length > 0) ? tagText : null),
						embeds: [embed.setFooter({ text: footerText })]
					});
					(await channel.send({
						reply: { messageReference: messageId, failIfNotExists: false },
						content: `Zmieniono ogłoszenie "*${notice.Content}*"`
					})).crosspost();
				}
				else {
					const message = await channel.send({
						content: ((tagText.length > 0) ? tagText : null),
						embeds: [embed]
					});
					listener.knownNotices.set(notice.Id, message.id);
					globalKnownNotices.set(notice.Id, sha256(notice.Content));
					if (channel.type == "GUILD_NEWS")
						await message.crosspost();
				}
			}
		}
	}
	catch (error) {
		console.error("Something in manual update failed:".bgRed.white);
		console.error(error);
		console.error(`Retrying fetchNewSchoolNotices() in ${failDelayTimeMs / 60000} mins.`.bgRed.white);
		setTimeout(fetchNewSchoolNotices, failDelayTimeMs);
		return;
	}
	// Tump globalKnownNotices map to a file in ./data/
	const tempObj: Record<string, string> = {};
	for (const [k, v] of globalKnownNotices) {
		tempObj[k] = v;
	}
	fs.writeFileSync("./data/globalKnownNotices.json", JSON.stringify(tempObj));
	const maxDelayTime = 10 * 60;
	const minDelayTime = 8 * 60;
	setTimeout(fetchNewSchoolNotices, ((Math.round(Math.random() * (maxDelayTime - minDelayTime) + minDelayTime)) * 1000));
	console.log("DONE".gray);
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
		if (!channel.isText || (channel.type !== "GUILD_TEXT" && channel.type !== "GUILD_NEWS")) {
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
	// console.log(await librusClient.newPushDevice());
	await prepareTrackedChannelData();
	await tempFunnyKnownNotices(); // Delete on next commit along with original function
	const globalKnownNoticesFile: Record<string, string> = JSON.parse(fs.readFileSync("./data/globalKnownNotices.json", "utf-8"));
	for (const [k, v] of Object.entries(globalKnownNoticesFile)) {
		globalKnownNotices.set(k, v);
	}
	setTimeout(fetchNewSchoolNotices, 2000);
}
