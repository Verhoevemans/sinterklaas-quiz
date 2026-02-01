# Sinterklaas Quiz App - Specifications & User Stories

## 🎯 High-Level Overview

**Purpose**: Family entertainment quiz app for Sinterklaas celebrations
**Target Users**: Mixed age groups (children to adults)
**Gameplay**: Real-time multiplayer on multiple devices
**Tech Stack**: Angular 20.3 (frontend) + Node.js backend with WebSockets
**Visual Style**: Playful/cartoonish with Sinterklaas theme

---

## 📋 Core Features (MVP)

### 1. Game Lobby & Room Management
- Create/join game rooms with unique codes
- Players join with nicknames (no authentication for MVP)
- Host can control game flow with automatic fallbacks
- Real-time player list updates

### 2. Quiz Gameplay
- 10-20 multiple choice questions per game
- Random mix of questions (no categories/difficulty for MVP)
- Live scoring visible to all players
- Fixed points for correct answers (100 points)
- Speed tracked as tiebreaker (stored but not scored)
- Answer reveal with educational explanations after each question

### 3. End Game Experience
- Final leaderboard with rankings
- Winner celebration animation
- Game statistics (fastest answers, accuracy, etc.)
- Play again option

### 4. Admin Interface
- Separate admin panel to manage questions
- Add/edit/delete questions
- Preview questions before publishing
- Question structure supports future expansion (images, different types)

### 5. Responsive Design
- Mobile-first approach with full desktop support
- Touch-friendly interactions
- Works seamlessly on phones, tablets, and desktops

---

## 👥 User Stories & Requirements

### **Epic 1: Player Onboarding**

**US1.1** - Join Game
*As a player, I want to enter a game code and nickname so I can join a quiz game*

**Acceptance Criteria:**
- Input field for 6-digit game code
- Input field for nickname (3-20 characters)
- Validation: code exists, nickname unique within game
- Error messages for invalid codes or duplicate names
- Automatically enter lobby after successful join

**US1.2** - Create Game
*As a host, I want to create a new game room so other players can join*

**Acceptance Criteria:**
- Generate unique 6-digit game code
- Host enters their nickname
- Display game code prominently for sharing
- Show "waiting for players" state
- Option to configure number of questions (10, 15, or 20)

**US1.3** - Game Lobby
*As a player in the lobby, I want to see who else has joined so I know when we're ready*

**Acceptance Criteria:**
- Real-time list of joined players
- Show total player count
- Host has special indicator
- Players can leave (removed from list)
- Host can start game when 2+ players present

---

### **Epic 2: Quiz Gameplay**

**US2.1** - Question Display
*As a player, I want to see questions clearly so I can answer them*

**Acceptance Criteria:**
- Question text displayed prominently
- 4 multiple choice options (A/B/C/D)
- Question number and total shown (e.g., "3/15")
- Current score visible
- Responsive layout on all devices

**US2.2** - Answer Submission
*As a player, I want to select and submit my answer so it's recorded*

**Acceptance Criteria:**
- Click/tap to select option (highlight selection)
- Auto-submit after selection OR explicit submit button
- Record timestamp of answer
- Disable answer options after submission
- Show "waiting for others" indicator after answering
- Visual feedback for submitted state

**US2.3** - Answer Reveal
*As a player, I want to see the correct answer and explanation so I can learn*

**Acceptance Criteria:**
- Highlight correct answer in green
- Show incorrect answers in red (if player selected)
- Display educational explanation text
- Show who answered correctly (optional: with timing)
- Transition to next question after delay OR host trigger

**US2.4** - Live Scoring
*As a player, I want to see updated scores after each question so I know my standing*

**Acceptance Criteria:**
- Correct answer: +100 points
- Incorrect/no answer: 0 points
- Display points earned this question
- Show updated leaderboard (compact view during game)
- Smooth score animations

---

### **Epic 3: Game Completion**

**US3.1** - Final Leaderboard
*As a player, I want to see final rankings so I know how I did*

**Acceptance Criteria:**
- Ranked list of all players (1st, 2nd, 3rd, etc.)
- Show final scores
- Tiebreaker: fastest average response time
- Podium visual for top 3

**US3.2** - Winner Celebration
*As the winner, I want special recognition so it feels rewarding*

**Acceptance Criteria:**
- Confetti/celebration animation for winner
- Winner's name prominently displayed
- Special message/trophy graphic
- Different message for ties

**US3.3** - Game Statistics
*As a player, I want to see interesting stats so I can reflect on my performance*

**Acceptance Criteria:**
- Individual accuracy percentage
- Fastest correct answer time
- Longest streak of correct answers
- Hardest question (lowest % correct across all players)
- Most answered question (fastest)

**US3.4** - Play Again
*As a player, I want to quickly start a new game so the fun continues*

**Acceptance Criteria:**
- "Play Again" button on results screen
- Keeps same players in lobby
- Generates new game code
- Host can adjust question count
- New random question set

---

### **Epic 4: Host Controls**

**US4.1** - Start Game
*As a host, I want to start the game when everyone's ready*

**Acceptance Criteria:**
- "Start Game" button in lobby (requires 2+ players)
- Broadcast game start to all players
- Load first question simultaneously for all
- Countdown before first question (3-2-1)

**US4.2** - Game Pacing Control
*As a host, I want to control when we move to the next question*

**Acceptance Criteria:**
- Manual "Next Question" button after answer reveal
- Auto-advance option (configurable, e.g., 10 seconds)
- Override auto-advance with manual control
- Visual indicator of auto-advance timer

