import { Webhooks } from '@mux/mux-node';
import express, { Router } from 'express';
import { config } from '../config';

const router = Router();

router.use(express.raw({ type: 'application/json' }), async (req, res, next) => {
  try {
    const sig = req.headers['mux-signature'] as string;
    Webhooks.verifyHeader(req.body, sig, config.mux.webhookSecret);
    next();
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
});

router.post('/', async (req, res) => {
  const { type: eventType, data: eventData } = JSON.parse(req.body);
  const { trackService } = req.app.locals.context;

  switch (eventType) {
    case 'video.asset.ready': {
      const { id, playback_ids, passthrough } = eventData;
      const asset = { id, playbackId: playback_ids[0].id };
      await trackService.updateTrack(passthrough, { asset });
      break;
    }
    case 'video.upload.cancelled': {
      await trackService.deleteTrack(eventData.passthrough);
      break;
    }
    default:
      // Mux sends webhooks for *lots* of things, but we'll ignore those for now
      console.log('some other event!', eventType, eventData);
  }

  res.sendStatus(200);
});

export const mux = router;
