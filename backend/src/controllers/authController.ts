import { Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import type { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt, { type Secret } from "jsonwebtoken";
import { BadRequestError } from "../errors/badRequestError";
import { RequestValidationError } from "../errors/requestValidationError";
import { logger } from "../utils/loggerInstance";
import { generateNonce } from "../utils/nonceUtils";
import { redisClient } from "../utils/redisClient";
import { verifyRoleFromBlockchain } from "../utils/roleUtils";

// Load environment variables
const JWT_SECRET: Secret = Buffer.from(
	process.env.JWT_SECRET || "your-secret-key",
	"utf-8",
);
const JWT_EXPIRY = process.env.JWT_EXPIRY || "24h";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";
const NONCE_EXPIRY_SECONDS = 5 * 60; // 5 minutes
const ROLE_CACHE_EXPIRY_SECONDS = 15 * 60; // 15 minutes

interface AccessTokenPayload {
	address: string;
	role: string;
	tokenType: "access";
}

interface RefreshTokenPayload {
	address: string;
	tokenType: "refresh";
}

/**
 * Generate and return a nonce for authentication
 */
export const getNonce = async (req: Request, res: Response) => {
	logger.info("Generating nonce");
	const nonce = generateNonce();
	// Store nonce with address if provided
	if (req.query.address) {
		const address = req.query.address as string;
		await redisClient.set(`nonce:${address}`, nonce, {
			EX: NONCE_EXPIRY_SECONDS,
		});
	}

	res.json({ nonce, expiry: Date.now() + NONCE_EXPIRY_SECONDS * 1000 });
};

/**
 * Verify signature and issue JWT
 */
export const login = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const errors = validationResult(req);

	if (!errors.isEmpty()) {
		logger.error("Validation errors", { errors: errors.array() });
		throw new RequestValidationError(errors.array());
	}

	const { message, signature, publicKey } = req.body;

	try {
		// Parse the message
		const parsedMessage = JSON.parse(message);
		const { address, nonce, timestamp } = parsedMessage;

		if (!address) {
			throw new BadRequestError("Invalid message format, missing address");
		}

		// Verify timestamp is recent (within 5 minutes)
		const messageTime = new Date(timestamp).getTime();
		const now = Date.now();
		if (
			messageTime < now - NONCE_EXPIRY_SECONDS * 1000 ||
			messageTime > now + 60 * 1000
		) {
			throw new BadRequestError("Message timestamp is invalid or expired");
		}

		// Verify nonce if we have one stored
		const storedNonce = await redisClient.get(`nonce:${address}`);
		if (storedNonce && storedNonce !== nonce) {
			throw new BadRequestError("Invalid nonce");
		}

		// Verify signature
		const originalMessageBytes = new TextEncoder().encode(message);

		const suiPublicKey = new Ed25519PublicKey(new Uint8Array(publicKey.data));

		const isValid = await suiPublicKey.verifyPersonalMessage(
			originalMessageBytes,
			signature,
		);

		if (!isValid) {
			throw new BadRequestError("Invalid signature");
		}

		// Clean up used nonce
		if (storedNonce) {
			await redisClient.del(`nonce:${address}`);
		}

		let role = await redisClient.get(`role:${address}`);

		if (!role) {
			role = "user"; // Default role
			// Optionally verify role from blockchain
			try {
				const blockchainRole = await verifyRoleFromBlockchain(address);
				if (blockchainRole) {
					role = blockchainRole;
					// Cache the role in Redis
					await redisClient.set(`role:${address}`, role, {
						EX: ROLE_CACHE_EXPIRY_SECONDS,
					});
				}
			} catch (error) {
				logger.error("Error verifying role from blockchain during login", {
					address,
					error,
				});
			}
		}

		const tokenPayload: AccessTokenPayload = {
			address,
			role,
			tokenType: "access",
		};

		const token = jwt.sign(tokenPayload, JWT_SECRET, {
			expiresIn: JWT_EXPIRY as jwt.SignOptions["expiresIn"],
		});

		const refreshPayload: RefreshTokenPayload = {
			address,
			tokenType: "refresh",
		};

		const refreshToken = jwt.sign(refreshPayload, JWT_SECRET, {
			expiresIn: REFRESH_TOKEN_EXPIRY as jwt.SignOptions["expiresIn"],
		});

		res.json({
			token,
			refreshToken,
			user: {
				address,
				role,
			},
			expiresIn: JWT_EXPIRY,
		});
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new BadRequestError("Invalid message format: JSON parse error");
		}
		throw error;
	}
};

/**
 * Refresh access token using refresh token
 */
export const refreshToken = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const { refreshToken: token } = req.body;

	if (!token) {
		throw new BadRequestError("Refresh token is required");
	}

	try {
		// Verify refresh token
		const decoded = jwt.verify(token, JWT_SECRET) as {
			address: string;
			tokenType: string;
		};

		// Ensure this is a refresh token
		if (decoded.tokenType !== "refresh") {
			throw new BadRequestError("Invalid token type");
		}

		const address = decoded.address;
		let role = await redisClient.get(`role:${address}`);
		if (!role) {
			// If role not in cache, try to get it from blockchain
			// This situation is less likely if login caches it, but as a fallback:
			try {
				const blockchainRole = await verifyRoleFromBlockchain(address);
				if (blockchainRole) {
					role = blockchainRole;
					await redisClient.set(`role:${address}`, role, {
						EX: ROLE_CACHE_EXPIRY_SECONDS,
					});
				} else {
					role = "user"; // Default if not found on blockchain either
				}
			} catch (error) {
				logger.error(
					"Error verifying role from blockchain during token refresh",
					{ address, error },
				);
				role = "user"; // Default on error
			}
		}

		// Issue new access token
		const newTokenPayload: AccessTokenPayload = {
			address,
			role,
			tokenType: "access",
		};

		const newToken = jwt.sign(newTokenPayload, JWT_SECRET, {
			expiresIn: JWT_EXPIRY as jwt.SignOptions["expiresIn"],
		});

		res.json({
			token: newToken,
			user: {
				address,
				role,
			},
			expiresIn: JWT_EXPIRY,
		});
	} catch (error) {
		if (error instanceof jwt.JsonWebTokenError) {
			throw new BadRequestError("Invalid or expired refresh token");
		}
		throw error;
	}
};
