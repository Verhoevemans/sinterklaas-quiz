import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPlayerAnswer {
  questionId: string;
  selectedIndex: number;
  timestamp: number;
  isCorrect: boolean;
}

export interface IPlayer {
  id: string;
  nickname: string;
  score: number;
  answers: IPlayerAnswer[];
  isHost: boolean;
  socketId?: string;
}

export interface IGameSession extends Document {
  code: string;
  hostId: string;
  players: IPlayer[];
  questionIds: Types.ObjectId[];
  questionCount: number;
  currentQuestionIndex: number;
  state: 'lobby' | 'in-progress' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

const PlayerAnswerSchema: Schema = new Schema(
  {
    questionId: { type: String, required: true },
    selectedIndex: { type: Number, required: true },
    timestamp: { type: Number, required: true },
    isCorrect: { type: Boolean, required: true },
  },
  { _id: false }
);

const PlayerSchema: Schema = new Schema(
  {
    id: { type: String, required: true },
    nickname: { type: String, required: true, trim: true },
    score: { type: Number, default: 0 },
    answers: { type: [PlayerAnswerSchema], default: [] },
    isHost: { type: Boolean, default: false },
    socketId: { type: String },
  },
  { _id: false }
);

const GameSessionSchema: Schema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      match: /^\d{6}$/,
    },
    hostId: {
      type: String,
      required: true,
    },
    players: {
      type: [PlayerSchema],
      default: [],
    },
    questionIds: {
      type: [Schema.Types.ObjectId],
      ref: 'Question',
      default: [],
    },
    questionCount: {
      type: Number,
      required: true,
      min: 10,
      max: 20,
    },
    currentQuestionIndex: {
      type: Number,
      default: 0,
    },
    state: {
      type: String,
      enum: ['lobby', 'in-progress', 'completed'],
      default: 'lobby',
    },
  },
  {
    timestamps: true,
  }
);

// Index for finding games by code
GameSessionSchema.index({ code: 1 });

// Index for cleaning up old games
GameSessionSchema.index({ createdAt: 1 });

export const GameSession = mongoose.model<IGameSession>('GameSession', GameSessionSchema);
