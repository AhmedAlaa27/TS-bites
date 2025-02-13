import type { Request, Response, NextFunction} from 'express';
import { initializeRedisClient } from '../utils/client';
import { restaurantKeyById } from '../utils/keys';
import { errorResponse } from '../utils/responses';

export const checkRestaurantExists = async(req: Request, res: Response, next: NextFunction): Promise<any> => {
  const { restaurantId } = req.params;
  if (!restaurantId) {
    return errorResponse(res, 400, 'Restaurant ID not found')
  }
  try {
    const client = await initializeRedisClient();
    const restaurantKey = restaurantKeyById(restaurantId);
    const exists = await client.exists(restaurantKey);
    if (!exists) {
      return errorResponse(res, 404, 'Restaurant Not Found');
    }
    next();
  } catch(err) {
    next(err);
  }
}
