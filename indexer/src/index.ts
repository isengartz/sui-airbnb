import express, { Request, Response } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

app.get('/', (_req: Request, res: Response) => {
  console.log(`
    ╔═══════════════════════════════════════════════╗
    ║   API Endpoints:                              ║
    ║   - GET /health                               ║
    ║   - GET /properties                           ║
    ║   - POST /properties/mock                     ║
    ║                                               ║
    ╚═══════════════════════════════════════════════╝
      `);
});

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;
    res.json({ 
      status: 'ok',
      database: 'connected',
      nodeVersion: process.version
    });
  } catch (error) {
    console.error('Health check failed:', error);
    res.status(500).json({ 
      status: 'error',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
      nodeVersion: process.version
    });
  }
});

// Get all properties
app.get('/properties', async (_req: Request, res: Response) => {
  try {
    const properties = await prisma.property.findMany();
    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Add a mock property (for testing)
app.post('/properties/mock', async (_req: Request, res: Response) => {
  try {
    const mockProperty = await prisma.property.create({
      data: {
        id: `0x${Math.floor(Math.random() * 1000000).toString(16)}`,
        owner: `0x${Math.floor(Math.random() * 1000000).toString(16)}`,
        pricePerDay: Math.floor(Math.random() * 200) + 50,
        propertyType: Math.floor(Math.random() * 3),
        description: 'Mock property for testing',
        numRooms: Math.floor(Math.random() * 5) + 1,
        address: '123 Test Street, Testville',
        isAvailable: true
      }
    });
    
    res.status(201).json(mockProperty);
  } catch (error) {
    console.error('Error creating mock property:', error);
    res.status(500).json({ error: 'Failed to create mock property' });
  }
});

const setupEventListeners = (): void => {
  console.log('Event listeners would be set up here with SUI SDK');
  console.log(`Would connect to SUI RPC at: ${process.env.SUI_RPC_URL}`);
};

// Start server
app.listen(PORT, () => {
  console.log(`

SUI Airbnb Indexer running on port ${PORT}                                     
Node version: ${process.version}                   
Database URL: ${process.env.DATABASE_URL?.split('@')[1] || 'not set'}  
SUI RPC URL: ${process.env.SUI_RPC_URL || 'not set'}     

  `);
  
  setupEventListeners();
}); 