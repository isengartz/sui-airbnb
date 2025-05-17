# Hybrid Web3 Authentication Architecture

This document explains the hybrid authentication architecture implemented in the Sui Airbnb application, which distributes authentication responsibilities between client and server to improve performance, scalability, and user experience while maintaining security.

## Architecture Overview

The authentication system uses a hybrid approach:

### Client-Side Responsibilities
- Wallet connection and interaction
- Challenge message construction
- Signature generation
- Local session management and token caching
- Automatic token refresh
- Preliminary validation before server requests

### Server-Side Responsibilities
- Lightweight signature verification (once per session)
- JWT issuance and validation
- Role and permissions management
- Stateless request authorization
- Blockchain-based role verification (with caching)

## Authentication Flow

1. **Initial Authentication**:
   - User connects wallet using Sui wallet adapter
   - Client requests a nonce from the server
   - Client constructs a challenge message including address, nonce, and timestamp
   - User signs the message with their wallet
   - Client sends the signature, message, and public key to the server
   - Server verifies the signature and issues JWT and refresh tokens
   - Client stores tokens securely and manages the session

2. **Request Authorization**:
   - Client attaches JWT to API requests via Authorization header
   - Server validates JWT and checks user role for protected endpoints
   - For certain operations, server verifies blockchain-based permissions

3. **Token Refresh**:
   - Client monitors token expiration
   - When token is about to expire, client uses refresh token to obtain a new access token
   - If refresh fails, user is required to reauthenticate

## Key Components

### Frontend

1. **AuthService** (`frontend/src/services/authService.ts`):
   - Manages local token storage and state
   - Handles signature generation and verification
   - Manages token refresh cycles
   - Provides authenticated request headers

2. **AuthContext** (`frontend/src/contexts/AuthContext.tsx`):
   - Provides authentication state to React components
   - Exposes login, logout, and role checking functions
   - Manages automatic token refresh intervals

3. **useAuthenticatedApi** (`frontend/src/hooks/useAuthenticatedApi.ts`):
   - React hook for making authenticated API requests
   - Handles token refresh before requests
   - Manages error handling and retries

4. **ProtectedRoute** (`frontend/src/components/ProtectedRoute.tsx`):
   - Route guard component for role-based access control
   - Redirects unauthenticated or unauthorized users

### Backend

1. **AuthController** (`backend/src/controllers/authController.ts`):
   - Handles nonce generation and distribution
   - Verifies wallet signatures
   - Issues and refreshes JWT tokens
   - Integrates with blockchain for role verification

2. **AuthMiddleware** (`backend/src/middlewares/authMiddleware.ts`):
   - Validates JWTs on protected routes
   - Checks user roles against required permissions
   - Provides blockchain object ownership verification
   - Implements caching to reduce blockchain queries

3. **RoleUtils** (`backend/src/utils/roleUtils.ts`):
   - Verifies user roles from blockchain state
   - Caches role information to improve performance

## Security Considerations

1. **Nonce Management**:
   - Nonces have short expiration times (5 minutes)
   - Used only once and invalidated after use
   - Stored with address binding for verification

2. **Token Security**:
   - Access tokens have shorter lifetimes (24 hours by default)
   - Refresh tokens have longer lifetimes (7 days by default)
   - JWTs include token type to prevent cross-usage

3. **Blockchain Verification**:
   - Critical operations verify on-chain state when needed
   - Role information is cached with expiration to reduce blockchain queries

4. **Message Verification**:
   - Challenge messages include timestamp validation
   - Domain and app name included to prevent cross-site requests
   - Full message verified with cryptographic signature

## Performance Optimizations

1. **Caching**:
   - Token caching in localStorage to persist across sessions
   - Role caching on server to minimize blockchain queries
   - Nonce caching with automatic cleanup

2. **Stateless Authentication**:
   - JWTs enable stateless verification for most requests
   - No database lookups needed for routine authentication

3. **Hybrid Approach Benefits**:
   - Signature verification only needed during login
   - Most operations use lightweight JWT verification
   - Client handles most token management without server involvement

## Implementation Details

The authentication system consists of:
- Backend authentication routes and controllers
- Frontend authentication service and context
- JWT creation and validation
- Wallet signature verification
- Role-based access control
- Automatic token refresh mechanism
- Protected route components

This architecture provides a secure, efficient way to handle Web3 authentication while minimizing blockchain operations and providing a smooth user experience. 