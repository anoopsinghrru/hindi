import { Router } from 'express';
import { Session } from '../models/Session.js';

const router = Router();

// GET /leaderboard - Dedicated leaderboard page
router.get('/', async (req, res) => {
  try {
    const sessionId = req.cookies ? req.cookies.session_id : null;
    let user = null;
    let mySession = null;

    if (sessionId) {
      mySession = await Session.findById(sessionId).populate('userId');
      if (mySession && mySession.userId) {
        user = mySession.userId;
      }
    }

    const leaderboard = await Session.find({ isCompleted: true })
      .populate('userId', 'name email')
      .sort({ totalScore: -1, totalTimeSpent: 1 })
      .limit(50);

    res.render('leaderboard', {
      user: user,
      mySession: mySession && mySession.isCompleted ? mySession : null,
      leaderboard: leaderboard,
    });
  } catch (error) {
    console.error('Leaderboard page error:', error);
    res.status(500).send('सर्वर त्रुटि।');
  }
});

export default router;
