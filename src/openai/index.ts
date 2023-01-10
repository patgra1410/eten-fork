import config from "../config.json";
import { Configuration, OpenAIApi } from "openai";

export let openai: OpenAIApi;

export async function init() {
	const configuration = new Configuration({
		organization: config.openAI.organizationId,
		apiKey: config.openAI.apiToken
	});
	openai = new OpenAIApi(configuration);
}

export async function askQuestion(prompt: string) {
	const response = await openai.createCompletion({
		model: "text-davinci-003",
		prompt: prompt,
	});
	console.log(response.data.choices[0]);
	return response.data.choices[0].text;
}