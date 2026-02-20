import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion extends Document {
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  questionType: 'multiple-choice';
  imageUrl?: string;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema: Schema = new Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (v: string[]) => v.length === 4,
        message: 'Questions must have exactly 4 options',
      },
    },
    correctAnswerIndex: {
      type: Number,
      required: true,
      min: 0,
      max: 3,
    },
    explanation: {
      type: String,
      required: true,
      trim: true,
    },
    questionType: {
      type: String,
      enum: ['multiple-choice'],
      default: 'multiple-choice',
    },
    imageUrl: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying of active questions
QuestionSchema.index({ isActive: 1, isDeleted: 1 });

export const Question = mongoose.model<IQuestion>('Question', QuestionSchema);
