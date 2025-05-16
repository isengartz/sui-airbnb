import cors from "cors";
import dotenv from "dotenv";
import express from "express";

import errorHandler from "./middlewares/errorHandler";
import authRoutes from "./routes/authRoutes";
import propertyRoutes from "./routes/propertyRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/properties", propertyRoutes);

app.get("/", (req, res) => {
	res.send("SUI Auth Backend is running!");
});

// Global error handler - should be the last middleware
app.use(errorHandler);

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
	if (!process.env.JWT_SECRET) {
		console.warn(
			"JWT_SECRET is not set. Please set it in your .env file for production.",
		);
	}
});
