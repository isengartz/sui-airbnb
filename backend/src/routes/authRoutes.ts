import express from "express";
import { getNonce, login, refreshToken } from "../controllers/authController";

const router = express.Router();

// Route to request a nonce for Sui authentication
router.get("/nonce", getNonce);

// Route to verify Sui signature and issue JWT
router.post("/login", login);

// Endpoint to refresh access token using refresh token
router.post("/refresh-token", refreshToken);

export default router;
