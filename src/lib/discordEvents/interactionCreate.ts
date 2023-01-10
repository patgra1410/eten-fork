import { CacheType, Interaction } from "discord.js";

export default async function(interaction: Interaction<CacheType>) {
	const client = interaction.client;

	if (interaction.isButton()) {
		try {
			await client.commands.get(interaction.customId.split("#")[0]).execute(interaction);
		}
		catch (error) {
			console.error(error);
		}
		return;
	}
	else if (interaction.isAutocomplete()) {
		try {
			await client.commands.get(interaction.commandName).autocomplete(interaction);
		}
		catch (error) {
			console.error(error);
		}
	}

	if (!interaction.isCommand() && !interaction.isContextMenu()) return;

	if (!client.commands.has(interaction.commandName)) return;

	try {
		try {
			await client.commands.get(interaction.commandName).execute(interaction);
		}
		catch (error) {
			console.error(error);
		}
	}
	catch (error) {
		console.error(error);
		try {
			await interaction.reply({ content: "There was an error while executing this command!", ephemeral: true });
		}
		catch (error2) {
			console.error("Error: Couldn't reply, probably already replied, trying to edit");
			console.error(error2);
			await interaction.editReply({ content: "There was an error while executing this command!" });
		}
	}
}