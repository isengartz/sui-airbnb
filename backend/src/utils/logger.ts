export interface Logger {
	debug(message: string, ...optionalParams: unknown[]): void;
	info(message: string, ...optionalParams: unknown[]): void;
	warn(message: string, ...optionalParams: unknown[]): void;
	error(message: string, ...optionalParams: unknown[]): void;
}

class ConsoleLogger implements Logger {
	private tag: string;

	constructor(tag: string) {
		this.tag = tag;
	}

	private formatMessage(message: string): string {
		return `[${this.tag}] - ${message}`;
	}

	public debug(message: string, ...optionalParams: unknown[]): void {
		console.debug(this.formatMessage(message), ...optionalParams);
	}

	public info(message: string, ...optionalParams: unknown[]): void {
		console.info(this.formatMessage(message), ...optionalParams);
	}

	public warn(message: string, ...optionalParams: unknown[]): void {
		console.warn(this.formatMessage(message), ...optionalParams);
	}

	public error(message: string, ...optionalParams: unknown[]): void {
		console.error(this.formatMessage(message), ...optionalParams);
	}
}

export enum LoggerType {
	CONSOLE = "console",
}

export class LoggerFactory {
	private type: LoggerType;

	constructor(type: LoggerType = LoggerType.CONSOLE) {
		this.type = type;
	}

	createLogger(tag: string): Logger {
		let logger: Logger;

		switch (this.type) {
			// case LoggerType.FILE:
			// 	logger = new FileLogger(tag);
			// 	break;
			default:
				logger = new ConsoleLogger(tag);
				break;
		}

		return logger;
	}
}
