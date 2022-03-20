import nodeFetch, { RequestInit } from "node-fetch";
import "colors";
import { LibrusError } from "./errors/libruserror";
import fetchCookie from "fetch-cookie";
import * as librusApiTypes from "./librus-api-types";
const fetch = fetchCookie(nodeFetch, new fetchCookie.toughCookie.CookieJar());

type RequestResponseType =
	| "text"
	| "json"
	| "raw"

/**
 * Class for easy interaction with the mobile Librus web API
 * @default
 * @class
 */
export default class LibrusClient {
	bearerToken: string;
	pushDevice: number;
	synergiaLogin: string;
	appUsername: string;
	appPassword: string;
	/**
	 * Create a new Librus API client
	 * TODO: Getters/setters? Or maybe a better option to initialize them?
	 * @constructor
	 */
	constructor() {
		this.bearerToken = "";
		this.pushDevice = 0;
		this.synergiaLogin = "";
		this.appUsername = "";
		this.appPassword = "";
	}

	/**
	 * Login to Librus using your mobile app credentials. Mandatory to run before using anything else.
	 * @async
	 * @param username Your Librus app username (This is NOT a Synergia login)
	 * @param password Your Librus app password
	 */
	async login(username: string, password: string): Promise<void> {
		if (username.length < 2 || password.length < 2)
			throw new Error("Invalid username or password");
		// Get csrf-token from <meta> tag for following requests
		const result = await (await fetch("https://portal.librus.pl/")).text();
		const csrfTokenRegexResult = /<meta name="csrf-token" content="(.*)">/g.exec(result);
		if (csrfTokenRegexResult == null)
			throw new LibrusError("No csrf-token meta tag in <head> of main site");
		const csrfToken = csrfTokenRegexResult[1];

		// Login
		// Response gives necessary cookies, saved automatically thanks to fetch-cookie
		await fetch("https://portal.librus.pl/rodzina/login/action", {
			method: "POST",
			body: JSON.stringify({
				email: username,
				password: password
			}),
			headers: {
				"Content-Type": "application/json",
				"X-CSRF-TOKEN": csrfToken,
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36"
			}
		});

		// Get the accessToken
		const accountsResult = await (await fetch("https://portal.librus.pl/api/v3/SynergiaAccounts", {
			method: "GET",
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36"
			}
		})).json() as librusApiTypes.APISynergiaAccounts;
		// TODO: Fix the existence checking here
		if (accountsResult.accounts[0]?.accessToken == null)
			throw new LibrusError("SynergiaAccounts endpoint returned no accessToken for account");
		this.bearerToken = accountsResult.accounts[0].accessToken;
		if (accountsResult.accounts[0]?.login == null)
			throw new LibrusError("SynergiaAccounts endpoint returned no login for account");
		this.synergiaLogin = accountsResult.accounts[0].login;
		console.log(" Librus Login OK ".bgGreen.white);
		return;
	}

	/**
	 * Uses existing cached cookies instead of credentials to try and get bearer token.
	 * Use only if you're using cookies through constructor or session is expired and you don't want to execute login() function.
	 * @async
	 */
	async refreshToken(): Promise<void> {
		// Get the newer accessToken
		const result = await (await fetch(`https://portal.librus.pl/api/v3/SynergiaAccounts/${this.synergiaLogin}/fresh`,
			{
				method: "GET",
				headers: {
					"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36"
				},
				redirect: "manual"
			}
		)).json() as librusApiTypes.APISynergiaAccountsFresh;
		if (result.accessToken == null)
			throw new LibrusError("GET SynergiaAccounts returned unexpected JSON format");
		this.bearerToken = result.accessToken;
		return;
	}

	/**
	 * Creates a request to Librus API using provided link, method, body and returns the JSON data sent back
	 * @async
	 * @param url API endpoit URL
	 * @param options Additional options - passed on to node-fetch call
	 * @param type What data should the request return: "json", "text", "raw"
	 */
	async librusRequest(url: string, options?: RequestInit, type: RequestResponseType = "raw"): Promise<string|Response|unknown> {
		// Merge default request options with user request options - this can be done much better...
		let requestOptions: RequestInit = {
			method: "GET",
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
				gzip: "true",
				Authorization: ((this.bearerToken !== "") ? `Bearer ${this.bearerToken}` : "")
			},
			redirect: "manual"
		};
		if (options) {
			if ("headers" in options)
				requestOptions.headers = { ...requestOptions.headers, ...options.headers };
			requestOptions = { ...requestOptions, ...options };
		}

		// Execute request
		console.debug(`${requestOptions.method} ${url}`.bgMagenta.white);
		let result = await fetch(url, requestOptions);
		let resultText = await result.text();

		// Check for correctness
		if (!result.ok) {
			if (resultText.length) {
				try {
					console.log(JSON.parse(resultText));
				}
				catch (error) {
					console.log(resultText);
				}
			}
			if (result.status === 401) {
				// Try to refresh token
				try {
					await this.refreshToken();
				}
				catch (error) {
					console.error("Couldn't refresh token, retrying full login".bgRed.white);
					await this.login(this.appUsername, this.appPassword);
				}
				console.debug("Retrying request after reauthentication");
				console.debug(`${requestOptions.method} ${url}`.bgMagenta.white);
				result = await fetch(url, requestOptions);
				if (!result.ok)
					throw new LibrusError(`${result.status} ${result.statusText} after reauth attempt`);
				resultText = await result.text();
			}
			else {
				// For unhandled error codes (Most likely maintenance or endpoints forbidden by school)
				throw new LibrusError(`${result.status} ${result.statusText}`);
			}
		}

		// Return
		if (type === "json")
			return JSON.parse(resultText);
		else if (type === "text")
			return await result.text();
		else
			return result;
	}

	/**
	 * Requests (and automatically saves internally for future use) a new pushDevice ID from librus
	 * @async
	 * @returns Optionally return the new pushDevice ID
	 */
	async newPushDevice(): Promise<number> {
		const jsonResult = await this.librusRequest("https://api.librus.pl/3.0/ChangeRegister", {
			method: "POST",
			body: JSON.stringify({
				sendPush: 0,
				appVersion: "5.9.0"
			})
		}, "json") as librusApiTypes.PostAPIChangeRegister;
		// this.pushDevice = jsonResult.ChangeRegister.Id;
		if (jsonResult.ChangeRegister?.Id == null)
			throw new LibrusError("POST ChangeRegister returned unexpected JSON format");
		this.pushDevice = jsonResult.ChangeRegister.Id;
		return this.pushDevice;
	}

	/**
	 * Get changes since last check given our pushDevice
	 *
	 * **NOTE:** To not get repeat changes you have to call the deletePushChanges() method after handling the changes yourself.
	 * @async
	 * @returns {JSON} Response if OK in member (of type array) "Changes" of returned object.
	 */
	async getPushChanges(): Promise<librusApiTypes.APIPushChanges> {
		const resultJson = await this.librusRequest(`https://api.librus.pl/3.0/PushChanges?pushDevice=${this.pushDevice}`, {}, "json") as librusApiTypes.APIPushChanges;
		if (!("Changes" in resultJson))
			throw new LibrusError("No \"Changes\" array in received PushChanges JSON");
		// const pushChanges: number[] = [];
		// if (resultJson.Changes.length > 0) {
		// 	for (const element of resultJson.Changes) {
		// 		if (!pushChanges.includes(element.Id))
		// 			pushChanges.push(element.Id);
		// 	}
		// }
		return resultJson;
	}

	/**
	 * Creates one or more DELETE request(s) for all IDs in given array
	 * @async
	 */
	async deletePushChanges(lastPushChanges: number[]): Promise<void> {
		if (!lastPushChanges.length)
			return;
		while (lastPushChanges.length) {
			const delChanges = lastPushChanges.splice(0, 30).join(",");
			await this.librusRequest(`https://api.librus.pl/3.0/PushChanges/${delChanges}?pushDevice=${this.pushDevice}`, {
				method: "DELETE"
			});
		}
		return;
	}
}