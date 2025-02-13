import type { Request, Response, NextFunction } from 'express';
import { ZodSchema } from 'zod';

export const validate = <T>(schema: ZodSchema<T>) => (req: Request, res: Response, next: NextFunction): any => {
  const result = schema.safeParse(req.body);
  if(!result.success) {
    return res.status(400).json({ succes: false, errors: result.error.errors });
  }
  next();
}
