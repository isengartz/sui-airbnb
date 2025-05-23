import { CustomError } from "./customError";

export class BadRequestError extends CustomError {
	readonly statusCode = 400;

	constructor(public message: string) {
		super(message);
		Object.setPrototypeOf(this, BadRequestError.prototype);
	}

	serializeErrors() {
		return [
			{
				message: this.message,
			},
		];
	}
}
