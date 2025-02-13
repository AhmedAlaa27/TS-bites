import { createClient, type RedisClientType } from "redis";

let client: RedisClientType | null = null;

export async function initializeRedisClient() {
  if (!client) {
    client = createClient();
    client.on('error', (err) => {
      console.error(err);
    })
    client.on('connect', () =>{
      console.log('Redis Connected');
    })
    await client.connect();
  }
  return client;
}
