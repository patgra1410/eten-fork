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
					.setMinValue(1)
					.setRequired(true)
			)
			.addIntegerOption(
				new SlashCommandIntegerOption()
					.setName("repeat")
					.setDescription("Ile razy puścić dźwięk (defaultowo 1)")
					.setMinValue(1)
					.setRequired(false)
			)
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName("random")	
			.setDescription("Puść losowy dźwięk")
	)
	.addSubcommand(subcommand =>
		subcommand
			.setName("stop")	
			.setDescription("Zatrzymaj puszczanie dźwięku")
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
	else if (interaction.options.getSubcommand() == "sound" || interaction.options.getSubcommand() == "random") {
		const files = fs.readdirSync("./soundeffects");
		let num, repeat = interaction.options.getInteger("repeat") ? interaction.options.getInteger("repeat") : 1;

		if (interaction.options.getSubcommand() == "sound")
			num = interaction.options.getInteger("numer");
		else
			num = Math.floor(Math.random() * files.length) + 1;

			
		if (num < 1 || num > files.length) {
			interaction.reply("Niepoprawny numer");
			return;
		}

		const fileName = files[num - 1];
		const guild = interaction.client.guilds.cache.get(interaction.guildId);
		const user = guild.members.cache.get(interaction.user.id);

		if (!user.voice.channel) {
			interaction.reply("Nie jesteś na VC na tym serwerze");
			return;
		}

		const additionalText = repeat > 1 ? ` ${repeat} razy.` : "";
		interaction.reply(`Puszczanie dźwięku ${fileName}${additionalText}`);

		const channel = user.voice.channel;
		const connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator
		});
		connection.subscribe(player);

		for (let i = 1; i <= repeat; i++) {
			const resource = createAudioResource(`./soundeffects/${fileName}`);
			player.play(resource);
			while (player.state.status != "idle")
				await sleep(100);
		}
		connection.disconnect();
	}
	else if (interaction.options.getSubcommand() == "stop") {
		const guild = interaction.client.guilds.cache.get(interaction.guildId);
		const user = guild.members.cache.get(interaction.user.id);

		if (!user.voice.channel) {
			interaction.reply("Nie jesteś na VC na tym serwerze");
			return;
		}

		if (!guild.me.voice.channel) {
			interaction.reply("Bot nie jest na VC");
			return;
		}

		player.stop();
		guild.me.voice.disconnect();

		interaction.reply("Rozłączono");
	}
}