import { Ed25519PublicKey } from "@mysten/sui/keypairs/ed25519";
import { fromBase64 } from "@mysten/sui/utils";
import type { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import { BadRequestError } from "../errors/badRequestError";
import { RequestValidationError } from "../errors/requestValidationError";
import { generateNonce as createNonce } from "../utils/nonceUtils";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

// Mock database for role mapping
const userRoles: Record<string, string> = {
	"0x1234567890123456789012345678901234567890123456789012345678901234": "admin",
	"0xabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcdefabcd": "agent",
	"0x9876543210987654321098765432109876543210987654321098765432109876": "agent",
};

// Nonce storage (use Redis later)
const nonceStore: Record<string, string> = {};

export const getNonce = (req: Request, res: Response) => {
	const nonce = createNonce();
	res.json({ nonce });
};

export const login = async (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const errors = validationResult(req);
	if (!errors.isEmpty()) {
		throw new RequestValidationError(errors.array());
	}

	const { message, signature, publicKey } = req.body;

	const originalMessageBytes = new TextEncoder().encode(message);
	const publicKeyBytes = fromBase64(publicKey);
	const suiPublicKey = new Ed25519PublicKey(publicKeyBytes);

	const isValid = await suiPublicKey.verifyPersonalMessage(
		originalMessageBytes,
		signature,
	);

	if (!isValid) {
		throw new BadRequestError("Invalid signature");
	}

	const parsedMessage = JSON.parse(message);
	const address = parsedMessage.address;

	if (!address) {
		throw new BadRequestError("Invalid message format, missing address");
	}
	try {
		const role = userRoles[address] || "user";
		const token = jwt.sign(
			{
				address,
				role,
				nonce: parsedMessage.nonce,
			},
			JWT_SECRET,
			{ expiresIn: "24h" },
		);
		res.json({
			token,
			user: {
				address,
				role,
			},
		});
	} catch (error) {
		throw new BadRequestError(
			`Invalid message format: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
};

export const prepareMessage = (
	req: Request,
	res: Response,
	next: NextFunction,
) => {
	const { address } = req.body;

	if (!address) {
		throw new BadRequestError("Valid Sui address required");
	}

	const nonce = createNonce();
	nonceStore[address] = nonce;

	const message = JSON.stringify({
		app: "Web3 Airbnb on Sui",
		domain: req.hostname,
		address,
		statement: "Sign in to Web3 Airbnb with your Sui account.",
		version: "1",
		nonce,
		timestamp: new Date().toISOString(),
	});

	res.json({ message });
};
