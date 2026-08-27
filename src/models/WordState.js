import mongoose from 'mongoose';

const wordStateSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Session',
      required: true,
      index: true,
    },
    wordId: {
      type: String,
      required: true, // e.g. "across-2" or "down-1"
    },
    isCorrect: {
      type: Boolean,
      default: false,
    },
    totalTimeSpent: {
      type: Number,
      default: 0, // Time in seconds
    },
    currentGuess: {
      type: [String],
      default: [], // Array of characters/syllables, e.g. ["अ", "नु", "रा", "ग"]
    },
    lastFocusStart: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound index to quickly find a word state for a given session
wordStateSchema.index({ sessionId: 1, wordId: 1 }, { unique: true });

export const WordState = mongoose.model('WordState', wordStateSchema);
