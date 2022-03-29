import { SlashCommandBuilder, SlashCommandIntegerOption } from "@discordjs/builders";
import Discord, { CommandInteraction, ColorResolvable } from "discord.js";
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from "@discordjs/voice";
import fs from "fs";
const player = createAudioPlayer();

function sleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

export const data = new SlashCommandBuilder()
	.setName("play")
	.setDescription("Puść dźwięk na VC")
	.addSubcommand(subcommand =>
		subcommand
			.setName("sound")
			.setDescription("Puść dźwięk na VC")
			.addIntegerOption(
				new SlashCommandIntegerOption()
					.setName("numer")
					.setDescription("Numer dźwięku (/play list)")
					.setRequired(true)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName("list")
			.setDescription("Lista dźwięków")
	);

export async function execute(interaction: CommandInteraction) {
	if (interaction.options.getSubcommand() == "list") {
		let desc = "";
		let i = 1;

		fs.readdirSync("./soundeffects").forEach(file => {
			desc += `${i}. ${file}\n`;
			i++;
		});

		const embed = new Discord.MessageEmbed()
			.setColor(("#" + Math.floor(Math.random() * 16777215).toString(16)) as ColorResolvable)
			.setTitle("Lista dźwięków")
			.setDescription(desc);

		interaction.reply({ embeds: [embed] });
	}
	else if (interaction.options.getSubcommand() == "play") {
		const num = interaction.options.getInteger("numer");
		const files = fs.readdirSync("./soundeffects");

		if (num < 1 || num > files.length) {
			interaction.reply("Nie poprawny numer");
			return;
		}
		const fileName = files[num - 1];

		const guild = interaction.client.guilds.cache.get(interaction.guildId);
		const user = guild.members.cache.get(interaction.user.id);

		if (!user.voice.channel) {
			interaction.reply("Nie jesteś na VC na tym serwerze");
			return;
		}

		interaction.reply(`Puszczanie dźwięku ${fileName}`);

		const channel = user.voice.channel;
		const connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator
		});
		const resource = createAudioResource(`./soundeffects/${fileName}`);
		connection.subscribe(player);
		player.play(resource);
		while (player.state.status != "idle")
			await sleep(100);
		connection.disconnect();
	}
}