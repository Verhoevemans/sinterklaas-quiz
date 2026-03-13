# Server Architecture Guidelines

This document defines the architectural rules and conventions for the backend server.

## Folder Structure

The server uses a **feature-based** folder structure. Files are organized by domain/feature, not by file type.

```
server/src/
├── index.ts                    # Entry point
├── app.ts                      # Express app setup
├── config/
│   └── database.ts             # MongoDB connection
├── shared/
│   ├── logger.ts               # Logging utility
│   └── middleware/
│       └── admin-auth.middleware.ts
├── games/
│   ├── game.model.ts           # Mongoose schema & model
│   ├── game.service.ts         # Business logic (shared by HTTP + socket layers)
│   ├── game.controller.ts      # HTTP request handling
│   ├── game.routes.ts          # Express route definitions (minimal)
│   ├── game.socket.ts          # Socket event registrations
│   ├── game.socket-handler.ts  # Socket event logic
│   └── game.timer.ts           # Module-level question timer (see Timer section)
└── questions/
    ├── question.model.ts       # Mongoose schema & model
    ├── question.controller.ts  # Business logic + request handling
    └── question.routes.ts      # Express route definitions (minimal)
```

## File Naming Conventions

All files use **kebab-case** with a **type suffix**:

| Type | Suffix | Example |
|------|--------|---------|
| Mongoose Model | `.model.ts` | `game.model.ts` |
| Express Routes | `.routes.ts` | `game.routes.ts` |
| Controller (logic) | `.controller.ts` | `game.controller.ts` |
| Socket Events | `.socket.ts` | `game.socket.ts` |
| Socket Handlers | `.socket-handler.ts` | `game.socket-handler.ts` |
| Timers / background logic | `.timer.ts` | `game.timer.ts` |
| Middleware | `.middleware.ts` | `admin-auth.middleware.ts` |
| Utilities | `.util.ts` | `logger.util.ts` |

## Route/Controller Separation

### Routes File (`.routes.ts`)
Routes files should be **minimal**. They only:
- Define routes using `router.route()` with method chaining
- Bind controller methods to routes
- Apply middleware where needed

Routes files do NOT contain:
- Request/response parsing logic
- Error handling
- Logging calls
- Business logic

```typescript
// game.routes.ts
import { Router } from 'express';
import { GameController } from './game.controller.js';

const router: Router = Router();
const controller: GameController = new GameController();

router.route('/')
  .post(controller.createGame);

router.route('/:code')
  .get(controller.getGameByCode);

router.route('/:code/join')
  .post(controller.joinGame);

router.route('/:code/questions/:index')
  .get(controller.getQuestionByIndex);

export default router;
```

### Controller File (`.controller.ts`)
Controllers handle everything:
- API logging at the start of each method
- Request parsing (reading from `req.body`, `req.params`, `req.query`)
- Input validation
- Business logic and database operations
- Error handling and response formatting
- Sending responses via `res.json()`, `res.status()`

Controller methods are bound to `this` and receive Express `Request` and `Response` objects.

```typescript
// game.controller.ts
import { Request, Response } from 'express';
import { GameSession, IGameSession } from './game.model.js';
import { logger } from '../shared/logger.js';

export class GameController {
  constructor() {
    // Bind all methods to preserve 'this' context when used as route handlers
    this.createGame = this.createGame.bind(this);
    this.getGameByCode = this.getGameByCode.bind(this);
  }

  public async createGame(req: Request, res: Response): Promise<void> {
    logger.api('POST', '/api/games', { nickname: req.body.hostNickname });

    try {
      const { hostNickname, questionCount = 15 } = req.body;

      if (!hostNickname || hostNickname.length < 3) {
        res.status(400).json({ error: 'Invalid nickname' });
        return;
      }

      const game = new GameSession({ ... });
      await game.save();

      res.status(201).json({ code: game.code, game });
    } catch (error) {
      logger.error('POST /api/games', error);
      res.status(500).json({ error: 'Failed to create game' });
    }
  }

  public async getGameByCode(req: Request, res: Response): Promise<void> {
    logger.api('GET', `/api/games/${req.params.code}`);

    try {
      const game = await GameSession.findOne({ code: req.params.code });

      if (!game) {
        res.status(404).json({ error: 'Game not found' });
        return;
      }

      res.json({ game });
    } catch (error) {
      logger.error(`GET /api/games/${req.params.code}`, error);
      res.status(500).json({ error: 'Failed to fetch game' });
    }
  }
}
```

