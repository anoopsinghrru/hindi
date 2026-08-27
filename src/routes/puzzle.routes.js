import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { WordState } from '../models/WordState.js';
import { Session } from '../models/Session.js';
import { puzzleData } from '../config/puzzleData.js';

const router = Router();

// GET /puzzle - Hydrates saved word states and renders the crossword answer pad / results view
router.get('/', requireAuth, async (req, res) => {
  try {
    const session = req.sessionData;
    const wordStates = await WordState.find({ sessionId: session._id });

    const wordStateMap = {};
    wordStates.forEach((ws) => {
      wordStateMap[ws.wordId] = {
        wordId: ws.wordId,
        currentGuess: ws.currentGuess || [],
        isCorrect: ws.isCorrect,
        totalTimeSpent: ws.totalTimeSpent,
      };
    });

    if (session.isCompleted) {
      return res.redirect('/leaderboard');
    }

    res.render('puzzle', {
      user: req.user,
      session: session,
      puzzleData: puzzleData,
      wordStateMap: wordStateMap,
      isCompleted: session.isCompleted,
    });
  } catch (error) {
    console.error('Error fetching puzzle page:', error);
    res.status(500).send('सर्वर त्रुटि। कृपया पुनः प्रयास करें।');
  }
});

export default router;
