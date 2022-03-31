import LibrusClient, { IBaseFetchOptions } from "..";
import { LibrusError } from "../errors/libruserror";
import { APISchoolNotice, ISchoolNotice } from "../librus-api-types";
import BaseManager from "./baseManager";

export default class SchoolNoticesManager extends BaseManager {
	cache: Map<string, ISchoolNotice>;
	constructor(client: LibrusClient) {
		super(client);
		this.cache = new Map<string, ISchoolNotice>();
	}
	async fetch(id: string, options?: IBaseFetchOptions): Promise<ISchoolNotice> {
		options = this.defaultizeFetchOptions(options);
		// Use cache if element is cached and a HTTP request is not forced
		if (!options.force && this.cache.has(id))
			return this.cache.get(id);

		const noticeResponse = await this.client.customLibrusRequest(`https://api.librus.pl/3.0/SchoolNotices/${id}`) as Response;
		// Check if request is OK
		if (!noticeResponse.ok) {
			let errorJson;
			try {
				errorJson = await noticeResponse.json();
			}
			catch (error) {
				this.client.log(error);
			}
			if (noticeResponse.status === 404) {
				throw new LibrusError("SchoolNotice not found", noticeResponse.status, errorJson);
			}
			if (noticeResponse.status === 403) {
				throw new LibrusError("SchoolNotice is forbidden from being viewed", noticeResponse.status, errorJson);
			}
			else {
				throw new LibrusError("Unknown error - Could not get SchoolNotice", noticeResponse.status, errorJson);
			}
		}
		// Return and cache if set
		const noticeJson = (await noticeResponse.json() as APISchoolNotice).SchoolNotice;
		if (options.cache)
			this.cache.set(id, noticeJson);
		return noticeJson;
	}
}