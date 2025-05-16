import express from "express";
import { getNonce, login, prepareMessage } from "../controllers/authController";

const router = express.Router();

// Route to request a nonce for Sui authentication
router.get("/nonce", getNonce);

// Route to verify Sui signature and issue JWT
router.post("/login", login);

// Endpoint to help clients prepare a Sui authentication message
router.post("/prepare-message", prepareMessage);

export default router;
