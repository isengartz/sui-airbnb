import { createClient } from "redis";

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

export const redisClient = createClient({
	url: redisUrl,
});

redisClient.on("error", (err) => console.error("Redis Client Error", err));

const startRedis = async () => {
	try {
		await redisClient.connect();
		console.log("Connected to Redis");
	} catch (err) {
		console.error("Failed to connect to Redis:", err);
	}
};

process.on("SIGINT", async () => {
	await redisClient.quit();
	process.exit(0);
});

startRedis();
