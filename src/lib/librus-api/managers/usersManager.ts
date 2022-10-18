import LibrusClient, { IBaseFetchOptions } from "..";
import { LibrusError } from "../errors/libruserror";
import { APIUser, APIUsers, IUser } from "../librus-api-types";
import BaseManager from "./baseManager";

export default class UsersManager extends BaseManager {
	cache: Map<number, IUser>;
	constructor(client: LibrusClient) {
		super(client);
		this.cache = new Map<number, IUser>();
	}
	async fetch(id: number, options?: IBaseFetchOptions): Promise<IUser> {
		options = this.defaultizeFetchOptions(options);
		// Use cache if element is cached and a HTTP request is not forced
		if (!options.force && this.cache.has(id))
			return this.cache.get(id);

		const userResponse = await this.client.customLibrusRequest(`https://api.librus.pl/3.0/Users/${id}`) as Response;
		// Check if request is OK
		if (!userResponse.ok) {
			let errorJson;
			try {
				errorJson = await userResponse.json();
			}
			catch (error) {
				this.client.log(error);
			}
			if (userResponse.status === 404) {
				throw new LibrusError("User not found", userResponse.status, errorJson);
			}
			else if (userResponse.status === 403) {
				throw new LibrusError("User is forbidden from being viewed", userResponse.status, errorJson);
			}
			else {
				throw new LibrusError("Unknown error - Could not get user", userResponse.status, errorJson);
			}
		}
		// Return and cache if set
		console.log(id);
		const user = (await userResponse.json() as APIUser).User;
		console.log(user);
		if (user.Id !== id)
			throw new LibrusError("Returned user ID mismatches the one passed - How even", userResponse.status, user);
		if (options.cache)
			this.cache.set(id, user);
		return user;
	}
	async fetchMany(ids: number[], options?: IBaseFetchOptions): Promise<IUser[]> {
		options = this.defaultizeFetchOptions(options);
		const idCheckArr: number[] = [];
		const returnArr: IUser[] = [];
		// Get the ones we already cached (Or not, if force is set to true)
		if (!options.force) {
			for (const id of ids) {
				if (this.cache.has(id)) {
					returnArr.push(this.cache.get(id));
				}
				else {
					idCheckArr.push(id);
				}
			}
		}
		else {
			for (const id of ids)
				idCheckArr.push(id);
		}
		// Request the ones we don't have cached
		while (idCheckArr.length > 0) {
			const joinedIds = idCheckArr.splice(0, 29).join(",");
			const usersResponse = await this.client.customLibrusRequest(`https://api.librus.pl/3.0/Users/${joinedIds},`) as Response;
			if (!usersResponse.ok) {
				let errorJson;
				try {
					errorJson = await usersResponse.json();
				}
				catch (error) {
					this.client.log(error);
				}
				throw new LibrusError("Unknown error - Could not get multiple users at once", usersResponse.status, errorJson);
			}
			const usersJson = await usersResponse.json() as APIUsers;
			for (const user of usersJson.Users) {
				returnArr.push(user);
				if (options.cache)
					this.cache.set(user.Id, user);
			}
		}
		return returnArr;
	}
}