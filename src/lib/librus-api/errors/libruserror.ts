import { APIv3BaseResponse } from "../librus-api-types";

/**
 * Error type for throwing bullshit Librus errors
 * @class
 * @extends Error
 * @param msg Message
 * @param json Optional Librus API json response
 */
export class LibrusError extends Error {
	json: APIv3BaseResponse | undefined;
	constructor(msg?: string) {
		super(msg);
	}
}