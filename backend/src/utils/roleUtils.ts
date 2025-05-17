import { SuiClient } from "@mysten/sui/client";

const SUI_RPC_URL =
	process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io";
const suiClient = new SuiClient({ url: SUI_RPC_URL });

// Cache for roles to minimize blockchain queries
const roleCache: Record<string, { role: string; expiry: number }> = {};
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes

/**
 * Verify user role from blockchain by checking owned objects
 * This is a placeholder implementation - customize based on your contract design
 * @param address User's Sui address
 * @returns Role string or null if not found
 */
export const verifyRoleFromBlockchain = async (
	address: string,
): Promise<string | null> => {
	// Check cache first
	if (roleCache[address] && roleCache[address].expiry > Date.now()) {
		return roleCache[address].role;
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
			cacheRole(address, "admin");
			return "admin";
		}

		// Check for agent role token
		const hasAgentObject = ownedObjects.data.some((obj) =>
			obj.data?.type?.includes("AgentToken"),
		);
		if (hasAgentObject) {
			cacheRole(address, "agent");
			return "agent";
		}

		// Default to user role
		cacheRole(address, "user");
		return "user";
	} catch (error) {
		console.error(`Error verifying role for ${address}:`, error);
		return null;
	}
};

/**
 * Cache a user's role with an expiration time
 */
const cacheRole = (address: string, role: string): void => {
	roleCache[address] = {
		role,
		expiry: Date.now() + CACHE_EXPIRY,
	};
};

/**
 * Clean up expired roles from cache
 */
export const cleanupRoleCache = (): void => {
	const now = Date.now();
	for (const address in roleCache) {
		if (roleCache[address].expiry < now) {
			delete roleCache[address];
		}
	}
};

// Set up periodic cache cleanup
setInterval(cleanupRoleCache, CACHE_EXPIRY);
