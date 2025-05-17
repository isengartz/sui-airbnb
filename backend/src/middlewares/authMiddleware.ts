import { SuiClient } from "@mysten/sui/client";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { BadRequestError } from "../errors/badRequestError";
import { NotAuthorizedError } from "../errors/unauthorizedError";

// Load environment variables
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const SUI_RPC_URL =
	process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io";
const suiClient = new SuiClient({ url: SUI_RPC_URL });

// Role cache to reduce lookups
const roleCache: Record<string, { role: string; expiry: number }> = {};
const ROLE_CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

export interface AuthRequest extends Request {
	user?: {
		address: string;
		role: string;
		tokenType: string;
	};
}

interface JwtPayload {
	address: string;
	role: string;
	tokenType: string;
	iat: number;
	exp: number;
}

/**
 * Extract and verify JWT from request headers
 */
export const authenticateJWT = (
	req: AuthRequest,
	_res: Response,
	next: NextFunction,
) => {
	// Check for token in headers
	const authHeader = req.headers.authorization;

	if (!authHeader?.startsWith("Bearer ")) {
		throw new NotAuthorizedError("Authorization token required");
	}

	const token = authHeader.split(" ")[1];

	try {
		// Verify token
		const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;

		// Ensure it's an access token
		if (decoded.tokenType !== "access") {
			throw new NotAuthorizedError("Invalid token type");
		}

		// Attach user data to request
		req.user = {
			address: decoded.address,
			role: decoded.role,
			tokenType: decoded.tokenType,
		};
		next();
	} catch (error) {
		if (error instanceof jwt.TokenExpiredError) {
			throw new NotAuthorizedError("Token expired");
		}
		if (error instanceof jwt.JsonWebTokenError) {
			throw new NotAuthorizedError("Invalid token");
		}
		throw new NotAuthorizedError("Authentication failed");
	}
};

/**
 * Check if user has required role
 */
export const authorize = (allowedRoles: string[]) => {
	return (req: AuthRequest, _res: Response, next: NextFunction) => {
		if (!req.user) {
			throw new NotAuthorizedError("User not authenticated");
		}

		// Check user's role against allowed roles
		if (!allowedRoles.includes(req.user.role)) {
			throw new NotAuthorizedError("Insufficient permissions");
		}

		// Proceed if authorized
		next();
	};
};

/**
 * Check if user owns a specific Sui object type
 */
export const verifySuiObjectOwnership = (objectType: string) => {
	return async (req: AuthRequest, _res: Response, next: NextFunction) => {
		if (!req.user?.address) {
			throw new BadRequestError("User not authenticated");
		}

		const address = req.user.address;

		// Check cache first to avoid blockchain query
		if (roleCache[address] && roleCache[address].expiry > Date.now()) {
			if (
				roleCache[address].role === "admin" ||
				roleCache[address].role === "verified_agent"
			) {
				return next();
			}
		}

		try {
			// Query blockchain for user's owned objects
			const ownedObjects = await suiClient.getOwnedObjects({
				owner: address,
				options: {
					showType: true,
				},
			});

			// Check if user owns any object of required type
			const hasRequiredObject = ownedObjects.data.some(
				(obj) => obj.data?.type === objectType,
			);

			if (!hasRequiredObject) {
				throw new NotAuthorizedError(
					`Required Sui object not owned: ${objectType}`,
				);
			}

			// Update role cache
			if (objectType.includes("AdminToken")) {
				roleCache[address] = {
					role: "admin",
					expiry: Date.now() + ROLE_CACHE_DURATION,
				};
			} else if (objectType.includes("AgentToken")) {
				roleCache[address] = {
					role: "verified_agent",
					expiry: Date.now() + ROLE_CACHE_DURATION,
				};
			}

			next();
		} catch (error) {
			throw new BadRequestError("Failed to verify Sui object ownership");
		}
	};
};

/**
 * Periodically clean up expired role cache entries
 */
setInterval(
	() => {
		const now = Date.now();
		for (const address in roleCache) {
			if (roleCache[address].expiry < now) {
				delete roleCache[address];
			}
		}
	},
	15 * 60 * 1000,
); // 15 minutes
