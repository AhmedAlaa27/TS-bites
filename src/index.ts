import express from 'express';
import 'dotenv/config';
import restaurantRouter from './routes/restaurants';
import cuisinesRouter from './routes/cuisines';
import { errorHandler } from './middlewares/errorHandler';

const PORT = process.env.PORT || 3000;
const app = express();
app.use(express.json());

app.use('/api/restaurants', restaurantRouter);
app.use('api/cuisines', cuisinesRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
  throw new Error(err.message);
});
