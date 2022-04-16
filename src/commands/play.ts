import { SlashCommandBuilder, SlashCommandIntegerOption, SlashCommandStringOption, SlashCommandSubcommandBuilder } from "@discordjs/builders";
import Discord, { CommandInteraction, ColorResolvable } from "discord.js";
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from "@discordjs/voice";
import { exec, execSync } from "child_process";
import fs from "fs";
const player = createAudioPlayer();

interface IEffects {
	[name: string]: {
		name: string,
		type: "args"|"command",
		args?: string
		command?: string
	}
}

function sleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

const effects: IEffects = JSON.parse(fs.readFileSync("./data/effects.json", "utf8"));

export const data = new SlashCommandBuilder()
	.setName("play")
	.setDescription("Puść dźwięk na VC");
try {
	execSync("sox --version", { stdio: "ignore" });

	const effectsOption = new SlashCommandStringOption()
		.setName("efekt")
		.setDescription("dodaj efekt na dźwięk")
		.setRequired(false);

	for (const [effect, name] of Object.entries(effects))
		effectsOption.addChoice(name.name, effect);

	data
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
				.addStringOption(effectsOption)
				.addStringOption(
					new SlashCommandStringOption()
						.setName("multiple")
						.setDescription("Nałóż kilka efektów (napisz ? aby dać liste nazw)")
						.setRequired(false)
				)
				// niestety to daje dostep do shella wiec nie mozna tego uzyc :((
				// .addStringOption(
				// 	new SlashCommandStringOption()
				// 		.setName("advanced")
				// 		.setDescription("Zaawansowane ustawienia (argumenty przekazywane bezpośrednio SoX")
				// 		.setRequired(false)
				// )
		);
}
catch {
	data
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
		);
}

data
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
		const repeat = interaction.options.getInteger("repeat") ? interaction.options.getInteger("repeat") : 1;
		const efekt = interaction.options.getString("efekt");
		let num;

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
		let path = `./soundeffects/${fileName}`;

		if (!user.voice.channel) {
			interaction.reply("Nie jesteś na VC na tym serwerze");
			return;
		}

		let additionalText = "";
		additionalText += repeat > 1 ? ` ${repeat} razy` : "";

		if (interaction.options.getString("multiple") != undefined) {
			if (interaction.options.getString("multiple") == "?") {
				let res = "Użycie: w polu multiple podaj po spacji nazwy efektów, które chesz dodać. Nazwy efektów:\n";
				for (const name of Object.keys(effects))
					res += name + ", ";
				res = res.slice(0, -2);
				interaction.reply(res);
				return;
			}

			let names = "";
			const effs = interaction.options.getString("multiple").split(" ");
			await interaction.reply("Przygotowywanie dźwięku...");

			for (const effect of effs) {
				if (!(effect in effects)) {
					interaction.reply(`Efekt ${effect} nie istnieje`);
				}
				names += effects[effect].name + " ";

				try {
					if (effects[effect].type == "args")
						execSync(`sox -t mp3 -V "${path}" tmp/out.mp3 ${effects[effect].args}`, { stdio: "ignore" });
					else if (effects[effect].type == "command")
						execSync(`${effects[effect].command} "${path}"`, { stdio: "ignore" });
					fs.renameSync("./tmp/out.mp3", "./tmp/tmp.mp3");

					path = "tmp/tmp.mp3";
				}
				catch (error) {
					await interaction.editReply("Wystąpił błąd przy tworzeniu dźwięku.\n```\n" + error.toString() + "```");
					console.error(error);
					return;
				}
			}
			names = names.slice(0, -1);

			let msg = `Puszczanie dźwięku ${fileName}${additionalText} z efektami ${names}.`;
			if (msg.length >= 2000)
				msg = msg.slice(0, 1900) + "...";
			await interaction.editReply(msg);
		}
		else if (efekt != undefined) {
			await interaction.reply("Przygotowywanie dźwięku...");

			try {
				if (effects[efekt].type == "args")
					execSync(`sox -t mp3 -V "${path}" tmp/tmp.mp3 ${effects[efekt].args}`, { stdio: "ignore" });
				else if (effects[efekt].type == "command")
					execSync(`${effects[efekt].command} "${path}"`, { stdio: "ignore" });
			}
			catch (error) {
				await interaction.editReply("Wystąpił błąd przy tworzeniu dźwięku.\n```\n" + error.toString() + "```");
				console.error(error);
				return;
			}

			path = "tmp/out.mp3";
			interaction.editReply(`Puszczanie dźwięku ${fileName}${additionalText} z efektem ${effects[efekt].name}.`);
		}
		else
			interaction.reply(`Puszczanie dźwięku ${fileName}${additionalText}.`);

		const channel = user.voice.channel;
		const connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator
		});
		connection.subscribe(player);

		for (let i = 1; i <= repeat; i++) {
			const resource = createAudioResource(path);
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