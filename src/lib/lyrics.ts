import config from "../config.json";
import fetch from "node-fetch";
import cheerio from "cheerio";
import { ILyricsSong } from "./types";

export enum lyricsErrorEnum {
	NoApiKey,
	WrongStatus
}

export class LyricsError extends Error {
	type: number;

	constructor(message?: string, type?: number) {
		super(message);
		this.name = "LyrcisError";
		this.type = type;
	}
}

function getApiKey(): string | undefined {
	if (config.geniusAPIKey)
		return config.geniusAPIKey;
	return undefined;
}

export async function searchSong(search: string): Promise<Array<ILyricsSong>> {
	const apiKey = getApiKey();
	if (!apiKey)
		throw new LyricsError("API Key doesnt exist", lyricsErrorEnum.NoApiKey);

	const response = await fetch(`https://api.genius.com/search?q=${search}`, {
		headers: {
			Authorization: `Bearer ${apiKey}`
		}
	});

	if (response.status != 200)
		throw new LyricsError(`Response status not 200 (${response.url})`, lyricsErrorEnum.WrongStatus);

	const result = await response.json();
	const ret: Array<ILyricsSong> = [];

	for (const song of result.response.hits) {
		ret.push(song.result);
	}

	return ret;
}

export async function getLyrics(song: ILyricsSong): Promise<string> {
	const apiKey = getApiKey();
	if (!apiKey)
		throw new LyricsError("API Key doesnt exist", lyricsErrorEnum.NoApiKey);

	const response = await fetch(`https://genius.com${song.path}`);

	if (response.status != 200)
		throw new LyricsError(`Response status not 200 (${response.url})`, lyricsErrorEnum.WrongStatus);

	const text = (await response.text()).replace(/<br \/>|<br\/>|<br>/g, "\n");
	const page = cheerio.load(text);

	let lyrics = page(".lyrics").text();
	if (!lyrics) // using new version of genius
		lyrics = page(".Lyrics__Container-sc-1ynbvzw-6").text();

	if (!lyrics) {
		console.error("Lyrics are still empty");
		console.error(song);
	}

	return lyrics;
}