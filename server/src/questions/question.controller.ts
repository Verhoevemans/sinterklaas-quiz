import { Request, Response } from 'express';

import { logger } from '../shared/logger.js';
import { Question, IQuestion } from './question.model.js';

export class QuestionController {
  constructor() {
    // Bind all route handler methods to preserve 'this' context
    this.listQuestions = this.listQuestions.bind(this);
    this.getQuestionById = this.getQuestionById.bind(this);
    this.createQuestion = this.createQuestion.bind(this);
    this.updateQuestion = this.updateQuestion.bind(this);
    this.deleteQuestion = this.deleteQuestion.bind(this);
    this.restoreQuestion = this.restoreQuestion.bind(this);
  }

  /**
   * GET /api/admin/questions - List questions with pagination
   */
  public async listQuestions(req: Request, res: Response): Promise<void> {
    logger.api('GET', '/api/admin/questions', {
      page: req.query.page,
      limit: req.query.limit,
      includeDeleted: req.query.includeDeleted,
    });

    try {
      const page: number = parseInt(req.query.page as string) || 1;
      const limit: number = parseInt(req.query.limit as string) || 20;
      const skip: number = (page - 1) * limit;
      const includeDeleted: boolean = req.query.includeDeleted === 'true';

      const filter: Record<string, unknown> = includeDeleted ? {} : { isDeleted: false };

      const [questions, total] = await Promise.all([
        Question.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
        Question.countDocuments(filter),
      ]);

      res.json({
        questions,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      logger.error('GET /api/admin/questions', error);
      res.status(500).json({ error: 'Failed to fetch questions' });
    }
  }

  /**
   * GET /api/admin/questions/:id - Get single question
   */
  public async getQuestionById(req: Request, res: Response): Promise<void> {
    const id: string = req.params.id;
    logger.api('GET', `/api/admin/questions/${id}`);

    try {
      const question: IQuestion | null = await Question.findById(id);

      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      res.json(question);
    } catch (error) {
      logger.error(`GET /api/admin/questions/${id}`, error);
      res.status(500).json({ error: 'Failed to fetch question' });
    }
  }

  /**
   * POST /api/admin/questions - Create question
   */
  public async createQuestion(req: Request, res: Response): Promise<void> {
    logger.api('POST', '/api/admin/questions', { text: req.body.text?.substring(0, 50) });

    try {
      const { text, options, correctAnswerIndex, explanation, imageUrl, isActive } = req.body;

      if (!text || !options || correctAnswerIndex === undefined || !explanation) {
        res.status(400).json({ error: 'Missing required fields' });
        return;
      }

      if (!Array.isArray(options) || options.length !== 4) {
        res.status(400).json({ error: 'Options must be an array of 4 strings' });
        return;
      }

      if (correctAnswerIndex < 0 || correctAnswerIndex > 3) {
        res.status(400).json({ error: 'correctAnswerIndex must be between 0 and 3' });
        return;
      }

      const question: IQuestion = new Question({
        text,
        options,
        correctAnswerIndex,
        explanation,
        imageUrl,
        isActive: isActive !== false,
      });

      await question.save();

      logger.info('Question created', { id: question._id });

      res.status(201).json(question);
    } catch (error) {
      logger.error('POST /api/admin/questions', error);
      res.status(500).json({ error: 'Failed to create question' });
    }
  }

  /**
   * PUT /api/admin/questions/:id - Update question
   */
  public async updateQuestion(req: Request, res: Response): Promise<void> {
    const id: string = req.params.id;
    logger.api('PUT', `/api/admin/questions/${id}`, { fields: Object.keys(req.body) });

    try {
      const { text, options, correctAnswerIndex, explanation, imageUrl, isActive } = req.body;

      if (options && (!Array.isArray(options) || options.length !== 4)) {
        res.status(400).json({ error: 'Options must be an array of 4 strings' });
        return;
      }

      if (correctAnswerIndex !== undefined && (correctAnswerIndex < 0 || correctAnswerIndex > 3)) {
        res.status(400).json({ error: 'correctAnswerIndex must be between 0 and 3' });
        return;
      }

      const question: IQuestion | null = await Question.findById(id);

      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      if (text !== undefined) question.text = text;
      if (options !== undefined) question.options = options;
      if (correctAnswerIndex !== undefined) question.correctAnswerIndex = correctAnswerIndex;
      if (explanation !== undefined) question.explanation = explanation;
      if (imageUrl !== undefined) question.imageUrl = imageUrl;
      if (isActive !== undefined) question.isActive = isActive;

      await question.save();

      logger.info('Question updated', { id });

      res.json(question);
    } catch (error) {
      logger.error(`PUT /api/admin/questions/${id}`, error);
      res.status(500).json({ error: 'Failed to update question' });
    }
  }

  /**
   * DELETE /api/admin/questions/:id - Soft delete question
   */
  public async deleteQuestion(req: Request, res: Response): Promise<void> {
    const id: string = req.params.id;
    logger.api('DELETE', `/api/admin/questions/${id}`);

    try {
      const question: IQuestion | null = await Question.findById(id);

      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      question.isDeleted = true;
      question.isActive = false;
      await question.save();

      logger.info('Question deleted', { id });

      res.json({ message: 'Question deleted successfully' });
    } catch (error) {
      logger.error(`DELETE /api/admin/questions/${id}`, error);
      res.status(500).json({ error: 'Failed to delete question' });
    }
  }

  /**
   * POST /api/admin/questions/:id/restore - Restore deleted question
   */
  public async restoreQuestion(req: Request, res: Response): Promise<void> {
    const id: string = req.params.id;
    logger.api('POST', `/api/admin/questions/${id}/restore`);

    try {
      const question: IQuestion | null = await Question.findById(id);

      if (!question) {
        res.status(404).json({ error: 'Question not found' });
        return;
      }

      question.isDeleted = false;
      await question.save();

      logger.info('Question restored', { id });

      res.json(question);
    } catch (error) {
      logger.error(`POST /api/admin/questions/${id}/restore`, error);
      res.status(500).json({ error: 'Failed to restore question' });
    }
  }
}
