import { Server, Socket } from 'socket.io';
import { GameSession, IGameSession, IPlayer, IPlayerAnswer } from '../models/GameSession.js';
import { Question, IQuestion } from '../models/Question.js';

interface JoinGameData {
  gameCode: string;
  playerId: string;
}

interface SubmitAnswerData {
  gameCode: string;
  playerId: string;
  questionId: string;
  selectedIndex: number;
}

interface GameActionData {
  gameCode: string;
  playerId: string;
}

export function setupGameSocket(io: Server): void {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id);

    // Join a game room
    socket.on('join-game', async (data: JoinGameData) => {
      try {
        const { gameCode, playerId } = data;

        const game: IGameSession | null = await GameSession.findOne({ code: gameCode });

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        const player: IPlayer | undefined = game.players.find((p) => p.id === playerId);

        if (!player) {
          socket.emit('error', { message: 'Player not found in game' });
          return;
        }

        // Update player's socket ID
        player.socketId = socket.id;
        await game.save();

        // Join the game room
        socket.join(gameCode);

        // Notify other players
        socket.to(gameCode).emit('player-joined', {
          player: {
            id: player.id,
            nickname: player.nickname,
            isHost: player.isHost,
          },
          playerCount: game.players.length,
        });

        // Send current game state to the joining player
        socket.emit('game-state', {
          game: {
            code: game.code,
            state: game.state,
            players: game.players.map((p) => ({
              id: p.id,
              nickname: p.nickname,
              score: p.score,
              isHost: p.isHost,
            })),
            currentQuestionIndex: game.currentQuestionIndex,
            questionCount: game.questionCount,
          },
        });

        console.log(`Player ${player.nickname} joined game ${gameCode}`);
      } catch (error) {
        console.error('Error joining game:', error);
        socket.emit('error', { message: 'Failed to join game' });
      }
    });

    // Host starts the game
    socket.on('start-game', async (data: GameActionData) => {
      try {
        const { gameCode, playerId } = data;

        const game: IGameSession | null = await GameSession.findOne({ code: gameCode });

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        const player: IPlayer | undefined = game.players.find((p) => p.id === playerId);

        if (!player || !player.isHost) {
          socket.emit('error', { message: 'Only host can start the game' });
          return;
        }

        if (game.players.length < 2) {
          socket.emit('error', { message: 'Need at least 2 players to start' });
          return;
        }

        if (game.state !== 'lobby') {
          socket.emit('error', { message: 'Game already started' });
          return;
        }

        game.state = 'in-progress';
        game.currentQuestionIndex = 0;
        await game.save();

        // Get first question
        const question: IQuestion | null = await Question.findById(game.questionIds[0]);

        if (!question) {
          socket.emit('error', { message: 'Failed to load question' });
          return;
        }

        // Broadcast game started to all players
        io.to(gameCode).emit('game-started', {
          question: {
            id: question._id,
            text: question.text,
            options: question.options,
            questionType: question.questionType,
            imageUrl: question.imageUrl,
          },
          questionIndex: 0,
          totalQuestions: game.questionCount,
        });

        console.log(`Game ${gameCode} started`);
      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('error', { message: 'Failed to start game' });
      }
    });

    // Player submits an answer
    socket.on('submit-answer', async (data: SubmitAnswerData) => {
      try {
        const { gameCode, playerId, questionId, selectedIndex } = data;

        const game: IGameSession | null = await GameSession.findOne({ code: gameCode });

        if (!game || game.state !== 'in-progress') {
          socket.emit('error', { message: 'Game not in progress' });
          return;
        }

        const player: IPlayer | undefined = game.players.find((p) => p.id === playerId);

        if (!player) {
          socket.emit('error', { message: 'Player not found' });
          return;
        }

        // Check if player already answered this question
        const alreadyAnswered: boolean = player.answers.some((a) => a.questionId === questionId);

        if (alreadyAnswered) {
          socket.emit('error', { message: 'Already answered this question' });
          return;
        }

        // Get the current question to check if answer is correct
        const question: IQuestion | null = await Question.findById(questionId);

        if (!question) {
          socket.emit('error', { message: 'Question not found' });
          return;
        }

        const isCorrect: boolean = selectedIndex === question.correctAnswerIndex;
        const timestamp: number = Date.now();

        const answer: IPlayerAnswer = {
          questionId,
          selectedIndex,
          timestamp,
          isCorrect,
        };

        player.answers.push(answer);
        if (isCorrect) {
          player.score += 100;
        }

        await game.save();

        // Notify the player of their result
        socket.emit('answer-result', {
          isCorrect,
          correctAnswerIndex: question.correctAnswerIndex,
          explanation: question.explanation,
          newScore: player.score,
        });

        // Broadcast that player has answered (without revealing if correct)
        socket.to(gameCode).emit('player-answered', {
          playerId: player.id,
          nickname: player.nickname,
        });

        console.log(`Player ${player.nickname} answered question in game ${gameCode}`);
      } catch (error) {
        console.error('Error submitting answer:', error);
        socket.emit('error', { message: 'Failed to submit answer' });
      }
    });

    // Host advances to next question
    socket.on('next-question', async (data: GameActionData) => {
      try {
        const { gameCode, playerId } = data;

        const game: IGameSession | null = await GameSession.findOne({ code: gameCode });

        if (!game || game.state !== 'in-progress') {
          socket.emit('error', { message: 'Game not in progress' });
          return;
        }

        const player: IPlayer | undefined = game.players.find((p) => p.id === playerId);

        if (!player || !player.isHost) {
          socket.emit('error', { message: 'Only host can advance questions' });
          return;
        }

        const nextIndex: number = game.currentQuestionIndex + 1;

        if (nextIndex >= game.questionIds.length) {
          // Game is over
          game.state = 'completed';
          await game.save();

          // Get all questions for final results
          const questions: IQuestion[] = await Question.find({
            _id: { $in: game.questionIds },
          });

          io.to(gameCode).emit('game-ended', {
            players: game.players
              .map((p) => ({
                id: p.id,
                nickname: p.nickname,
                score: p.score,
                answers: p.answers,
                isHost: p.isHost,
              }))
              .sort((a, b) => b.score - a.score),
            questions: questions.map((q) => ({
              id: q._id,
              text: q.text,
              options: q.options,
              correctAnswerIndex: q.correctAnswerIndex,
              explanation: q.explanation,
            })),
          });

          console.log(`Game ${gameCode} ended`);
          return;
        }

        game.currentQuestionIndex = nextIndex;
        await game.save();

        const question: IQuestion | null = await Question.findById(game.questionIds[nextIndex]);

        if (!question) {
          socket.emit('error', { message: 'Failed to load question' });
          return;
        }

        // Broadcast new question to all players
        io.to(gameCode).emit('question-changed', {
          question: {
            id: question._id,
            text: question.text,
            options: question.options,
            questionType: question.questionType,
            imageUrl: question.imageUrl,
          },
          questionIndex: nextIndex,
          totalQuestions: game.questionCount,
          scores: game.players.map((p) => ({
            id: p.id,
            nickname: p.nickname,
            score: p.score,
          })),
        });

        console.log(`Game ${gameCode} advanced to question ${nextIndex + 1}`);
      } catch (error) {
        console.error('Error advancing question:', error);
        socket.emit('error', { message: 'Failed to advance question' });
      }
    });

    // Host ends game early
    socket.on('end-game', async (data: GameActionData) => {
      try {
        const { gameCode, playerId } = data;

        const game: IGameSession | null = await GameSession.findOne({ code: gameCode });

        if (!game) {
          socket.emit('error', { message: 'Game not found' });
          return;
        }

        const player: IPlayer | undefined = game.players.find((p) => p.id === playerId);

        if (!player || !player.isHost) {
          socket.emit('error', { message: 'Only host can end the game' });
          return;
        }

        game.state = 'completed';
        await game.save();

        const questions: IQuestion[] = await Question.find({
          _id: { $in: game.questionIds },
        });

        io.to(gameCode).emit('game-ended', {
          players: game.players
            .map((p) => ({
              id: p.id,
              nickname: p.nickname,
              score: p.score,
              answers: p.answers,
              isHost: p.isHost,
            }))
            .sort((a, b) => b.score - a.score),
          questions: questions.map((q) => ({
            id: q._id,
            text: q.text,
            options: q.options,
            correctAnswerIndex: q.correctAnswerIndex,
            explanation: q.explanation,
          })),
          endedEarly: true,
        });

        console.log(`Game ${gameCode} ended early by host`);
      } catch (error) {
        console.error('Error ending game:', error);
        socket.emit('error', { message: 'Failed to end game' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      console.log('Client disconnected:', socket.id);

      try {
        // Find the game this player was in
        const game: IGameSession | null = await GameSession.findOne({
          'players.socketId': socket.id,
        });

        if (game) {
          const player: IPlayer | undefined = game.players.find((p) => p.socketId === socket.id);

          if (player) {
            player.socketId = undefined;
            await game.save();

            // Notify other players
            socket.to(game.code).emit('player-left', {
              playerId: player.id,
              nickname: player.nickname,
            });

            console.log(`Player ${player.nickname} disconnected from game ${game.code}`);
          }
        }
      } catch (error) {
        console.error('Error handling disconnect:', error);
      }
    });
  });
}
