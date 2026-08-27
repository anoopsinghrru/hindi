import 'dotenv/config';
import { connectDB } from '../src/config/db.js';
import app from '../src/app.js';

async function runTest() {
  console.log('Testing MongoDB connection...');
  await connectDB();
  console.log('MongoDB connected successfully!');

  const server = app.listen(5000, () => {
    console.log('Test Server listening on port 5000');
    setTimeout(async () => {
      try {
        const res1 = await fetch('http://localhost:5000/api/leaderboard-data');
        const json1 = await res1.json();
        console.log('Leaderboard API Response:', json1);
      } catch (err) {
        console.error('Fetch test failed:', err);
      } finally {
        server.close();
        process.exit(0);
      }
    }, 1000);
  });
}

runTest();