**US4.3** - End Game Early
*As a host, I want to end the game early if needed*

**Acceptance Criteria:**
- "End Game" button available during gameplay
- Confirmation dialog before ending
- Jump to final results with current scores
- Notify all players game was ended early

---

### **Epic 5: Admin Panel**

**US5.1** - Admin Authentication
*As an admin, I want to securely log in so only authorized users can manage questions*

**Acceptance Criteria:**
- Simple password protection (can be hardcoded for MVP)
- Login page separate from main app
- Session persists during session
- Logout option

**US5.2** - Question List Management
*As an admin, I want to view all questions so I can manage content*

**Acceptance Criteria:**
- Paginated list of all questions
- Search/filter functionality
- Show question text, correct answer, status (active/inactive)
- Sort by date created, modified
- Quick edit/delete actions

**US5.3** - Add Question
*As an admin, I want to add new questions so the quiz stays fresh*

**Acceptance Criteria:**
- Form with fields: question text, 4 options, correct answer, explanation
- Character limits and validation
- Preview before saving
- Optional: image upload (prepared for future, not required for MVP)
- Mark as active/inactive
- Save to database

**US5.4** - Edit Question
*As an admin, I want to edit existing questions so I can fix mistakes or improve content*

**Acceptance Criteria:**
- Load existing question data into form
- All fields editable
- Show last modified timestamp
- Save changes with confirmation
- Update reflected immediately in question pool

**US5.5** - Delete Question
*As an admin, I want to delete outdated questions*

**Acceptance Criteria:**
- Delete button with confirmation dialog
- Soft delete (mark as deleted, don't remove from DB)
- Deleted questions excluded from game question pool
- Option to restore deleted questions

---

### **Epic 6: Backend & Real-Time Sync**

**US6.1** - WebSocket Connection
*As a player, I want real-time updates so I see game changes instantly*

**Acceptance Criteria:**
- WebSocket connection established on game join
- Reconnection logic for dropped connections
- Heartbeat to detect disconnections
- Graceful handling of connection loss (show reconnecting state)

**US6.2** - Game State Synchronization
*As a player, I want consistent game state across all devices*

**Acceptance Criteria:**
- Player joins/leaves synced in real-time
- Question progression synced
- Answer submissions synced
- Score updates synced
- Game end synced

**US6.3** - Question Data API
*As the frontend, I need to fetch questions from the backend*

**Acceptance Criteria:**
- REST endpoint to fetch random question set (10-20 questions)
- Ensure no duplicate questions in a game
- Return question structure: id, text, options[], correctAnswer, explanation
- Questions served from database

**US6.4** - Admin API
*As the admin panel, I need CRUD operations for questions*

**Acceptance Criteria:**
- POST /admin/questions - Create question
- GET /admin/questions - List questions (with pagination/filters)
- PUT /admin/questions/:id - Update question
- DELETE /admin/questions/:id - Soft delete question
- Authentication middleware on all admin routes

---

## 🏗️ Architecture Overview

### Frontend (Angular 20.3)
- **Routing**: `/` (home), `/lobby/:code`, `/game/:code`, `/admin`
- **Key Components**:
  - JoinGame, CreateGame, Lobby, QuizGame, Results, Admin Dashboard
- **State Management**: Angular Signals for local state
- **Real-time**: WebSocket service using native WebSocket or Socket.io client

### Backend (Node.js)
- **Framework**: Express.js + Socket.io for WebSockets
- **Database**: PostgreSQL or MongoDB for questions and game sessions
- **Key Endpoints**:
  - Game CRUD, Question CRUD, Admin auth
- **Real-time Events**:
  - player-joined, player-left, game-started, answer-submitted, question-revealed, game-ended

### Data Models

**Question**:
```typescript
{
  id: string;
  text: string;
  options: string[]; // length 4
  correctAnswerIndex: number; // 0-3
  explanation: string;
  questionType: 'multiple-choice'; // extensible
  imageUrl?: string; // for future
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

**Game Session**:
```typescript
{
  id: string;
  code: string; // 6 digits
  hostId: string;
  players: Player[];
  questionCount: number;
  currentQuestionIndex: number;
  questions: Question[];
  state: 'lobby' | 'in-progress' | 'completed';
  createdAt: Date;
}
```

**Player**:
```typescript
{
  id: string;
  nickname: string;
  score: number;
  answers: {
    questionId: string;
    selectedIndex: number;
    timestamp: number;
    isCorrect: boolean;
  }[];
  isHost: boolean;
}
```

---

## 🎨 Design Notes

- **Color Palette**: Red (#C8102E), Gold (#FFD700), White, Warm Brown
- **Fonts**: Playful but readable (e.g., Fredoka, Quicksand)
- **Illustrations**: Sinterklaas, Amerigo horse, gifts, pepernoten
- **Animations**: Smooth transitions, celebration effects, loading states

---

## 🚀 Development Phases

**Phase 1**: Core game loop (join, play, results) - Frontend only with mock data
**Phase 2**: Backend setup (Node.js, database, APIs)
**Phase 3**: Real-time multiplayer with WebSockets
**Phase 4**: Admin panel
**Phase 5**: Polish (animations, responsive design, testing)

---

## 📝 Notes

This plan provides a solid foundation for the Sinterklaas Quiz app with clear, actionable user stories ready to be implemented step by step. The architecture is designed to be extensible, allowing for future enhancements like different question types, authentication, and more sophisticated scoring systems.
