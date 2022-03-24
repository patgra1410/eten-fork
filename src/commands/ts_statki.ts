import { CommandInteraction, Message, MessageButton, MessageActionRow } from "discord.js";
import { SlashCommandBuilder, SlashCommandUserOption, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import { statkiManager } from "../lib/statkiManager";

export const data = new SlashCommandBuilder()
	.setName("statki")
	.setDescription("Komenda do statków")
	.addSubcommand(
		new SlashCommandSubcommandBuilder()
			.setName("wyzwij")
			.setDescription("Wyzwij gracza na nową gre")
			.addUserOption(
				new SlashCommandUserOption()
					.setName("gracz")
					.setDescription("Gracz do wyzwania")
					.setRequired(true)
			)
	);

export async function execute(interaction: CommandInteraction) {
	if (interaction.options.getSubcommand() === "wyzwij") {
		const challenger = interaction.user;
		const challenged = interaction.options.getUser("gracz");
		if (challenged.bot) {
			await interaction.reply({ content: "Nie możesz wyzwać bota!", ephemeral: true });
			return;
		}
		if (statkiManager.userGamesMap.has(challenger.id)) {
			await interaction.reply({ content: "Już jesteś w grze!", ephemeral: true });
			return;
		}
		if (statkiManager.userGamesMap.has(challenged.id)) {
			await interaction.reply({ content: "Twój przeciwnik jest już w grze!", ephemeral: true });
			return;
		}
		if (statkiManager.pendingChallengesMap.has(challenger.id)) {
			const lastChallenge = statkiManager.pendingChallengesMap.get(challenger.id);
			if (lastChallenge.userId === challenged.id) {
				if (lastChallenge.time > new Date(Date.now()).getTime() - 1000 * 60 * 60 * 2) {
					await interaction.reply({ content: "Już wyzwałeś tego gracza!", ephemeral: true });
					return;
				}
				else {
					await lastChallenge.message.delete();
				}
			}
		}
		const row = new MessageActionRow()
			.addComponents(
				new MessageButton()
					.setCustomId(`statki_accept#${challenger.id}`)
					.setLabel("Przyjmij")
					.setStyle("SUCCESS"),
				new MessageButton()
					.setCustomId(`statki_decline#${challenger.id}`)
					.setLabel("Odrzuć")
					.setStyle("DANGER")
			);
		const msg = await interaction.reply(
			{
				content: `<@${challenged.id}>, ${challenger.username} wyzwał cię na pojedynek mistrzów xiaolin`,
				components: [row],
				fetchReply: true
			}
		);
		statkiManager.pendingChallengesMap.set(challenger.id, { userId: challenged.id, time: new Date(Date.now()).getTime(), message: (msg as Message) });
	}
}