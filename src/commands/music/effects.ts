import { SlashCommandBuilder, SlashCommandStringOption } from "@discordjs/builders";
import { AutocompleteInteraction, CommandInteraction, CacheType, Interaction, ApplicationCommandOptionChoiceData } from "discord.js";
import { player } from "../../index";

export const data = new SlashCommandBuilder()
	.setName("effects")
	.setDescription("Dodaj/usuń efekt")
	.addStringOption(
		new SlashCommandStringOption()
			.setName("efekt")
			.setDescription("Nazwa efektu. Jeżeli brak to zostanie wysłana lista włączonych i wyłączonych efektów")
			.setRequired(false)
			.setAutocomplete(true)
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

	const filter = interaction.options.getString("efekt");
	const enabled: string[] = [];
	const disabled: string[] = [];

	queue.getFiltersEnabled().map(x => enabled.push(x));
	queue.getFiltersDisabled().map(x => disabled.push(x));

	if (!filter) {
		let msg = "Włączone efekty: ";
		for (const eff of enabled)
			msg += `${eff}, `;

		if (enabled.length == 0)
			msg += "brak";
		else
			msg = msg.slice(0, -2);

		msg += "\nWyłączone efekty: ";
		for (const eff of disabled)
			msg += `${eff}, `;

		if (disabled.length == 0)
			msg += "brak";
		else
			msg = msg.slice(0, -2);

		interaction.editReply(msg);
	}
	else {
		if (!enabled.includes(filter) && !disabled.includes(filter)) {
			interaction.editReply("Nie istnieje taki filter");
			return;
		}

		const newFilters: {
			[filter: string]: boolean
		} = {};

		for (const eff of enabled)
			newFilters[eff] = true;
		newFilters[filter] = !enabled.includes(filter);

		await queue.setFilters(newFilters);

		interaction.editReply(`${enabled.includes(filter) ? "Wyłączono" : "Włączono"} efekt ${filter}`);
	}
}

export async function autocomplete(interaction: AutocompleteInteraction) {
	const effects = [ "bassboost_low", "bassboost", "bassboost_high", "8D", "vaporwave", "nightcore", "phaser", "tremolo", "vibrato", "reverse", "treble", "normalizer", "normalizer2", "surrounding", "pulsator", "subboost", "karaoke", "flanger", "gate", "haas", "mcompand", "mono", "mstlr", "mstrr", "compressor", "expander", "softlimiter", "chorus", "chorus2d", "chorus3d", "fadein", "dim", "earrape"];
	const name: { [effect: string]: string } = {
		"bassboost_low": "mały bassbost",
		"bassboost": "bassboost",
		"bassboost_high": "duży bassbost",
		"8D": "8D",
		"vaporwave": "vaporwave",
		"nightcore": "nightcore",
		"phaser": "miecz świetlny",
		"tremolo": "trelomo",
		"vibrato": "wibrator",
		"reverse": "reverse",
		"treble": "treble",
		"normalizer": "normalizer",
		"normalizer2": "normalizer 2",
		"surrounding": "surrounding",
		"pulsator": "pulsator",
		"subboost": "subboost",
		"karaoke": "karaoke",
		"flanger": "flanger",
		"gate": "brama (takie anime)",
		"haas": "mieeć",
		"mcompand": "minecraft:command_block",
		"mono": "jeden",
		"mstlr": "mstlr",
		"mstrr": "mstrr",
		"compressor": "komrepsor",
		"expander": "rozszerzacz",
		"softlimiter": "miętki ograniczacz",
		"chorus": "chór",
		"chorus2d": "chór 2D",
		"chorus3d": "chór 3D",
		"fadein": "fade in",
		"dim": "dim",
		"earrape": "gwałcenie uszu (ferdydurke)"
	};

	let i = 0;
	const suggestions: Array<ApplicationCommandOptionChoiceData> = [];
	for (const effect of effects) {
		if (effect.startsWith(interaction.options.getString("efekt"))) {
			suggestions.push({
				name: name[effect],
				value: effect
			});
			i++;
			if (i == 25)
				break;
		}
	}

	interaction.respond(suggestions);
}