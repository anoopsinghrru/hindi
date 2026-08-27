import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    startTime: {
      type: Date,
      default: Date.now,
    },
    finalSubmitTime: {
      type: Date,
      default: null,
    },
    totalScore: {
      type: Number,
      default: 0,
    },
    totalTimeSpent: {
      type: Number,
      default: 0, // In seconds
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

export const Session = mongoose.model('Session', sessionSchema);
