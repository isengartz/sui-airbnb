import type { SuiEvent, SuiEventFilter } from "@mysten/sui/client";
import type { Prisma } from "@prisma/client";
import type { EventProcessor } from "./event-indexer";

/**
 * Property created event data structure
 */
interface PropertyCreatedEvent {
	property_id: string;
	owner: string;
	price_per_day: string; // BigInt comes as string
	property_type: {
		variant: "ROOM" | "APARTMENT" | "HOUSE";
		fields: Record<string, unknown>;
	};
	num_rooms: string; // BigInt comes as string
}

/**
 * Convert SUI property type to database enum
 */
function mapPropertyType(type: PropertyCreatedEvent["property_type"]): number {
	switch (type.variant) {
		case "ROOM":
			return 0;
		case "APARTMENT":
			return 1;
		case "HOUSE":
			return 2;
		default:
			throw new Error(`Invalid property type: ${JSON.stringify(type)}`);
	}
}

/**
 * Process PropertyCreated events
 */
export function createPropertyProcessor(packageId: string): EventProcessor {
	const filter: SuiEventFilter = {
		MoveEventType: `${packageId}::property::PropertyCreated`,
	};

	return {
		eventType: "PropertyCreated",
		filter,
		process: async (
			event: SuiEvent,
			tx: Prisma.TransactionClient,
		): Promise<void> => {
			const parsedJson = event.parsedJson as PropertyCreatedEvent;
			const objectId = parsedJson.property_id;

			console.log(`Processing PropertyCreated event for object ${objectId}`);

			// Check if property already exists (idempotent processing)
			const existingProperty = await tx.property.findUnique({
				where: { id: objectId },
			});

			if (existingProperty) {
				console.log(`Property ${objectId} already exists, skipping`);
				return;
			}

			// Create property in database
			await tx.property.create({
				data: {
					id: objectId,
					owner: parsedJson.owner,
					pricePerDay: Number.parseInt(parsedJson.price_per_day, 10),
					propertyType: mapPropertyType(parsedJson.property_type),
					numRooms: Number.parseInt(parsedJson.num_rooms, 10),
				},
			});

			console.log(`Created property ${objectId} in database`);
		},
	};
}

// export function createBookingProcessor(packageId: string): EventProcessor {
//   const filter: SuiEventFilter = {
//     MoveEventType: `${packageId}::property::BookingCreated`,
//   };

//   return {
//     eventType: 'BookingCreated',
//     filter,
//     process: async (event: SuiEvent, tx: Prisma.TransactionClient): Promise<void> => {
//       console.log('Processing booking event', event.id);

//     },
//   };
// }
