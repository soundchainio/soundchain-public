import { Router } from 'express';
import { mux } from './mux';

const router = Router();

router.use('/mux', mux);

export const webhooks = router;
