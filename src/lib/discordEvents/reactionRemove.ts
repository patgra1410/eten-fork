import { MessageReaction, PartialMessageReaction, PartialUser, User } from "discord.js";

export default async function(reaction: MessageReaction|PartialMessageReaction, reactedUser: User|PartialUser) {
	try {
		const letters = ["🇦", "🇧", "🇨", "🇩", "🇪", "🇫", "🇬", "🇭", "🇮"];
		const letter = String.fromCharCode(letters.indexOf(reaction.emoji.name) + "a".charCodeAt(0));
		const user = reaction.message.guild.members.cache.find(member => member.id == reactedUser.id);

		if (reaction.message.id == "932695585465704448") // 1. klasa
			await user.roles.remove(user.guild.roles.cache.find(role => role.name == `1${letter}`));
		else if (reaction.message.id == "932695586426196060") // 2. klasa
			await user.roles.remove(user.guild.roles.cache.find(role => role.name == `2${letter}`));
		else if (reaction.message.id == "932695588540141598") // 3. klasa podstawowka
			await user.roles.remove(user.guild.roles.cache.find(role => role.name == `3${letter}4`));
		else if (reaction.message.id == "932695587424444466") // 3. klasa gimnazjum
			await user.roles.remove(user.guild.roles.cache.find(role => role.name == `3${letter.toUpperCase()}3`));

	}
	catch (except) {
		console.log(reaction);
		console.log(except);
		const user = reaction.message.guild.members.cache.find(member => member.id == reactedUser.id);
		user.send("Był problem z usunięciem twojej roli, spróbuj jeszcze raz.");
	}
}