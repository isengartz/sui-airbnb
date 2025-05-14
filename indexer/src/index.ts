import { bcs } from "@mysten/sui/bcs";
import {
	SuiClient,
	type SuiTransactionBlockResponseOptions,
	getFullnodeUrl,
} from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { Transaction } from "@mysten/sui/transactions";
import { PrismaClient } from "@prisma/client";
import cors from "cors";
import dotenv from "dotenv";
import express, { type Request, type Response } from "express";
import { EventIndexer } from "./services/event-indexer";
import { createPropertyProcessor } from "./services/event-processors";
dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

const packageId = process.env.PACKAGE_ID || "";
const rpcUrl = process.env.SUI_RPC_URL || getFullnodeUrl("localnet");
const pollingInterval = Number.parseInt(
	process.env.POLLING_INTERVAL || "30000",
	10,
);
const batchSize = Number.parseInt(process.env.BATCH_SIZE || "50", 10); // 50 events per batch default
const suiClient = new SuiClient({ url: rpcUrl });

// Initialize event indexer
const eventIndexer = new EventIndexer({
	packageId,
	suiClient,
	prisma,
	pollingInterval,
	batchSize,
});

eventIndexer.registerProcessor(createPropertyProcessor(packageId));

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.get("/", (_req: Request, res: Response) => {
	res.json({
		message: "SUI Airbnb Indexer API",
		endpoints: [
			{ path: "/health", method: "GET", description: "Health check" },
			{ path: "/properties", method: "GET", description: "Get all properties" },
			{
				path: "/properties/mock",
				method: "POST",
				description: "Create a mock property",
			},
			{
				path: "/indexer/status",
				method: "GET",
				description: "Get indexer status",
			},
			{ path: "/indexer/start", method: "POST", description: "Start indexer" },
			{ path: "/indexer/stop", method: "POST", description: "Stop indexer" },
			{
				path: "/indexer/drop-records",
				method: "POST",
				description: "Drop all records",
			},
		],
	});
});

// Health check endpoint
app.get("/health", async (_req: Request, res: Response) => {
	try {
		// Test database connection
		await prisma.$queryRaw`SELECT 1`;
		const response = await fetch(rpcUrl, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				jsonrpc: "2.0",
				id: 1,
				method: "sui_getChainIdentifier",
				params: [],
			}),
		});

		const data = await response.json();
		res.json({
			status: "ok",
			database: "connected",
			nodeVersion: process.version,
			chainIdentifier: data.result,
		});
	} catch (error) {
		console.error("Health check failed:", error);
		res.status(500).json({
			status: "error",
			database: "disconnected",
			error: error instanceof Error ? error.message : "Unknown error",
			nodeVersion: process.version,
		});
	}
});

// Get all properties
app.get("/properties", async (_req: Request, res: Response) => {
	try {
		const properties = await prisma.property.findMany();
		res.json(properties);
	} catch (error) {
		console.error("Error fetching properties:", error);
		res.status(500).json({ error: "Failed to fetch properties" });
	}
});

