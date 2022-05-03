import { SlashCommandBuilder, SlashCommandIntegerOption } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import fs from "fs";
import { player } from "../../index";
import { IMusicInfo } from "../../lib/types";

export const data = new SlashCommandBuilder()
	.setName("volume")
	.setDescription("Zmień głośność")
	.addIntegerOption(
		new SlashCommandIntegerOption()
			.setName("volume")
			.setDescription("Głośność")
			.setMinValue(0)
			.setMaxValue(100)
			.setRequired(true)
	);

export async function execute(interaction: CommandInteraction) {
	await interaction.deferReply();

	const guild = interaction.client.guilds.cache.get(interaction.guild.id);
	const user = guild.members.cache.get(interaction.user.id);

	if (!user.voice.channel) {
		interaction.editReply("Nie jesteś na VC");
		return;
	}

	const queue = player.getQueue(interaction.guild.id);
	if (!queue || !queue.playing) {
		interaction.editReply("Nie puszczam żadnej muzyki");
		return;
	}

	const volume = interaction.options.getInteger("volume");
	const musicInfo: IMusicInfo = JSON.parse(fs.readFileSync("./data/music.json", "utf-8"));
	musicInfo[interaction.guildId].volume = volume;
	fs.writeFileSync("./data/music.json", JSON.stringify(musicInfo));

	if (queue.setVolume(volume))
		interaction.editReply(`Zmieniono głośność na ${volume}`);
	else
		interaction.editReply("Nie udało się zmienić głośności");
}