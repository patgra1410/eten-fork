import nodeFetch, { RequestInit } from 'node-fetch';
import 'colors';
import { LibrusError } from './errors/libruserror';
import fetchCookie from 'fetch-cookie';
import { APIPushChanges } from './librus-api-types';
const fetch = fetchCookie(nodeFetch, new fetchCookie.toughCookie.CookieJar());

type RequestResponseType =
	'text' |
	'json' |
	'raw'

/**
 * Class for easy interaction with the mobile Librus web API
 * @default
 * @class
 */
export default class LibrusClient {
	bearerToken: string;
	pushDevice: number;
	lastPushChanges: number[];
	/**
	 * Create a new Librus API client
	 * TODO: Getters/setters? Or maybe a better option to initialize them?
	 * @constructor
	 */
	constructor() {
		this.bearerToken = '';
		this.pushDevice = 0;
		// this.cookieJar = new LibrusCookies();
		this.lastPushChanges = [];
	}

	/**
	 * Login to Librus using your mobile app credentials. Mandatory to run before using anything else.
	 * @async
	 * @param username Your Librus app username (This is NOT a Synergia login)
	 * @param password Your Librus app password
	 */
	async login(username: string, password: string): Promise<void> {
		// Get csrf-token from <meta> tag for following requests
		const result = await this.librusRequest('https://portal.librus.pl/', {}, 'text');
		const csrfToken = /<meta name="csrf-token" content="(.*)">/g.exec(result)[1];

		// Login
		// Response gives necessary cookies, saved automatically by LibrusClient.rawRequest
		await this.librusRequest('https://portal.librus.pl/rodzina/login/action', {
			method: 'POST',
			body: JSON.stringify({
				email: username,
				password: password
			}),
			headers: {
				'Content-Type': 'application/json',
				'X-CSRF-TOKEN': csrfToken
			}
		});

		// Get the accessToken
		const result2 = await this.librusRequest('https://portal.librus.pl/api/v3/SynergiaAccounts', {}, 'json');
		this.bearerToken = result2.accounts[0].accessToken;
		console.log('Login OK'.bgGreen);
		return
	}

	/**
	 * Uses existing cached cookies instead of credentials to try and get bearer token.
	 * Use only if you're using cookies through constructor or session is expired and you don't want to execute login() function.
	 * @async
	 */
	async initWithCookie(): Promise<void> {
		// Get the newer accessToken
		const result = await this.librusRequest('https://portal.librus.pl/api/v3/SynergiaAccounts', {}, 'json');
		// accouts[0]? Allow for more in the future
		this.bearerToken = result.accounts[0].accessToken;
		return;
	}

	/**
	 * Creates a request to Librus API using provided link, method, body and returns the JSON data sent back
	 * @async
	 * @param url API endpoit URL
	 * @param options Additional options - passed on to node-fetch call
	 * @param type What data should the request return: "json", "text", "raw"
	 */
	async librusRequest(url: string, options?: RequestInit, type: RequestResponseType = 'text') {
		// Merge default request options with user request options - this can be done much better...
		const defaultOptions: RequestInit = {
			method: 'GET',
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36',
				gzip: 'true',
				Authorization: ((this.bearerToken !== '') ? `Bearer ${this.bearerToken}` : ''),
				redirect: 'manual'
			}
		};
		if (options) {
			if ('headers' in options)
				options.headers = { ...defaultOptions.headers, ...options.headers };
			options = { ...defaultOptions, ...options };
		}

		console.debug(`${options.method} ${url}`.bgMagenta.white);
		const result = await fetch(url, options);
		if (!result.ok)
			throw new LibrusError(`${result.status} ${result.statusText}`);

		if (type === 'json')
			return await result.json();

		else if (type === 'raw')
			return result;

		return await result.text();
	}

	/**
	 * Requests (and automatically saves internally for future use) a new pushDevice ID from librus
	 * @async
	 * @returns Optionally return the new pushDevice ID
	 */
	async newPushDevice(): Promise<number> {
		const jsonResult = await this.librusRequest('https://api.librus.pl/3.0/ChangeRegister', {
			method: 'POST',
			body: JSON.stringify({
				sendPush: 0,
				appVersion: '5.9.0'
			})
		}, 'json');
		this.pushDevice = jsonResult.ChangeRegister.Id;
		return this.pushDevice;
	}

	/**
	 * Get changes since last check given our pushDevice
	 * @async
	 * @returns {JSON} Response if OK in member (of type array) "Changes" of returned object.
	 */
	async getPushChanges(): Promise<APIPushChanges> {
		const resultJson: APIPushChanges = await this.librusRequest(`https://api.librus.pl/3.0/PushChanges?pushDevice=${this.pushDevice}`, {}, 'json');
		if ('Changes' in resultJson) {
			if (resultJson.Changes.length > 0) {
				for (const element of resultJson.Changes) {
					if (!this.lastPushChanges.includes(element.Id))
						this.lastPushChanges.push(element.Id);
				}
			}
		}
		else {
			throw new LibrusError('No "Changes" array in received PushChanges JSON');
		}
		return resultJson;
	}

	/**
	 * Creates a DELETE request for all elements from the last getPushChanges
	 * UNTESTED
	 * @async
	 */
	async deletePushChanges(): Promise<void> {
		if (!this.lastPushChanges.length) {
			console.warn('this.lastPushChanges is empty!');
			return;
		}
		while (this.lastPushChanges.length) {
			const delChanges = this.lastPushChanges.splice(0, 30).join(',')
			await this.librusRequest(`https://api.librus.pl/3.0/PushChanges/${delChanges}?pushDevice=${this.pushDevice}`, {
				method: 'DELETE'
			});
		}
		return;
	}
}