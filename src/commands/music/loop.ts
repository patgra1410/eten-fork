import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { CommandInteraction } from "discord.js";
import { player } from "../../index";
import { QueueRepeatMode } from "discord-player";

export const data = new SlashCommandBuilder()
	.setName("loop")
	.setDescription("Zapętlij")
	.addStringOption(
		new SlashCommandStringOption()
			.setName("type")
			.setDescription("Typ pętli")
			.addChoice("wyłącz", QueueRepeatMode.OFF.toString())
			.addChoice("tylko ten utwór", QueueRepeatMode.TRACK.toString())
			.addChoice("cała kolejka", QueueRepeatMode.QUEUE.toString())
			.setRequired(false)
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

	if (!queue.tracks[0]) {
		interaction.editReply("Nie ma żadnych filmów po aktualnym");
		return;
	}

	const type = parseInt(interaction.options.getString("type"));

	if (type) {
		const success = queue.setRepeatMode(type);

		if (!success) {
			interaction.editReply("Wystąpił bład:(");
			return;
		}

		let msg;
		if (type == QueueRepeatMode.OFF)
			msg = "Wyłączono pętlę";
		else if (type == QueueRepeatMode.TRACK)
			msg = "Włączono pętle dla tego filmu";
		else if (type == QueueRepeatMode.QUEUE)
			msg = "Włączno pętle dla całej kolejki";

		interaction.editReply(msg);
	}
	else {
		let msg;
		if (queue.repeatMode == QueueRepeatMode.OFF)
			msg = "Pętla jest wyłączona";
		else if (queue.repeatMode == QueueRepeatMode.TRACK)
			msg = "Pętla jest włączona dla tego utworu";
		else if (queue.repeatMode == QueueRepeatMode.QUEUE)
			msg = "Pętla jest włączona dla całej kolejki";

		interaction.editReply(msg);
	}
}