// Add a mock property (for testing)
app.post("/properties/mock", async (_req: Request, res: Response) => {
	try {
		const packageId = process.env.PACKAGE_ID;
		if (!packageId) {
			return res
				.status(500)
				.json({ error: "PACKAGE_ID environment variable is not set" });
		}

		const privateKeyBase64 = process.env.SIGNER_PRIVATE_KEY;
		if (!privateKeyBase64) {
			return res
				.status(500)
				.json({ error: "SIGNER_PRIVATE_KEY environment variable is not set" });
		}

		const keypair = Ed25519Keypair.deriveKeypair(privateKeyBase64);

		const tx = new Transaction();

		// Random property data
		const price = Math.floor(Math.random() * 1000) + 50; // Random price between 50 and 1050
		const propertyTypeIndex = Math.floor(Math.random() * 3); // 0: ROOM, 1: APARTMENT, 2: HOUSE
		const numRooms = Math.floor(Math.random() * 6) + 1; // 1 to 6 rooms

		const propertyTypeNames = ["Room", "Apartment", "House"];
		const propertyType = propertyTypeNames[propertyTypeIndex];

		const descriptions = [
			`Cozy ${propertyType.toLowerCase()} in downtown area`,
			`Luxury ${propertyType.toLowerCase()} with great view`,
			`Modern ${propertyType.toLowerCase()} near the beach`,
			`Rustic ${propertyType.toLowerCase()} in quiet neighborhood`,
			`Spacious ${propertyType.toLowerCase()} with garden`,
		];
		const description =
			descriptions[Math.floor(Math.random() * descriptions.length)];

		const streets = [
			"123 Main St",
			"456 Oak Avenue",
			"789 Pine Road",
			"101 Beach Blvd",
			"202 Mountain Way",
		];
		const cities = ["New York", "Los Angeles", "Chicago", "Miami", "Seattle"];
		const address = `${streets[Math.floor(Math.random() * streets.length)]}, ${cities[Math.floor(Math.random() * cities.length)]}`;

		// biome-ignore lint/suspicious/noImplicitAnyLet: <explanation>
		let propertyTypeFn;
		if (propertyTypeIndex === 0) {
			propertyTypeFn = tx.moveCall({
				target: `${packageId}::property::room`,
			});
		} else if (propertyTypeIndex === 1) {
			propertyTypeFn = tx.moveCall({
				target: `${packageId}::property::apartment`,
			});
		} else {
			propertyTypeFn = tx.moveCall({
				target: `${packageId}::property::house`,
			});
		}

		tx.moveCall({
			target: `${packageId}::property::create_property`,
			arguments: [
				bcs.U64.serialize(price),
				propertyTypeFn,
				tx.pure.string(description),
				bcs.U64.serialize(numRooms),
				tx.pure.string(address),
			],
		});

		const result = await suiClient.signAndExecuteTransaction({
			signer: keypair,
			transaction: tx,
			options: {
				showObjectChanges: true,
				showEffects: true,
			} as SuiTransactionBlockResponseOptions,
		});

		const propertyObject = result.objectChanges?.find(
			(change) =>
				change.type === "created" &&
				change.objectType?.endsWith("::property::Property"),
		);

		if (!propertyObject) {
			throw new Error("Property object not found in transaction");
		}

		// @ts-expect-error objectId is expected to exist on the PropertyObject
		const propertyId = propertyObject.objectId;

		const createdProperty = {
			id: propertyId,
			type: propertyType,
			price,
			numRooms,
			description,
			address,
			transactionDigest: result.digest,
		};

		res.json({
			success: true,
			property: createdProperty,
		});
	} catch (error) {
		console.error("Error creating mock property:", error);
		res.status(500).json({
			success: false,
			error: error instanceof Error ? error.message : "Unknown error",
		});
	}
});

// Indexer control endpoints
app.get("/indexer/status", async (_req: Request, res: Response) => {
	try {
		const cursors = await prisma.eventCursor.findMany();
		const failedEvents = await prisma.failedEvent.count({
			where: { resolved: false },
		});

		res.json({
			status: eventIndexer.isRunning ? "running" : "stopped",
			packageId,
			rpcUrl,
			cursors,
			failedEvents,
		});
	} catch (error) {
		console.error("Error fetching indexer status:", error);
		res.status(500).json({ error: "Failed to fetch indexer status" });
	}
});

app.post("/indexer/start", (_req: Request, res: Response) => {
	if (eventIndexer.isRunning) {
		return res.json({ message: "Indexer is already running" });
	}

	eventIndexer
		.start()
		.then(() => res.json({ message: "Indexer started successfully" }))
		.catch((error) => {
			console.error("Failed to start indexer:", error);
			res.status(500).json({ error: "Failed to start indexer" });
		});
});

app.post("/indexer/stop", (_req: Request, res: Response) => {
	if (!eventIndexer.isRunning) {
		return res.json({ message: "Indexer is not running" });
	}

	eventIndexer.stop();
	res.json({ message: "Indexer stopped successfully" });
});

app.post("/indexer/drop-records", async (_req: Request, res: Response) => {
	await prisma.property.deleteMany();
	await prisma.eventCursor.deleteMany();
	await prisma.failedEvent.deleteMany();
	res.json({ message: "Records dropped successfully" });
});

// Start server
app.listen(PORT, () => {
	console.log(`
    SUI Airbnb Indexer running on port ${PORT}                                     
    Node version: ${process.version}                   
    Database URL: ${process.env.DATABASE_URL?.split("@")[1] || "not set"}  
    SUI RPC URL: ${process.env.SUI_RPC_URL || "not set"}
    Package ID: ${process.env.PACKAGE_ID || "not set"}
    Polling Interval: ${process.env.POLLING_INTERVAL || "not set"}
    Batch Size: ${process.env.BATCH_SIZE || "not set"}
  `);

	eventIndexer
		.start()
		.then(() => console.log("Event indexer started"))
		.catch((error) => console.error("Failed to start event indexer:", error));
});

// Handle shutdown gracefully
process.on("SIGINT", async () => {
	console.log("Shutting down...");
	eventIndexer.stop();
	await prisma.$disconnect();
	process.exit(0);
});

process.on("SIGTERM", async () => {
	console.log("Shutting down...");
	eventIndexer.stop();
	await prisma.$disconnect();
	process.exit(0);
});
