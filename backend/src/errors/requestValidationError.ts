import type { ValidationError } from "express-validator";
import { CustomError } from "./customError";

export class RequestValidationError extends CustomError {
	readonly statusCode = 400;

	// eslint-disable-next-line no-unused-vars
	constructor(public errors: ValidationError[]) {
		super("Invalid Request Parameters");
		// Because we are extending a built in Class
		Object.setPrototypeOf(this, RequestValidationError.prototype);
	}

	serializeErrors() {
		return this.errors.map((err) => {
			// @ts-expect-error
			return { message: err.msg, field: err.param };
		});
	}
}
