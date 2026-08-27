import { Router } from 'express';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { WordState } from '../models/WordState.js';
import { puzzleData } from '../config/puzzleData.js';

const router = Router();

// GET / - Login Page (Automatically redirects if already logged in on this device)
router.get('/', async (req, res) => {
  const sessionId = req.cookies ? req.cookies.session_id : null;
  if (sessionId) {
    const existingSession = await Session.findById(sessionId);
    if (existingSession) {
      if (existingSession.isCompleted) {
        return res.redirect('/leaderboard');
      }
      return res.redirect('/puzzle');
    }
  }
  res.render('login', { error: null });
});

// POST /login - Handle user login and set permanent device session
router.post('/login', async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.render('login', { error: 'कृपया अपना नाम और ईमेल दर्ज करें।' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Find or create User
    let user = await User.findOne({ email: cleanEmail });
    if (!user) {
      user = await User.create({ name: cleanName, email: cleanEmail });
    } else {
      user.name = cleanName;
      await user.save();
    }

    // Check for an active (incomplete) session or create a new session
    let session = await Session.findOne({ userId: user._id, isCompleted: false });
    if (!session) {
      // Check if user has any completed session
      const completedSession = await Session.findOne({ userId: user._id, isCompleted: true });
      if (completedSession) {
        // Set persistent cookie for existing completed session and redirect to leaderboard
        res.cookie('session_id', completedSession._id.toString(), {
          httpOnly: true,
          maxAge: 10 * 365 * 24 * 60 * 60 * 1000, // 10 years persistent device login
        });
        return res.redirect('/leaderboard');
      }

      session = await Session.create({
        userId: user._id,
        startTime: new Date(),
        isCompleted: false,
      });

      // Initialize WordState documents for all 37 words
      const wordStateDocs = Object.values(puzzleData.words).map((word) => ({
        sessionId: session._id,
        wordId: word.id,
        isCorrect: false,
        totalTimeSpent: 0,
        currentGuess: new Array(word.length).fill(''),
      }));

      await WordState.insertMany(wordStateDocs);
    }

    // Set permanent HTTP cookie for device persistence (10 years)
    res.cookie('session_id', session._id.toString(), {
      httpOnly: true,
      maxAge: 10 * 365 * 24 * 60 * 60 * 1000,
    });

    return res.redirect('/puzzle');
  } catch (error) {
    console.error('Login error:', error);
    return res.render('login', { error: 'लॉगिन में त्रुटि हुई। कृपया पुनः प्रयास करें।' });
  }
});

// GET /logout - Clear session cookie and redirect to login page
router.get('/logout', (req, res) => {
  res.clearCookie('session_id');
  res.redirect('/');
});

export default router;
