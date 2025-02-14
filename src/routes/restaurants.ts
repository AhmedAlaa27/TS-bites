import express, {type Request} from 'express';
import { validate } from '../middlewares/validate';
import { Restaurant, RestaurantSchema } from '../schemas/restaurant';
import { initializeRedisClient } from '../utils/client';
import { nanoid } from 'nanoid';
import { restaurantKeyById, reviewDetailsById, reviewKeyById } from '../utils/keys';
import { errorResponse, successResponse } from '../utils/responses';
import { checkRestaurantExists } from '../middlewares/checkRestaurantId';
import { Review, ReviewSchema } from '../schemas/review';

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

router.post('/:restaurantId/reviews', checkRestaurantExists, validate(ReviewSchema), async(req: Request<{ restaurantId: string}>, res, next): Promise<any> => {
  const { restaurantId } = req.params;
  const data = req.body as Review;
  try {
    const client = await initializeRedisClient();
    const reviewId = nanoid();
    const reviewKey = reviewKeyById(restaurantId);
    const reviewDetailsKey = reviewDetailsById(reviewId);
    const reviewData = { id: reviewId, ...data, timestamp: Date.now(), restaurantId };
    await Promise.all([
      client.lPush(reviewKey, reviewId),
      client.hSet(reviewDetailsKey, reviewData),
    ]);
    return successResponse(res, reviewData, 'Review added');
  } catch(err) {
    next(err);
  }
});

router.get('/:restaurantId/reviews', checkRestaurantExists, async(req: Request<{ restaurantId: string}>, res, next): Promise<any> => {
  const { restaurantId } = req.params;
  try {
    const client = await initializeRedisClient();
    const { page = 1, limit = 10 } = req.query;
    const start = (Number(page) - 1) * Number(limit);
    const end = start + Number(limit) - 1;

    try {
      const client = await initializeRedisClient();
      const reviewKey = reviewKeyById(restaurantId);
      const reviewIds = await client.lRange(reviewKey, start, end);
      const reviews = await Promise.all(reviewIds.map(id => client.hGetAll(reviewDetailsById(id))));
      return successResponse(res, reviews, "Reviews found"); 
    } catch(err) {
      next(err);
    }
  } catch(err) {
    next(err);
  }
});

router.delete('/:restaurantId/reviews/:reviewId', checkRestaurantExists, async(req: Request<{ restaurantId: string, reviewId: string}>, res, next): Promise<any> => {
  const { restaurantId, reviewId } = req.params;
  try {
    const client = await initializeRedisClient();
    const reviewKey = reviewKeyById(restaurantId);
    const reviewDetailsKey = reviewDetailsById(reviewId);
    const [removeResult, deleteResult] = await Promise.all([
      client.lRem(reviewKey, 0, reviewId),
      client.del(reviewDetailsKey)
    ]);
    if (removeResult === 0 && deleteResult === 0) {
      return errorResponse(res, 404, 'Review not found');
    }
    return successResponse(res, [reviewId, restaurantId], "Review deleted");
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
