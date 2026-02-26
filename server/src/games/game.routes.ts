import { Router } from 'express';
import { GameController } from './game.controller.js';

const router: Router = Router();
const controller: GameController = new GameController();

router.route('/')
  .post(controller.createGame);

router.route('/:code')
  .get(controller.getGameByCode);

router.route('/:code/join')
  .post(controller.joinGame);

router.route('/:code/questions/:index')
  .get(controller.getQuestionByIndex);

export default router;
