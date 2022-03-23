/**
 * Error type for throwing bullshit Librus errors
 * @class
 * @extends Error
 * @param msg Message
 */
export class LibrusError extends Error {
	constructor(msg?: string) {
		super(msg);
	}
}