import { Router, Request, Response } from 'express';
import { Question, IQuestion } from '../models/Question.js';
import { adminAuth } from '../middleware/adminAuth.js';

const router: Router = Router();

// All routes require admin authentication
router.use(adminAuth);

// GET /api/admin/questions - List questions with pagination
router.get('/', async (req: Request, res: Response): Promise<void> => {
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
    console.error('Error fetching questions:', error);
    res.status(500).json({ error: 'Failed to fetch questions' });
  }
});

// GET /api/admin/questions/:id - Get single question
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const question: IQuestion | null = await Question.findById(req.params.id);

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    res.json(question);
  } catch (error) {
    console.error('Error fetching question:', error);
    res.status(500).json({ error: 'Failed to fetch question' });
  }
});

// POST /api/admin/questions - Create question
router.post('/', async (req: Request, res: Response): Promise<void> => {
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
    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// PUT /api/admin/questions/:id - Update question
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { text, options, correctAnswerIndex, explanation, imageUrl, isActive } = req.body;

    const question: IQuestion | null = await Question.findById(req.params.id);

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    if (options && (!Array.isArray(options) || options.length !== 4)) {
      res.status(400).json({ error: 'Options must be an array of 4 strings' });
      return;
    }

    if (correctAnswerIndex !== undefined && (correctAnswerIndex < 0 || correctAnswerIndex > 3)) {
      res.status(400).json({ error: 'correctAnswerIndex must be between 0 and 3' });
      return;
    }

    if (text !== undefined) question.text = text;
    if (options !== undefined) question.options = options;
    if (correctAnswerIndex !== undefined) question.correctAnswerIndex = correctAnswerIndex;
    if (explanation !== undefined) question.explanation = explanation;
    if (imageUrl !== undefined) question.imageUrl = imageUrl;
    if (isActive !== undefined) question.isActive = isActive;

    await question.save();
    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /api/admin/questions/:id - Soft delete question
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const question: IQuestion | null = await Question.findById(req.params.id);

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    question.isDeleted = true;
    question.isActive = false;
    await question.save();

    res.json({ message: 'Question deleted successfully' });
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// POST /api/admin/questions/:id/restore - Restore deleted question
router.post('/:id/restore', async (req: Request, res: Response): Promise<void> => {
  try {
    const question: IQuestion | null = await Question.findById(req.params.id);

    if (!question) {
      res.status(404).json({ error: 'Question not found' });
      return;
    }

    question.isDeleted = false;
    await question.save();

    res.json(question);
  } catch (error) {
    console.error('Error restoring question:', error);
    res.status(500).json({ error: 'Failed to restore question' });
  }
});

export default router;