### Why This Pattern?

1. **Routes are declarative**: Easy to see all endpoints at a glance
2. **Controllers are self-contained**: All logic for an endpoint is in one place
3. **Reusability**: Controller logic can be shared with socket handlers via private methods
4. **Testing**: Controllers can be tested with mocked req/res objects
5. **Consistency**: Every endpoint follows the same pattern

## Socket Event/Handler Separation

### Socket Events File (`.socket.ts`)
- Registers socket event listeners
- Logs incoming events
- Calls handler methods

```typescript
// game.socket.ts
import { Server, Socket } from 'socket.io';
import { GameSocketHandler } from './game.socket-handler.js';
import { logger } from '../shared/logger.js';

export function registerGameSocket(io: Server, socket: Socket): void {
  const handler: GameSocketHandler = new GameSocketHandler(io, socket);

  socket.on('join-game', async (data: JoinGameData) => {
    logger.socket('join-game', { gameCode: data.code, playerId: data.playerId });
    await handler.joinGame(data);
  });

  socket.on('start-game', async (data: StartGameData) => {
    logger.socket('start-game', { gameCode: data.gameCode });
    await handler.startGame(data);
  });
}
```

### Socket Handler File (`.socket-handler.ts`)
- Contains event handling logic
- Interacts with models/database (can share logic with controllers)
- Manages socket rooms and broadcasts

```typescript
// game.socket-handler.ts
import { Server, Socket } from 'socket.io';
import { GameSession } from './game.model.js';
import { logger } from '../shared/logger.js';

export class GameSocketHandler {
  private readonly io: Server;
  private readonly socket: Socket;

  constructor(io: Server, socket: Socket) {
    this.io = io;
    this.socket = socket;
  }

  public async joinGame(data: JoinGameData): Promise<void> {
    try {
      const game = await GameSession.findOne({ code: data.code });
      // ... handle join logic
    } catch (error) {
      logger.error('GameSocketHandler.joinGame', error);
      this.socket.emit('error', { message: 'Failed to join game' });
    }
  }
}
```

## Service Layer

Business logic lives in a dedicated `.service.ts` file, not in controllers or socket handlers directly. Both the HTTP layer (`game.controller.ts`) and the socket layer (`game.socket-handler.ts`) instantiate and call the service.

```typescript
// game.service.ts
export class GameService {
  public async startGame(code: string, playerId: string): Promise<{ game: IGameSession; question: IQuestion }> { ... }
  public async submitAnswer(...): Promise<{ received: true; allAnswered: boolean }> { ... }
  public async revealAnswers(code: string): Promise<RevealResult> { ... }
  public async nextQuestion(...): Promise<NextQuestionResult> { ... }
}
```

Each `GameSocketHandler` creates its own `GameService` instance. This is safe because all state is in MongoDB, not in the service object.

## Question Timer (`game.timer.ts`)

The 20-second per-question countdown is owned by the **server** to prevent client drift and cheating.

**Key design decisions:**

- The timer state lives in a **module-level `Map<gameCode, NodeJS.Timeout>`** in `game.timer.ts`. This map is shared across all `GameSocketHandler` instances because JavaScript module scope is a singleton within the process.
- `game.timer.ts` is a separate file (not inside `game.socket.ts`) to avoid a circular import between `game.socket.ts` → `game.socket-handler.ts` → `game.socket.ts`.

### API

```typescript
// Start (or restart) the 20-second timer for a game
startQuestionTimer(io: Server, service: GameService, gameCode: string): void

// Cancel the timer (call before nextQuestion / endGame / early reveal)
clearGameTimer(gameCode: string): void

// Award scores + emit 'answer-reveal' to the room
triggerReveal(io: Server, service: GameService, gameCode: string): Promise<void>
```

### When to call each function

