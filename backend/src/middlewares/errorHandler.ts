import type { NextFunction, Request, Response } from "express";
import { CustomError } from "../errors/customError";

const errorHandler = (
	err: Error,
	_req: Request,
	res: Response,
	_next: NextFunction,
): void => {
	console.error("ERROR:", err);

	if (err instanceof CustomError) {
		res.status(err.statusCode).json({
			status: "error",
			errors: err.serializeErrors(),
		});
		return;
	}

	// For programming or other unknown errors, don't leak error details
	if (process.env.NODE_ENV === "development") {
		res.status(500).json({
			status: "error",
			message: err.message,
			stack: err.stack,
		});
	} else {
		res.status(500).json({
			status: "error",
			message: "Something went very wrong!",
		});
	}
};

export default errorHandler;
