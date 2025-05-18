import { LoggerFactory, LoggerType } from "./logger";

export const logger = new LoggerFactory(LoggerType.CONSOLE).createLogger(
	"BACKEND-SERVICE",
);
