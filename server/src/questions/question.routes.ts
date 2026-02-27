import { Router } from 'express';

import { QuestionController } from './question.controller.js';
import { adminAuth } from '../shared/middleware/admin-auth.middleware.js';

const router: Router = Router();
const controller: QuestionController = new QuestionController();

// All routes require admin authentication
router.use(adminAuth);

router.route('/')
  .get(controller.listQuestions)
  .post(controller.createQuestion);

router.route('/:id')
  .get(controller.getQuestionById)
  .put(controller.updateQuestion)
  .delete(controller.deleteQuestion);

router.route('/:id/restore')
  .post(controller.restoreQuestion);

export default router;
