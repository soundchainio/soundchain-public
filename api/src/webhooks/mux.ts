import { Webhooks } from '@mux/mux-node';
import type { Handler } from 'aws-lambda';
import express, { Router } from 'express';
import { config } from '../config';
import { TrackService } from '../services/TrackService';
import { Context } from '../types/Context';

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

  await handleEvent(eventType, eventData, trackService);

  res.sendStatus(200);
});

export const mux = router;

export const handler: Handler = async ({ headers, body }) => {
  try {
    const sig = headers['mux-signature'] as string;
    Webhooks.verifyHeader(body, sig, config.mux.webhookSecret);
  } catch (err) {
    return { statusCode: 400 };
  }

  const { type: eventType, data: eventData } = JSON.parse(body);
  const { trackService } = new Context();
  await handleEvent(eventType, eventData, trackService);

  return { statusCode: 200 };
};

type EventType = 'video.asset.ready' | 'video.upload.cancelled';
type EventData = {
  id: string;
  passthrough: string;
  playback_ids: {
    id: string;
  }[];
};

async function handleEvent(eventType: EventType, eventData: EventData, trackService: TrackService) {
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
      console.log('some other event!', eventType, eventData);
  }
}
