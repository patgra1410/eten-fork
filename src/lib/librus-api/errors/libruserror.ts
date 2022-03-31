/**
 * Error type for throwing errors regarding Librus' bullshit
 * @class
 * @extends Error
 * @param msg Message
 */
export class LibrusError extends Error {
	status: number;
	json: unknown;
	constructor(msg?: string, status?: number, json?: unknown) {
		super(`${status} ${msg}`);
		this.status = status;
		this.json = json;
	}
}