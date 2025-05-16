import express from "express";
import {
	createPrivateProperty,
	createProperty,
	deleteProperty,
	getProperties,
	getPublicProperties,
} from "../controllers/propertyController";
import {
	authenticateJWT,
	authorize,
	verifySuiObjectOwnership,
} from "../middlewares/authMiddleware";

const router = express.Router();

// Public route - no authentication needed
router.get("/public", getPublicProperties);

// Route accessible to all authenticated users
router.get("/", authenticateJWT, getProperties);

// Route accessible only to agents and admins
router.post(
	"/",
	authenticateJWT,
	authorize(["agent", "admin"]),
	createProperty,
);

// Route accessible only to admins
router.delete("/:id", authenticateJWT, authorize(["admin"]), deleteProperty);

// Route requiring both admin role AND ownership of a specific Sui object type
router.post(
	"/premium",
	authenticateJWT,
	authorize(["admin"]),
	verifySuiObjectOwnership("0x....::property::PremiumAgentCertificate"),
	createPrivateProperty,
);

export default router;
