import type { Response } from "express";
import type { AuthRequest } from "../middlewares/authMiddleware";

export const getProperties = (req: AuthRequest, res: Response) => {
	res.json({
		message: "List of properties",
		user: req.user,
	});
};

export const createProperty = (req: AuthRequest, res: Response) => {
	res.json({
		message: "Property created successfully",
		user: req.user,
	});
};

export const deleteProperty = (req: AuthRequest, res: Response) => {
	res.json({
		message: `Property ${req.params.id} deleted successfully`,
		user: req.user,
	});
};

export const createPrivateProperty = (req: AuthRequest, res: Response) => {
	res.json({
		message: "Private property created successfully",
		user: req.user,
	});
};

export const getPublicProperties = (req: AuthRequest, res: Response) => {
	res.json({
		message: "Public list of properties (limited data)",
	});
};
