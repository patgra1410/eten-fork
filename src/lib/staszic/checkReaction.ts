import { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";

// TODO: change to reaction collector
export async function checkReactionAdd(reaction: MessageReaction|PartialMessageReaction, reactedUser: User|PartialUser) {
	try {
		const letters = ["🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮"];
		const letter = String.fromCharCode(letters.indexOf(reaction.emoji.name) + "A".charCodeAt(0));
		const user = reaction.message.guild.members.cache.find(member => member.id == reactedUser.id);
		let role = undefined;

		if (reaction.message.id == "1000838700558729227") // 1. klasa
			role = user.guild.roles.cache.find(foundRole => foundRole.name === `1${letter}`);
		else if (reaction.message.id == "1000838731336515674") // 2. klasa
			role = user.guild.roles.cache.find(foundRole => foundRole.name === `2${letter}`);
		else if (reaction.message.id == "1000838763460702228") // 3. klasa 
			role = user.guild.roles.cache.find(foundRole => foundRole.name === `3${letter}`);
		else if (reaction.message.id == "1000838792762110042") // 4. klasa
			role = user.guild.roles.cache.find(foundRole => foundRole.name === `4${letter}`);

		if (role)
			await user.roles.add(role);
	}
	catch (except) {
		console.error(reaction);
		console.error(except);
		const user = reaction.message.guild.members.cache.find(member => member.id == reactedUser.id);
		user.send("Był problem z dodaniem twojej roli na serwerze Staszicowym, spróbuj jeszcze raz (jeśli zdaży się to pare razy to napisz do któregoś admina).");
	}
}

export async function checkReactionRemove(reaction: MessageReaction|PartialMessageReaction, reactedUser: User|PartialUser) {
	try {
		const letters = ["🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮"];
		const letter = String.fromCharCode(letters.indexOf(reaction.emoji.name) + "A".charCodeAt(0));
		const user = reaction.message.guild.members.cache.find(member => member.id == reactedUser.id);

		if (reaction.message.id == "1000838700558729227") // 1. klasa
			await user.roles.remove(user.guild.roles.cache.find(role => role.name == `1${letter}`));
		else if (reaction.message.id == "1000838731336515674") // 2. klasa
			await user.roles.remove(user.guild.roles.cache.find(role => role.name == `2${letter}`));
		else if (reaction.message.id == "1000838763460702228") // 3. klasa
			await user.roles.remove(user.guild.roles.cache.find(role => role.name == `3${letter}`));
		else if (reaction.message.id == "1000838792762110042") // 4. klasa
			await user.roles.remove(user.guild.roles.cache.find(role => role.name == `4${letter}`));

	}
	catch (except) {
		console.error(reaction);
		console.error(except);
		const user = reaction.message.guild.members.cache.find(member => member.id == reactedUser.id);
		user.send("Był problem z usunięciem twojej roli na serwerze Staszicowym, spróbuj jeszcze raz (jeśli zdaży się to pare razy to napisz do któregoś admina).");
	}
}