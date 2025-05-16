import { SuiClient } from "@mysten/sui/client";
import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { BadRequestError } from "../errors/badRequestError";
import { NotAuthorizedError } from "../errors/unauthorizedError";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const SUI_RPC_URL =
	process.env.SUI_RPC_URL || "https://fullnode.mainnet.sui.io";
const suiClient = new SuiClient({ url: SUI_RPC_URL });

export interface AuthRequest extends Request {
	user?: {
		address: string;
		role: string;
		nonce: string;
	};
}

interface JwtPayload {
	address: string;
	role: string;
	nonce: string;
}

export const authenticateJWT = (
	req: AuthRequest,
	_res: Response,
	next: NextFunction,
) => {
	const authHeader = req.headers.authorization;

	if (!authHeader?.startsWith("Bearer ")) {
		throw new NotAuthorizedError("Authorization token required");
	}

	const token = authHeader.split(" ")[1];

	try {
		const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
		req.user = {
			address: decoded.address,
			role: decoded.role,
			nonce: decoded.nonce,
		};
		next();
	} catch (error) {
		throw new NotAuthorizedError("Invalid or expired token");
	}
};

export const authorize = (allowedRoles: string[]) => {
	return (req: AuthRequest, res: Response, next: NextFunction) => {
		if (!req.user) {
			throw new NotAuthorizedError("User not authenticated");
		}

		if (!allowedRoles.includes(req.user.role)) {
			throw new NotAuthorizedError("Insufficient permissions");
		}

		next();
	};
};

export const verifySuiObjectOwnership = (objectType: string) => {
	return async (req: AuthRequest, res: Response, next: NextFunction) => {
		if (!req.user?.address) {
			throw new BadRequestError("User not authenticated");
		}

		try {
			const ownedObjects = await suiClient.getOwnedObjects({
				owner: req.user.address,
				options: {
					showType: true,
				},
			});

			const hasRequiredObject = ownedObjects.data.some(
				(obj) => obj.data?.type === objectType,
			);

			if (!hasRequiredObject) {
				throw new NotAuthorizedError(
					`Required Sui object not owned: ${objectType}`,
				);
			}

			next();
		} catch (error) {
			throw new BadRequestError("Failed to verify Sui object ownership");
		}
	};
};
