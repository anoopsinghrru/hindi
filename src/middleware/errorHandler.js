/**
 * Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;

  // Log full stack trace only for actual 500 server errors
  if (statusCode >= 500) {
    console.error(`[Server Error] ${err.stack || err.message}`);
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

/**
 * 404 Not Found Handler Middleware
 */
export const notFoundHandler = (req, res, next) => {
  // Silent 404 handling for benign browser metadata requests
  if (req.originalUrl.includes('.well-known') || req.originalUrl.includes('favicon.ico')) {
    return res.status(404).send('Not Found');
  }

  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};
