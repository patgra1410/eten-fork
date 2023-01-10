import { ChannelTypes } from "discord.js/typings/enums";
import { CategoryChannel, Permissions, TextChannel, ColorResolvable, MessageEmbed } from "discord.js";
import { client } from "../..";
import { Embed } from "@discordjs/builders";
import { repeatingDigitsText } from "../types";

const toCreate = [
	// {
	// 	categoryId: "1027309416787226684",
	// 	name: "Analiza",
	// 	ammount: 6
	// },
	// {
	// 	categoryId: "1027309478208622713",
	// 	name: "Geometria z algebrą liniową",
	// 	ammount: 8
	// },
	// {
	// 	categoryId: "1027309733838860379",
	// 	name: "Podstawy matematyki",
	// 	ammount: 10
	// },
	// {
	// 	categoryId: "1027309385548058655",
	// 	name: "Wstęp do programowania",
	// 	ammount: 14
	// },
	// {
	// 	categoryId: "1029117794857537656",
	// 	name: "Analiza z mathematicą",
	// 	ammount: 4
	// }
	{
		categoryId: "1027309416787226684",
		name: "Analiza jsim",
		ammount: 2
	},
	{
		categoryId: "1027309478208622713",
		name: "Geometria z algebrą liniową jsim",
		ammount: 2
	}
];

export async function create() {
	const guildId = "999695571575119902";
	const guild = await client.guilds.fetch(guildId);

	for (const create of toCreate) {
		const category = await client.channels.fetch(create.categoryId) as CategoryChannel;

		for (let i = 1; i <= create.ammount; i++) {
			const role = await guild.roles.create({
				name: `${create.name} ${i}`,
			});
			const channel: TextChannel = await guild.channels.create(`${create.name} ${i}`, {
				type: ChannelTypes.GUILD_TEXT,
				permissionOverwrites: [{
					id: role.id,
					allow: ["VIEW_CHANNEL", "SEND_MESSAGES"]
				},
				{
					id: guild.roles.everyone.id,
					deny: ["VIEW_CHANNEL", "SEND_MESSAGES"]
				}]
			});

			await channel.setParent(category, { lockPermissions: false });
		}
	}
}

export async function createReactionMessages(channelId: string) {
	const channel = client.channels.cache.get(channelId) as TextChannel;
	const colors: string[] = ["#029dd9", "#1078ab", "#0064ab", "#0b3664", "#050831"];
	let colorI = 3;

	for (const przedmiot of toCreate) {
		let desc = "Kliknij odpowiednią reakcję, żeby dostać role swojej grupy\n\n";

		for (let i = 1; i <= przedmiot.ammount; i++) {
			desc += `${repeatingDigitsText[(i > 10 ? i % 10 : i)]} - ${przedmiot.name} gr. ${i}.\n`;

			if (i % 10 == 0) {
				const embed = new MessageEmbed()
					.setTitle(`Wybierz swoją grupę z ${przedmiot.name}`)
					.setDescription(desc)
					.setColor(colors[colorI] as ColorResolvable);
				colorI++;
				desc = "Kliknij odpowiednią reakcję, żeby dostać role swojej grupy\n\n";

				const msg = await channel.send({ embeds: [embed] });
				for (let j = 1; j <= 10; j++) {
					await msg.react(repeatingDigitsText[j > 10 ? j % 10 : j]);
				}
			}
		}

		if (przedmiot.ammount % 10 != 0) {
			const embed = new MessageEmbed()
				.setTitle(`Wybierz swoją grupę z ${przedmiot.name}`)
				.setDescription(desc)
				.setColor(colors[colorI] as ColorResolvable);
			colorI++;
			desc = "Kliknij odpowiednią reakcję, żeby dostać role swojej grupy\n\n";

			const msg = await channel.send({ embeds: [embed] });
			for (let j = 1; j <= przedmiot.ammount % 10; j++) {
				await msg.react(repeatingDigitsText[j > 10 ? j % 10 : j]);
			}
		}
	}

}
