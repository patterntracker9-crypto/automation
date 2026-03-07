import express from 'express';
const app = express();
import 'dotenv/config';
import cors from 'cors';

import picklistRoutes from './routes/picklist/picklist.routes.js';
import { globalErrorHandler } from './middlewares/error.middleware.js';

// middleware setting
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
// routes middleware
app.use('/api/v1/picklist', picklistRoutes);
app.use(globalErrorHandler);

export { app };
