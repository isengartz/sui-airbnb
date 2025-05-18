import { SuiClient } from "@mysten/sui/client";
import { redisClient } from "./redisClient";

const SUI_RPC_URL =
	process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io";
const suiClient = new SuiClient({ url: SUI_RPC_URL });

const CACHE_EXPIRY_SECONDS = 15 * 60; // 15 minutes

/**
 * Verify user role from blockchain by checking owned objects
 *
 * @param address User's Sui address
 * @returns Role string or null if not found
 */
export const verifyRoleFromBlockchain = async (
	address: string,
): Promise<string | null> => {
	// Check cache first
	const cachedRole = await redisClient.get(`role:${address}`);
	if (cachedRole) {
		return cachedRole;
	}

	try {
		// Query the blockchain for user's owned objects
		const ownedObjects = await suiClient.getOwnedObjects({
			owner: address,
			options: {
				showType: true,
			},
		});

		// Check for admin role token (example object type)
		const hasAdminObject = ownedObjects.data.some((obj) =>
			obj.data?.type?.includes("AdminToken"),
		);
		if (hasAdminObject) {
			await cacheRoleInRedis(address, "admin");
			return "admin";
		}

		// Check for agent role token
		const hasAgentObject = ownedObjects.data.some((obj) =>
			obj.data?.type?.includes("AgentToken"),
		);
		if (hasAgentObject) {
			await cacheRoleInRedis(address, "agent");
			return "agent";
		}

		// Default to user role
		await cacheRoleInRedis(address, "user");
		return "user";
	} catch (error) {
		console.error(`Error verifying role for ${address}:`, error);
		return null;
	}
};

/**
 * Cache a user's role in Redis with an expiration time
 */
const cacheRoleInRedis = async (
	address: string,
	role: string,
): Promise<void> => {
	await redisClient.set(`role:${address}`, role, {
		EX: CACHE_EXPIRY_SECONDS,
	});
};
