import { MessageReaction, PartialMessageReaction, PartialUser, TextChannel, User } from "discord.js";
import { checkReactionRemove } from "../staszic/checkReaction";
import fs from "fs";
import { client } from "../..";
import { IReactionMessages } from "../types";

export default async function(reaction: MessageReaction|PartialMessageReaction, reactedUser: User|PartialUser) {
	await checkReactionRemove(reaction, reactedUser);

	const reactionMessages = JSON.parse(fs.readFileSync("./data/reactionMessages.json", "utf-8")) as IReactionMessages;
	if (!(reaction.message.id in reactionMessages))
		return;

	const message = await (await client.channels.cache.get(reaction.message.channel.id) as TextChannel).messages.fetch(reaction.message.id);

	let roleName: string = undefined;
	for (const reactionRole of reactionMessages[message.id].reactions) {
		if (reaction.emoji.name == reactionRole.emoji)
			roleName = reactionRole.roleName;
	}

	if (!roleName)
		return;
	
	const user = reaction.message.guild.members.cache.find(member => member.id == reactedUser.id);
	const role = reaction.message.guild.roles.cache.find(role => role.name == roleName);

	await user.roles.remove(role);
}