import type {
	EventId,
	PaginatedEvents,
	SuiClient,
	SuiEventFilter,
} from "@mysten/sui/client";
import type { FailedEvent, Prisma, PrismaClient } from "@prisma/client";
import retry from "async-retry";
import { EventEmitter } from "node:events";

// Configuration
const POLLING_INTERVAL = 30 * 1000; // 30 seconds
const BATCH_SIZE = 50; // Number of events to process in one transaction
const MAX_RETRY_ATTEMPTS = 5;
const BACKOFF_FACTOR = 1.5;
const EVENT_TYPES = ["PropertyCreated", "BookingCreated"] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface EventIndexerConfig {
	packageId: string;
	suiClient: SuiClient;
	prisma: PrismaClient;
	pollingInterval?: number;
	batchSize?: number;
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
export interface EventProcessor<T = any> {
	eventType: EventType;
	filter: SuiEventFilter;
	process: (event: T, tx: Prisma.TransactionClient) => Promise<void>;
}

/**
 * Event Indexer class - handles polling, processing, and cursor management
 */
export class EventIndexer extends EventEmitter {
	private suiClient: SuiClient;
	private prisma: PrismaClient;
	private pollingInterval: number;
	private batchSize: number;
	private processors: Map<EventType, EventProcessor> = new Map();
	private workerIntervals: Map<EventType, NodeJS.Timeout> = new Map();
	private monitorInterval?: NodeJS.Timeout;
	public isRunning = false;

	constructor(config: EventIndexerConfig) {
		super();
		this.suiClient = config.suiClient;
		this.prisma = config.prisma;
		this.pollingInterval = config.pollingInterval || POLLING_INTERVAL;
		this.batchSize = config.batchSize || BATCH_SIZE;
	}

	registerProcessor(processor: EventProcessor): void {
		this.processors.set(processor.eventType, processor);
		console.log(`Registered processor for ${processor.eventType}`);
	}

	async start(): Promise<void> {
		if (this.isRunning) {
			console.log("Indexer is already running");
			return;
		}

		this.isRunning = true;
		console.log("Starting event indexer...");

		// Start workers for each event type
		for (const [eventType, processor] of this.processors.entries()) {
			const interval = setInterval(
				async () => this.processEventBatch(eventType, processor),
				this.pollingInterval,
			);
			this.workerIntervals.set(eventType, interval);
			console.log(`Started worker for ${eventType}`);
		}

		this.monitorInterval = setInterval(
			() => this.monitorHealth(),
			5 * 60 * 1000, // Every 5 minutes
		);

		this.emit("started");
		console.log("Event indexer started");
	}

	stop(): void {
		if (!this.isRunning) {
			return;
		}

		for (const interval of this.workerIntervals.values()) {
			clearInterval(interval);
		}
		this.workerIntervals.clear();

		if (this.monitorInterval) {
			clearInterval(this.monitorInterval);
			this.monitorInterval = undefined;
		}

		this.isRunning = false;
		this.emit("stopped");
		console.log("Event indexer stopped");
	}

	/**
	 * Process a batch of events for a specific event type
	 */
	private async processEventBatch(
		eventType: EventType,
		processor: EventProcessor,
	): Promise<void> {
		try {
			// Get cursor for this event type
			const cursorRecord = await this.prisma.eventCursor.findUnique({
				where: { id: eventType },
			});

			console.log(
				`Processing events for ${eventType}, cursor: ${cursorRecord?.txDigest} ${cursorRecord?.eventSeq}`,
			);

			const cursor = cursorRecord
				? {
						txDigest: cursorRecord.txDigest,
						eventSeq: cursorRecord.eventSeq,
					}
				: undefined;

			// Query events from SUI
			const events = await retry(
				async () => {
					return await this.suiClient.queryEvents({
						query: processor.filter,
						cursor: cursor,
						limit: this.batchSize,
					});
				},
				{
					retries: MAX_RETRY_ATTEMPTS,
					factor: BACKOFF_FACTOR,
					onRetry: (error, attempt) => {
						console.error(
							`Attempt ${attempt} failed for ${eventType}: ${error}`,
						);
					},
				},
			);

			if (events.data.length === 0) {
				console.log(`No new events for ${eventType}`);
				return;
			}

			console.log(`Found ${events.data.length} events for ${eventType}`);

			// Process events in batches with transaction
			await this.processBatchWithTransaction(eventType, processor, events);
		} catch (error) {
			console.error(`Error processing ${eventType} events:`, error);

			const cursor = await this.prisma.eventCursor.findUnique({
				where: { id: eventType },
			});

			if (cursor) {
				await this.prisma.eventCursor.update({
					where: { id: eventType },
					data: {
						lastUpdated: new Date(),
					},
				});
			}

			this.emit("error", { eventType, error });
		}
	}

	/**
	 * Process a batch of events within a transaction
	 */
	private async processBatchWithTransaction(
		eventType: EventType,
		processor: EventProcessor,
		events: PaginatedEvents,
	): Promise<void> {
		let successCount = 0;
		let failureCount = 0;

		try {
			// Process each event in a transaction
			await this.prisma.$transaction(async (tx) => {
				for (const event of events.data) {
					try {
						await processor.process(event, tx);
						successCount++;
					} catch (error) {
						failureCount++;
						console.error("Failed to process event:", error);

						// Store failed event for later retry
						await tx.failedEvent.create({
							data: {
								eventType,
								// biome-ignore lint/suspicious/noExplicitAny: <explanation>
								eventData: event as any,
								errorMessage:
									error instanceof Error ? error.message : String(error),
								retryCount: 0,
								resolved: false,
							},
						});
					}
				}

				// Update cursor only if we processed events
				if (successCount > 0) {
					const nextCursor = events.nextCursor;
					nextCursor && (await this.saveLatestCursor(eventType, nextCursor));
					console.log(
						`Updated cursor for ${eventType} to ${nextCursor}, processed ${successCount} events`,
					);
				}
			});

			this.emit("batchProcessed", {
				eventType,
				successCount,
				failureCount,
				totalCount: events.data.length,
			});
		} catch (error) {
			console.error(`Transaction failed for ${eventType}:`, error);
			this.emit("batchFailed", {
				eventType,
				error,
				events: events.data,
			});
			throw error; // Re-throw for retry logic
		}
	}

	private async saveLatestCursor(
		eventType: EventType,
		cursor: EventId,
	): Promise<void> {
		try {
			const cursorData = {
				txDigest: cursor.txDigest,
				eventSeq: cursor.eventSeq,
				lastUpdated: new Date(),
			};
			await this.prisma.eventCursor.upsert({
				where: { id: eventType },
				update: {
					...cursorData,
				},
				create: { id: eventType, ...cursorData },
			});
		} catch (error) {
			console.error(`Error saving cursor for ${eventType}:`, error);
		}
	}

	/**
	 * Monitor indexer health
	 */
	private async monitorHealth(): Promise<void> {
		try {
			const cursors = await this.prisma.eventCursor.findMany();

			for (const cursor of cursors) {
				const eventType = cursor.id as EventType;
				const processor = this.processors.get(eventType);

				if (!processor) {
					continue;
				}

				// Check for newest event on chain
				const latestEvent = await this.suiClient.queryEvents({
					query: processor.filter,
					limit: 1,
					order: "descending",
				});

				if (latestEvent.data.length > 0) {
					// Calculate lag (time-based or count-based metrics)
					const lagInfo = {
						eventType,
						hasNewEvents: true,
						cursorUpdatedAt: cursor.lastUpdated,
					};

					this.emit("healthCheck", lagInfo);
					console.log(`Health check for ${eventType}:`, lagInfo);
				}
			}

			// Check for failed events that need retry
			const failedEvents = await this.prisma.failedEvent.findMany({
				where: {
					resolved: false,
					retryCount: { lt: 5 },
				},
				take: 10,
			});

			if (failedEvents.length > 0) {
				console.log(`Found ${failedEvents.length} failed events to retry`);
				this.emit("retryingFailedEvents", { count: failedEvents.length });

				for (const failedEvent of failedEvents) {
					await this.retryFailedEvent(failedEvent);
				}
			}
		} catch (error) {
			console.error("Error monitoring indexer health:", error);
			this.emit("monitorError", error);
		}
	}

	/**
	 * Retry a failed event
	 */
	private async retryFailedEvent(failedEvent: FailedEvent): Promise<void> {
		try {
			const eventType = failedEvent.eventType as EventType;
			const processor = this.processors.get(eventType);

			if (!processor) {
				console.log(`No processor found for event type ${eventType}`);
				return;
			}

			await this.prisma.$transaction(async (tx) => {
				await processor.process(failedEvent.eventData, tx);

				await tx.failedEvent.update({
					where: { id: failedEvent.id },
					data: {
						resolved: true,
						lastRetryAt: new Date(),
					},
				});
			});

			console.log(`Successfully retried failed event ${failedEvent.id}`);
			this.emit("eventRetrySuccess", { id: failedEvent.id, type: eventType });
		} catch (error) {
			console.error(`Retry failed for event ${failedEvent.id}:`, error);

			// Update retry count
			await this.prisma.failedEvent.update({
				where: { id: failedEvent.id },
				data: {
					retryCount: { increment: 1 },
					lastRetryAt: new Date(),
					errorMessage: error instanceof Error ? error.message : String(error),
				},
			});

			this.emit("eventRetryFailed", {
				id: failedEvent.id,
				type: failedEvent.eventType,
				error,
			});
		}
	}
}