| Event | Action |
|---|---|
| Host starts game | `startQuestionTimer` after emitting `game-started` |
| Player submits and all have answered | `clearGameTimer` then `triggerReveal` |
| Timer fires naturally | `triggerReveal` (called internally by `setTimeout` callback) |
| Host advances question | `clearGameTimer` first, then `startQuestionTimer` after emitting `question-changed` |
| Host ends game early | `clearGameTimer` before processing |

## Socket Events Reference

| Event | Direction | Trigger | Key payload |
|---|---|---|---|
| `game-started` | server → all | host starts game | `{ question, questionIndex, totalQuestions, startTime }` |
| `question-changed` | server → all | host advances | `{ question, questionIndex, totalQuestions, startTime }` |
| `submit-answer` | client → server | player submits | `{ gameCode, playerId, questionId, selectedIndex }` |
| `answer-result` | server → player | submit ack | `{ received: true }` |
| `answer-reveal` | server → all | timer fires or all answered | `{ correctAnswerIndex, explanation, scores[] }` |
| `game-ended` | server → all | game complete | `{ players[], questions[], endedEarly? }` |

**Important:** `answer-result` is a private ack to the submitting player only. The correct answer is never sent until `answer-reveal` is broadcast to everyone simultaneously.

### Score update timing

Scores are **not** updated at submit time. `GameService.submitAnswer()` only records the answer and `timeTaken`. Points (100 per correct answer) are awarded inside `GameService.revealAnswers()` when the timer fires or all players have answered.

### Tiebreaker

`game-ended` players are sorted by `score DESC`, then by `sum(answers.timeTaken) ASC`. `timeTaken` (ms) is stored on each `IPlayerAnswer` at submit time as `Date.now() - game.questionStartTime`.

## Logging Standards

### API Logging
API calls are logged at the start of each controller method using `logger.api()`.

Format: `[timestamp] [API] <METHOD> <PATH> <PARAMS>`

```typescript
public async createGame(req: Request, res: Response): Promise<void> {
  logger.api('POST', '/api/games', { nickname: req.body.hostNickname });
  // ...
}
```

### Socket Logging
Socket events are logged in the `.socket.ts` file using `logger.socket()`.

Format: `[timestamp] [SOCKET] <EVENT> <PARAMS>`

```typescript
socket.on('join-game', async (data) => {
  logger.socket('join-game', { gameCode: data.code });
  await handler.joinGame(data);
});
```

### Error Logging
Errors are logged with context using `logger.error()`.

```typescript
catch (error) {
  logger.error('POST /api/games', error);
  res.status(500).json({ error: 'Failed to create game' });
}
```

## Model Files

Model files contain:
- TypeScript interfaces
- Mongoose schema definition
- Mongoose model export

```typescript
// game.model.ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IPlayer {
  id: string;
  nickname: string;
  score: number;
}

export interface IGameSession extends Document {
  code: string;
  players: IPlayer[];
  questionStartTime: number | null; // null = reveal already fired
}

const GameSessionSchema: Schema = new Schema<IGameSession>({
  code: { type: String, required: true, unique: true },
  questionStartTime: { type: Number, default: null },
});

export const GameSession = mongoose.model<IGameSession>('GameSession', GameSessionSchema);
```

## Import Order

Maintain consistent import ordering:

1. Node.js built-ins
2. External packages (express, mongoose, socket.io)
3. Shared utilities and middleware
4. Feature-specific imports (same feature)
5. Cross-feature imports

```typescript
// Example
import { Request, Response, Router } from 'express';
import mongoose from 'mongoose';

import { logger } from '../shared/logger.js';
import { adminAuth } from '../shared/middleware/admin-auth.middleware.js';

import { GameSession, IGameSession } from './game.model.js';

import { Question } from '../questions/question.model.js';
```

## Controller Method Binding

When using class methods as Express route handlers, you must bind them in the constructor to preserve the `this` context:

```typescript
export class GameController {
  constructor() {
    this.createGame = this.createGame.bind(this);
    this.getGameByCode = this.getGameByCode.bind(this);
    this.joinGame = this.joinGame.bind(this);
  }
}
```

## Exported Members

- Models export interfaces and Mongoose model
- Controllers export class
- Routes export Router as default
- Socket files export registration function
- Socket handlers export class
