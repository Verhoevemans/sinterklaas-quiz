import { Question } from '../../../shared/models';

export interface QuestionListResponse {
  questions: Question[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
