import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware.js';
import { WordState } from '../models/WordState.js';
import { Session } from '../models/Session.js';
import { puzzleData } from '../config/puzzleData.js';

const router = Router();

// GET /api/health - Health check endpoint for keep-alive & monitoring
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// POST /api/focus-word - Starts / logs focus timer for a word
router.post('/focus-word', requireAuth, async (req, res) => {
  try {
    if (req.sessionData.isCompleted) {
      return res.status(403).json({ success: false, message: 'पहेली पहले ही सबमिट की जा चुकी है।' });
    }

    const { wordId } = req.body;
    if (!wordId || !puzzleData.words[wordId]) {
      return res.status(400).json({ success: false, message: 'अमान्य शब्द आईडी' });
    }

    const sessionId = req.sessionData._id;
    const now = new Date();

    await WordState.findOneAndUpdate(
      { sessionId, wordId },
      { lastFocusStart: now },
      { upsert: true, new: true }
    );

    return res.json({ success: true, timestamp: now.getTime() });
  } catch (error) {
    console.error('Focus word error:', error);
    return res.status(500).json({ success: false, message: 'सर्वर त्रुटि' });
  }
});

// POST /api/submit-word - Calculates time spent, validates answer, auto-saves word state
router.post('/submit-word', requireAuth, async (req, res) => {
  try {
    if (req.sessionData.isCompleted) {
      return res.status(403).json({ success: false, message: 'पहेली पहले ही सबमिट की जा चुकी है।' });
    }

    const { wordId, currentGuess, startTime, blurTime } = req.body;

    const wordDef = puzzleData.words[wordId];
    if (!wordId || !wordDef) {
      return res.status(400).json({ success: false, message: 'अमान्य शब्द आईडी' });
    }

    const sessionId = req.sessionData._id;

    // Calculate time spent on this focus session
    let timeDeltaSec = 0;
    if (startTime && blurTime) {
      const startMs = new Date(startTime).getTime();
      const blurMs = new Date(blurTime).getTime();
      if (!isNaN(startMs) && !isNaN(blurMs) && blurMs >= startMs) {
        timeDeltaSec = Math.round((blurMs - startMs) / 1000);
      }
    }

    // Validate current guess array against puzzle answers
    const userGuessArray = Array.isArray(currentGuess) ? currentGuess : [];
    const normalizedGuess = [];
    for (let i = 0; i < wordDef.length; i++) {
      normalizedGuess.push(userGuessArray[i] || '');
    }

    // Check if correct
    let isCorrect = true;
    for (let i = 0; i < wordDef.length; i++) {
      if (normalizedGuess[i].trim() !== wordDef.chars[i].trim()) {
        isCorrect = false;
        break;
      }
    }

    // Update database
    const wordState = await WordState.findOne({ sessionId, wordId });
    if (wordState) {
      wordState.currentGuess = normalizedGuess;
      wordState.isCorrect = isCorrect;
      wordState.totalTimeSpent = (wordState.totalTimeSpent || 0) + timeDeltaSec;
      wordState.lastFocusStart = null;
      await wordState.save();
    } else {
      await WordState.create({
        sessionId,
        wordId,
        currentGuess: normalizedGuess,
        isCorrect,
        totalTimeSpent: timeDeltaSec,
      });
    }

    return res.json({
      success: true,
      isCorrect,
      wordId,
      totalTimeSpent: wordState ? wordState.totalTimeSpent : timeDeltaSec,
    });
  } catch (error) {
    console.error('Submit word error:', error);
    return res.status(500).json({ success: false, message: 'सर्वर त्रुटि' });
  }
});

