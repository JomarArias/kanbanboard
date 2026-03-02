import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
    error: any,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const status = error.statusCode || error.status || 500;
    const message = error.message || 'Internal Server Error';

    // Specific handler for Auth0 JWT unauthorized errors
    if (error.name === 'UnauthorizedError') {
        return res.status(401).json({ message: 'Invalid or missing authentication token' });
    }

    res.status(status).json({ message });
};
