import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'नाम आवश्यक है'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'ईमेल आवश्यक है'],
      lowercase: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
