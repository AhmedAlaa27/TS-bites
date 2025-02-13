import express, {type Request} from 'express';
import { validate } from '../middlewares/validate';
import { Restaurant, RestaurantSchema } from '../schemas/restaurant';
import { initializeRedisClient } from '../utils/client';
import { nanoid } from 'nanoid';
import { restaurantKeyById } from '../utils/keys';
import { successResponse } from '../utils/responses';
import { checkRestaurantExists } from '../middlewares/checkRestaurantId';

const router = express.Router();

router.post('/', validate(RestaurantSchema), async (req, res, next): Promise<any> => {
  const data = req.body as Restaurant;
  try {
    const client = await initializeRedisClient();
    const id = nanoid();
    const restaurantKey = restaurantKeyById(id);
    const hashData = { id, name: data.name, location: data.location };
    const addResult = await client.hSet(restaurantKey, hashData);
    console.log(`Added ${addResult} fields`);
    return successResponse(res, hashData, "Added new rastaurant");
  } catch(err) {
    next(err);
  }
});

router.get('/:restaurantId', checkRestaurantExists, async(req: Request<{ restaurantId: string}>, res, next): Promise<any> => {
  const { restaurantId } = req.params
  try {
    const client = await initializeRedisClient();
    const restaurantKey = restaurantKeyById(restaurantId);
    const [viewCount, restaurant] = await Promise.all([
      client.hIncrBy(restaurantKey, 'viewCount', 1), 
      client.hGetAll(restaurantKey)
    ]);
    return successResponse(res, restaurant, "Restaurant found");
  } catch(err) {
    next(err);
  }
})

export default router;
