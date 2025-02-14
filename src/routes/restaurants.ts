import express, {type Request} from 'express';
import { validate } from '../middlewares/validate';
import { Restaurant, RestaurantSchema } from '../schemas/restaurant';
import { initializeRedisClient } from '../utils/client';
import { nanoid } from 'nanoid';
import { cuisineKey, cuisinesKey, restaurantByRatingKey, restaurantCuisinesKeyById, restaurantKeyById, reviewDetailsById, reviewKeyById } from '../utils/keys';
import { errorResponse, successResponse } from '../utils/responses';
import { checkRestaurantExists } from '../middlewares/checkRestaurantId';
import { Review, ReviewSchema } from '../schemas/review';

const router = express.Router();

router.get('/', async(req, res, next): Promise<any> => {
  const { page = 1, limit = 10 } = req.query;
  const start = (Number(page) - 1) * Number(limit);
  const end = start + Number(limit) - 1;

  try {
    const client = await initializeRedisClient();
    const restaurantIds: string[] = await client.sendCommand([
      'ZREVRANGE', 
      restaurantByRatingKey, 
      start.toString(), 
      end.toString()
    ]);
    if (!restaurantIds) {
      return errorResponse(res, 404, 'No restaurants found');
    }
    const restaurants = await Promise.all(restaurantIds.map((id: string) => client.hGetAll(restaurantKeyById(id))));
    return successResponse(res, restaurants);
  } catch(err) {
    next(err);
  }
});

router.post('/', validate(RestaurantSchema), async (req, res, next): Promise<any> => {
  const data = req.body as Restaurant;
  try {
    const client = await initializeRedisClient();
    const id = nanoid();
    const restaurantKey = restaurantKeyById(id);
    const hashData = { id, name: data.name, location: data.location };
    await Promise.all([
      ...data.cuisines.map(cuisine => Promise.all([
        client.sAdd(cuisinesKey, cuisine),
        client.sAdd(cuisineKey(cuisine), id),
        client.sAdd(restaurantCuisinesKeyById(id), cuisine),
      ])),
      client.hSet(restaurantKey, hashData),
      client.zAdd(restaurantByRatingKey, {
        score: 0,
        value: id,
      }),
    ])
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
    const restaurantKey = restaurantKeyById(restaurantId);
    const reviewData = { id: reviewId, ...data, timestamp: Date.now(), restaurantId };
    const [reviewCount, setResult, totalStars] = await Promise.all([
      client.lPush(reviewKey, reviewId),
      client.hSet(reviewDetailsKey, reviewData),
      client.hIncrByFloat(restaurantKey, 'totalStars', data.rating),
    ]);

    const averageRating = Number((totalStars / reviewCount).toFixed(1));
    await Promise.all([
      client.zAdd(restaurantByRatingKey, {
        score: averageRating,
        value: restaurantId,
      }),
      client.hSet(restaurantKey, 'avgStars', averageRating),
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
    const [viewCount, restaurant, cuisines] = await Promise.all([
      client.hIncrBy(restaurantKey, 'viewCount', 1), 
      client.hGetAll(restaurantKey),
      client.sMembers(restaurantCuisinesKeyById(restaurantId))
    ]);
    return successResponse(res, {...restaurant, cuisines}, "Restaurant found");
  } catch(err) {
    next(err);
  }
})

export default router;
