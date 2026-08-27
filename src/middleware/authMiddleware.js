import { Session } from '../models/Session.js';
import { User } from '../models/User.js';

export const requireAuth = async (req, res, next) => {
  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      return res.redirect('/');
    }

    const session = await Session.findById(sessionId).populate('userId');
    if (!session || !session.userId) {
      res.clearCookie('session_id');
      return res.redirect('/');
    }

    req.sessionData = session;
    req.user = session.userId;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.clearCookie('session_id');
    return res.redirect('/');
  }
};
