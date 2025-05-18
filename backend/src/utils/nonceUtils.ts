import crypto from "node:crypto";

export const generateNonce = (): string => {
	return crypto.randomBytes(16).toString("hex");
};
