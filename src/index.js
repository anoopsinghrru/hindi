import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import { initKeepAlive } from './utils/keepAlive.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Database then start Express server
connectDB().then(() => {
  const server = app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
    initKeepAlive(PORT);
  });

  process.on('unhandledRejection', (err) => {
    console.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
});
