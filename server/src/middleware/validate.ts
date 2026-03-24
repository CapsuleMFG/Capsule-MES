import { validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that checks express-validator results and returns 400 if invalid.
 * Use after validation chains: router.post('/', [...validations], validate, handler)
 */
export const validate = (req: Request, res: Response, next: NextFunction): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(e => ({
        field: e.type === 'field' ? (e as any).path : undefined,
        message: e.msg,
      })),
    });
    return;
  }
  next();
};
