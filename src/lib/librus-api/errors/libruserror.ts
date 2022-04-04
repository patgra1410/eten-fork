/**
 * Error type for throwing errors regarding Librus' bullshit
 * @class
 * @extends Error
 * @param msg Message
 */
export class LibrusError extends Error {
	status: number;
	body: unknown;
	constructor(msg?: string, status?: number, body?: unknown) {
		super(`${status} ${msg}`);
		this.status = status;
		this.body = body;
	}
}