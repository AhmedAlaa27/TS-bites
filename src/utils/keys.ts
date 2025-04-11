export function getKeyName(...args: string[]) {
  return `bites:${args.join(':')}`;
}

export const restaurantKeyById = (id: string) => getKeyName('restaurants', id);

export const reviewKeyById = (id: string) => getKeyName('reviews', id);
export const reviewDetailsById = (id: string) => getKeyName('review_details', id);

export const cuisinesKey = getKeyName('cuisies');
export const cuisineKey = (name: string) => getKeyName('cuisines', name);
export const restaurantCuisinesKeyById = (id: string) => getKeyName('restaurant_cuisines', id);

export const restaurantByRatingKey = getKeyName('restaurants_by_rating');

export const weatherKeyById = (id: string) => getKeyName('weather', id);

export const RestaurantDetailsKeyById = (id: string) => getKeyName('restaurant_details', id);
