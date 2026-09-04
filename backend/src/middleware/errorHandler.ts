import { Request, Response, NextFunction } from 'express';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
}

export const errorHandler = (
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = err.statusCode || 500;
  const errorCode = err.code || 'INTERNAL_SERVER_ERROR';
  const errorMessage = err.message || 'An unexpected error occurred on the server.';

  // Log error securely
  console.error(`[Error] Code: ${errorCode}, Status: ${statusCode}, Message: ${errorMessage}`);
  if (err.stack) {
    console.error(err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: errorMessage
    }
  });
};

export default errorHandler;
