import { createClient } from "redis";
import { logger } from "./loggerInstance";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = createClient({
	url: redisUrl,
});

redisClient.on("error", (err) => logger.error("Redis Client Error", err));

const startRedis = async () => {
	try {
		await redisClient.connect();
		logger.info("Connected to Redis");
	} catch (err) {
		logger.error("Failed to connect to Redis:", err);
	}
};

process.on("SIGINT", async () => {
	await redisClient.quit();
	logger.info("Redis connection closed due to application termination.");
	process.exit(0);
});

startRedis();
