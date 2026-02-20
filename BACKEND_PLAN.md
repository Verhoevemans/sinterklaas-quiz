# Backend Implementation Plan

## Overview
Set up a Node.js backend with Express.js, Socket.io, MongoDB, and TypeScript in a `/server` folder.

## Tech Stack
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **WebSockets**: Socket.io
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: Simple password protection for admin (MVP)

## Folder Structure
```
/server
├── src/
│   ├── index.ts              # Entry point
│   ├── app.ts                # Express app setup
│   ├── config/
│   │   └── database.ts       # MongoDB connection
│   ├── models/
│   │   ├── Question.ts       # Question schema
│   │   └── GameSession.ts    # Game session schema
│   ├── routes/
│   │   ├── questions.ts      # Admin question CRUD
│   │   └── games.ts          # Game management
│   ├── socket/
│   │   └── gameSocket.ts     # Socket.io event handlers
│   └── middleware/
│       └── adminAuth.ts      # Simple admin auth
├── package.json
├── tsconfig.json
└── .env.example
```

## Implementation Steps

### Step 1: Initialize Backend Project
- Create `/server` folder
- Initialize npm project with TypeScript
- Install dependencies: express, socket.io, mongoose, cors, dotenv
- Configure tsconfig.json for Node.js

### Step 2: Create MongoDB Models
**Question Model** (matching frontend interface):
- id, text, options[], correctAnswerIndex, explanation
- questionType, imageUrl?, isActive, createdAt, updatedAt

**GameSession Model**:
- code (6-digit), hostId, players[], questions[]
- currentQuestionIndex, state, questionCount, createdAt

### Step 3: Set Up Express Server
- Create Express app with CORS for Angular dev server
- Add JSON body parser
- Create HTTP server for Socket.io integration

### Step 4: Implement REST API Routes
**Game Routes** (`/api/games`):
- POST `/` - Create new game (returns game code)
- GET `/:code` - Get game by code
- POST `/:code/join` - Join game with nickname

**Question Routes** (`/api/admin/questions`):
- GET `/` - List questions (with pagination)
- POST `/` - Create question
- PUT `/:id` - Update question
- DELETE `/:id` - Soft delete question

### Step 5: Implement Socket.io Events
**Events**:
- `join-game` - Player joins game room
- `start-game` - Host starts the game
- `submit-answer` - Player submits answer
- `next-question` - Host advances to next question
- `end-game` - Game completed

**Broadcasts**:
- `player-joined` - New player notification
- `player-left` - Player disconnected
- `game-started` - Game begins
- `answer-submitted` - Player answered
- `question-changed` - Next question loaded
- `game-ended` - Final results

### Step 6: Update Angular Frontend
- Create `SocketService` to connect to backend
- Update `GameStateService` to use API/sockets instead of localStorage
- Remove localStorage persistence (replaced by server state)

## Files to Create/Modify

### New Files (Backend)
- `server/package.json`
- `server/tsconfig.json`
- `server/.env.example`
- `server/src/index.ts`
- `server/src/app.ts`
- `server/src/config/database.ts`
- `server/src/models/Question.ts`
- `server/src/models/GameSession.ts`
- `server/src/routes/questions.ts`
- `server/src/routes/games.ts`
- `server/src/socket/gameSocket.ts`
- `server/src/middleware/adminAuth.ts`

### Modified Files (Frontend)
- `src/app/services/game-state.service.ts` - Use API/sockets
- New: `src/app/services/socket.service.ts`
- New: `src/app/services/api.service.ts`

## MongoDB Atlas Setup
1. Create a free cluster at mongodb.com/atlas
2. Create a database user with read/write access
3. Whitelist your IP address (or 0.0.0.0/0 for development)
4. Copy the connection string to `server/.env`

## Running the Application
```bash
# Terminal 1: Start backend
cd server && npm run dev

# Terminal 2: Start frontend
npm start
```

## Verification
1. Start MongoDB and backend server
2. Create a game via API: `POST /api/games`
3. Open two browser windows
4. Host creates game, player joins with game code
5. Verify real-time player list updates via WebSocket
6. Play through a quiz, verify scoring syncs
7. Verify results page shows correct rankings
