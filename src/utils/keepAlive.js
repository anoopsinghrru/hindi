/**
 * Render Keep-Alive Self-Ping Utility
 * Pings /api/health every 10 minutes to prevent Render free instance from spinning down (sleeping)
 */
export const initKeepAlive = (port) => {
  const TEN_MINUTES_MS = 10 * 60 * 1000;

  const pingServer = async () => {
    try {
      const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
      const healthUrl = `${baseUrl}/api/health`;

      await fetch(healthUrl);
    } catch (err) {
      // Silently ignore ping errors
    }
  };

  // Initial ping after 1 minute, then repeat every 10 minutes
  setTimeout(pingServer, 60 * 1000);
  setInterval(pingServer, TEN_MINUTES_MS);
};
