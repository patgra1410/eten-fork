import { Collection, GuildMember } from "discord.js";
import config from "../config.json";
import fs from "fs";
import { joinVoiceChannel, createAudioPlayer, createAudioResource } from "@discordjs/voice";
import { client } from "../index";
const player = createAudioPlayer();

function sleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(resolve, ms);
	});
}

async function randomSoundOnVoice() {
	const channels = client.guilds.cache.get(config.guild)?.channels.cache.filter(c => c.type == "GUILD_VOICE");

	let isThereAnyone = false;
	for (const channel of channels.values()) {
		if ((channel.members as Collection<string, GuildMember>).size == 0 || Math.random() >= config.randomSoundeffectChance)
			continue;
		isThereAnyone = true;

		const connection = joinVoiceChannel({
			channelId: channel.id,
			guildId: channel.guild.id,
			adapterCreator: channel.guild.voiceAdapterCreator
		});

		const files = fs.readdirSync("./soundeffects");

		const resource = createAudioResource("./soundeffects/" + files[Math.floor(Math.random() * files.length)]);
		connection.subscribe(player);
		player.play(resource);
		while (player.state.status != "idle")
			await sleep(100);
		connection.disconnect();
	}

	setTimeout(randomSoundOnVoice, (isThereAnyone ? 1000 * 60 : 1000 * 60 * 15));
}

export default async function() {
	if (config.playRandomSoundeffects)
		setTimeout(randomSoundOnVoice, 1000 * 60);
}
