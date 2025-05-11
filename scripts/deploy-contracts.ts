import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function main() {
  try {
    console.log('Deploying SUI Airbnb contracts...');
    
    // Path to the contract directory
    const contractsDir = path.join(__dirname, '../contracts');
    
    // Compile the contracts
    console.log('Building contracts...');
    execSync('sui move build', { cwd: contractsDir, stdio: 'inherit' });
    
    // Deploy the contracts
    console.log('Publishing contracts...');
    const output = execSync('sui client publish --gas-budget 100000000', { 
      cwd: contractsDir, 
      encoding: 'utf-8' 
    });
    
    console.log(output);
    
    // Extract package ID from output (this is a simple example, might need adjustment)
    const packageIdMatch = output.match(/packageId: (0x[a-fA-F0-9]+)/);
    const packageId = packageIdMatch ? packageIdMatch[1] : null;
    
    if (packageId) {
      console.log(`Contract deployed with package ID: ${packageId}`);
      
      // Save the package ID to a .env file for the indexer and frontend
      const envContent = `MODULE_ADDRESS=${packageId}\n`;
      fs.writeFileSync(path.join(__dirname, '../.env'), envContent);
      
      // Copy to indexer and frontend directories
      fs.copyFileSync(
        path.join(__dirname, '../.env'),
        path.join(__dirname, '../indexer/.env.local')
      );
      fs.copyFileSync(
        path.join(__dirname, '../.env'),
        path.join(__dirname, '../frontend/.env.local')
      );
      
      console.log('Environment files updated with package ID');
    } else {
      console.error('Failed to extract package ID from deployment output');
    }
    
  } catch (error) {
    console.error('Error deploying contracts:', error);
    process.exit(1);
  }
}

main();