// POST /api/final-submit - Final submission of the crossword puzzle
router.post('/final-submit', requireAuth, async (req, res) => {
  try {
    const sessionId = req.sessionData._id;

    const session = await Session.findById(sessionId);
    if (!session) {
      return res.status(404).json({ success: false, message: 'सत्र नहीं मिला' });
    }

    if (session.isCompleted) {
      return res.json({
        success: true,
        message: 'पहेली पहले ही सबमिट की जा चुकी है',
        totalScore: session.totalScore,
        totalTimeSpent: session.totalTimeSpent,
        isCompleted: true,
      });
    }

    // Step 0: Sync any immediate client DOM wordStates payload
    const clientWordStates = req.body ? req.body.wordStates : null;
    if (clientWordStates && typeof clientWordStates === 'object') {
      for (const [wId, wData] of Object.entries(clientWordStates)) {
        if (wData && Array.isArray(wData.currentGuess)) {
          await WordState.findOneAndUpdate(
            { sessionId, wordId: wId },
            { currentGuess: wData.currentGuess },
            { upsert: true }
          );
        }
      }
    }

    const wordStates = await WordState.find({ sessionId });

    // Step 1: Build unified grid cell map from all saved WordStates
    const cellGridMap = {};
    wordStates.forEach((ws) => {
      const wordDef = puzzleData.words[ws.wordId];
      if (wordDef && Array.isArray(ws.currentGuess)) {
        wordDef.cells.forEach((cPos, idx) => {
          const charVal = ws.currentGuess[idx];
          if (charVal && charVal.trim()) {
            cellGridMap[`${cPos.row}-${cPos.col}`] = charVal.trim();
          }
        });
      }
    });

    // Step 2: Re-verify all 37 words against unified cell grid map and tally accurate score
    let totalScore = 0;
    let accumulatedWordTime = 0;

    for (const ws of wordStates) {
      const wordDef = puzzleData.words[ws.wordId];
      if (!wordDef) continue;

      const evaluatedGuess = [];
      let isCorrect = true;

      for (let i = 0; i < wordDef.length; i++) {
        const cPos = wordDef.cells[i];
        const cellChar = cellGridMap[`${cPos.row}-${cPos.col}`] || '';
        evaluatedGuess.push(cellChar);

        if (cellChar.trim() !== wordDef.chars[i].trim()) {
          isCorrect = false;
        }
      }

      ws.currentGuess = evaluatedGuess;
      ws.isCorrect = isCorrect;
      await ws.save();

      if (isCorrect) {
        totalScore++;
      }
      accumulatedWordTime += ws.totalTimeSpent || 0;
    }

    const now = new Date();
    const wallClockSec = Math.round((now.getTime() - new Date(session.startTime).getTime()) / 1000);
    const finalTotalTime = Math.max(accumulatedWordTime, wallClockSec);

    session.finalSubmitTime = now;
    session.totalScore = totalScore;
    session.totalTimeSpent = finalTotalTime;
    session.isCompleted = true;
    await session.save();

    return res.json({
      success: true,
      totalScore,
      totalTimeSpent: finalTotalTime,
      isCompleted: true,
    });
  } catch (error) {
    console.error('Final submit error:', error);
    return res.status(500).json({ success: false, message: 'सर्वर त्रुटि' });
  }
});

// GET /api/leaderboard-data - Returns real-time ranked leaderboard data
router.get('/leaderboard-data', async (req, res) => {
  try {
    // Primary sort: totalScore DESC (-1)
    // Secondary sort: totalTimeSpent ASC (1) for tie-breakers
    const leaderboard = await Session.find({ isCompleted: true })
      .populate('userId', 'name email')
      .sort({ totalScore: -1, totalTimeSpent: 1 })
      .limit(50);

    const formattedData = leaderboard.map((s, index) => {
      const minutes = Math.floor((s.totalTimeSpent || 0) / 60);
      const seconds = (s.totalTimeSpent || 0) % 60;
      const formattedTime = `${minutes} मि ${seconds} से`;

      return {
        rank: index + 1,
        name: s.userId ? s.userId.name : 'अज्ञात',
        score: `${s.totalScore} / 37`,
        totalScoreNum: s.totalScore,
        timeSpent: formattedTime,
        totalTimeSpentSec: s.totalTimeSpent,
      };
    });

    return res.json({ success: true, leaderboard: formattedData });
  } catch (error) {
    console.error('Leaderboard fetch error:', error);
    return res.status(500).json({ success: false, message: 'लीडरबोर्ड डेटा लोड करने में त्रुटि' });
  }
});

export default router;
