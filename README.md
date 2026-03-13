# Sinterklaas Quiz

A real-time multiplayer quiz app built for Sinterklaas evening. A host presents questions on a shared screen while players join on their phones and answer within a 20-second window. Scores are revealed simultaneously after each question.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Angular 20.3 — zoneless, signals, standalone components |
| Backend | Node.js + Express + Socket.io |
| Database | MongoDB (Mongoose) |

Frontend runs on `:4200`, backend on `:3000`.

## Getting started

```bash
# Backend
cd server && npm install
npm run seed      # seed the database with questions
npm run dev       # start dev server

# Frontend (separate terminal)
cd client && npm install
npm start
```

## Project structure

```
sinterklaas-quiz/
├── client/                  # Angular frontend
│   └── src/
│       ├── styles.css       # Global styles + shared CSS classes
│       └── app/
│           ├── pages/
│           │   ├── home/
│           │   ├── lobby/
│           │   ├── game/
│           │   │   ├── game.ts / .html / .css   # Parent: routing + countdown
│           │   │   ├── host-view/               # TV/laptop presenter view
│           │   │   └── player-view/             # Mobile player view
│           │   └── results/
│           ├── services/
│           │   ├── game-state.service.ts        # All game state + socket effects
│           │   ├── socket.service.ts            # Socket.io client + event signals
│           │   └── api.service.ts
│           └── models/                          # Shared TypeScript interfaces
└── server/                  # Node.js backend
    └── src/
        └── games/           # See server/SERVER_ARCHITECTURE.md
```

## Game flow

1. Host creates a game → gets a room code
2. Players join with the code and a nickname
3. Host starts the game
4. Each question: 20-second timer → players submit answers → timer fires (or all answered) → answer + scores revealed to everyone simultaneously
5. Host advances to next question
6. After the last question → results page
