import LibrusClient, { IBaseFetchOptions } from "..";

export default class BaseManager {
	client: LibrusClient;
	constructor(client: LibrusClient) {
		this.client = client;
	}
	defaultizeFetchOptions(options: IBaseFetchOptions): IBaseFetchOptions {
		const defaultFetchOptions = {
			force: false,
			cache: true
		};
		return { ...defaultFetchOptions, ...options };
	}
}