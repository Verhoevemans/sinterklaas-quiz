export type QuestionType = 'multiple-choice' | 'true-false' | 'image-based' | 'interactive';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswerIndex: number;
  explanation: string;
  questionType: QuestionType;
  imageUrl?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
