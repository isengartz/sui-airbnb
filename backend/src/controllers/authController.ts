import { Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import type { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt, { type Secret } from "jsonwebtoken";
import { BadRequestError } from "../errors/badRequestError";
import { RequestValidationError } from "../errors/requestValidationError";
import { generateNonce } from "../utils/nonceUtils";
import { verifyRoleFromBlockchain } from "../utils/roleUtils";
// Load environment variables
const JWT_SECRET: Secret = Buffer.from(
	process.env.JWT_SECRET || "your-secret-key",
	"utf-8",
);
const JWT_EXPIRY = process.env.JWT_EXPIRY || "24h";
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || "7d";

interface AccessTokenPayload {
	address: string;
	role: string;
	tokenType: "access";
}

interface RefreshTokenPayload {
	address: string;
	tokenType: "refresh";
}

// @TODO: Use Redis or another distributed cache
const userRoles: Record<string, string> = {
	"0x1234567890123456789012345678901234567890123456789012345678901234": "admin",
	"0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd": "agent",
	"0x9876543210987654321098765432109876543210987654321098765432109876": "agent",
};

// @TODO: Use Redis or another distributed cache
const nonceStore: Record<string, { nonce: string; expiry: number }> = {};

// Clean up expired nonces periodically (every 15 minutes)
setInterval(
	() => {
		const now = Date.now();
		for (const address in nonceStore) {
			if (nonceStore[address].expiry < now) {
				delete nonceStore[address];
			}
		}
	},
	15 * 60 * 1000,
);

/**
 * Generate and return a nonce for authentication
 */
export const getNonce = (req: Request, res: Response) => {
	const nonce = generateNonce();
	const expiry = Date.now() + 5 * 60 * 1000; // 5 minutes expiry

	// Store nonce with address if provided
	if (req.query.address) {
		const address = req.query.address as string;
		nonceStore[address] = { nonce, expiry };
	}

	res.json({ nonce, expiry });
};

/**
 * Verify signature and issue JWT
 */
export const login = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	console.log("login", req.body);
	const errors = validationResult(req);
	console.log("errors", errors);
	if (!errors.isEmpty()) {
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
		if (messageTime < now - 5 * 60 * 1000 || messageTime > now + 60 * 1000) {
			throw new BadRequestError("Message timestamp is invalid or expired");
		}

		// Verify nonce if we have one stored
		if (nonceStore[address] && nonceStore[address].nonce !== nonce) {
			throw new BadRequestError("Invalid nonce");
		}

		console.log("message", message);
		console.log("signature", signature);
		console.log("publicKey", publicKey);

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
		if (nonceStore[address]) {
			delete nonceStore[address];
		}

		// Get user role
		let role = userRoles[address] || "user";

		// Optionally verify role from blockchain (use cached value from userRoles if available)
		if (!userRoles[address]) {
			try {
				// This function would check blockchain state for special objects/NFTs
				// that determine role permissions
				const blockchainRole = await verifyRoleFromBlockchain(address);
				if (blockchainRole) {
					role = blockchainRole;
					// Cache the role
					userRoles[address] = role;
				}
			} catch (error) {
				console.error("Error verifying role from blockchain:", error);
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
		const role = userRoles[address] || "user";

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
