// ═══════════════════════════════════════════════════════════
// Webhook Security Validation Middleware
// ═══════════════════════════════════════════════════════════

import type { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { Webhook as SvixWebhook } from 'svix';
import { config } from '../lib/config.js';
import { logger } from '../lib/logger.js';
import { AppError } from './errorHandler.js';

const log = logger.child({ middleware: 'webhook-validation' });

/**
 * Verify Slack webhook signatures (HMAC-SHA256)
 */
export function verifySlackSignature(req: Request, _res: Response, next: NextFunction) {
  const isDevBypass = config.nodeEnv !== 'production' && !config.slack.signingSecret;
  if (isDevBypass) {
    log.warn('Dev Mode: Slack Signing Secret missing, bypassing signature verification.');
    return next();
  }

  if (!config.slack.signingSecret) {
    return next(new AppError(500, 'Slack Signing Secret is not configured.'));
  }

  try {
    const signature = req.headers['x-slack-signature'] as string;
    const timestamp = req.headers['x-slack-request-timestamp'] as string;

    if (!signature || !timestamp) {
      throw new AppError(401, 'Missing Slack signature or timestamp headers.');
    }

    // Prevent replay attacks (check if request timestamp is within 5 minutes)
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
    if (parseInt(timestamp, 10) < fiveMinutesAgo) {
      throw new AppError(401, 'Slack request timestamp expired (older than 5 minutes).');
    }

    // The body should be raw string
    const rawBody = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
    const sigBaseString = `v0:${timestamp}:${rawBody}`;

    const computedSignature = 'v0=' + crypto
      .createHmac('sha256', config.slack.signingSecret)
      .update(sigBaseString, 'utf8')
      .digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signature))) {
      return next();
    } else {
      throw new AppError(401, 'Invalid Slack request signature.');
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Verify Sentry webhook signatures (HMAC-SHA256)
 */
export function verifySentrySignature(req: Request, _res: Response, next: NextFunction) {
  const isDevBypass = config.nodeEnv !== 'production' && !config.webhooks.sentry;
  if (isDevBypass) {
    log.warn('Dev Mode: Sentry Webhook Secret missing, bypassing signature verification.');
    return next();
  }

  if (!config.webhooks.sentry) {
    return next(new AppError(500, 'Sentry Webhook Secret is not configured.'));
  }

  try {
    const signature = req.headers['x-sentry-signature'] as string;
    if (!signature) {
      throw new AppError(401, 'Missing X-Sentry-Signature header.');
    }

    const rawBody = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
    const computedSignature = crypto
      .createHmac('sha256', config.webhooks.sentry)
      .update(rawBody, 'utf8')
      .digest('hex');

    if (crypto.timingSafeEqual(Buffer.from(computedSignature), Buffer.from(signature))) {
      return next();
    } else {
      throw new AppError(401, 'Invalid Sentry signature.');
    }
  } catch (err) {
    next(err);
  }
}

/**
 * Verify Clerk user sync webhook signatures (Svix)
 */
export function verifyClerkSignature(req: Request, _res: Response, next: NextFunction) {
  const isDevBypass = config.nodeEnv !== 'production' && !config.clerk.webhookSecret;
  if (isDevBypass) {
    log.warn('Dev Mode: Clerk Webhook Secret missing, bypassing signature verification.');
    return next();
  }

  if (!config.clerk.webhookSecret) {
    return next(new AppError(500, 'Clerk Webhook Secret is not configured.'));
  }

  try {
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new AppError(401, 'Missing Svix webhook headers for Clerk verification.');
    }

    const rawBody = req.body instanceof Buffer ? req.body.toString() : JSON.stringify(req.body);
    const svixWebhook = new SvixWebhook(config.clerk.webhookSecret);

    svixWebhook.verify(rawBody, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });

    next();
  } catch (err) {
    log.error({ err }, 'Clerk webhook signature verification failed');
    next(new AppError(401, 'Invalid Clerk webhook signature.'));
  }
}

/**
 * Verify UptimeRobot webhook secret
 */
export function verifyUptimeRobotSignature(req: Request, _res: Response, next: NextFunction) {
  const isDevBypass = config.nodeEnv !== 'production' && !config.webhooks.uptimerobot;
  if (isDevBypass) {
    log.warn('Dev Mode: UptimeRobot Webhook Secret missing, bypassing signature verification.');
    return next();
  }

  if (!config.webhooks.uptimerobot) {
    return next(new AppError(500, 'UptimeRobot Webhook Secret is not configured.'));
  }

  try {
    // Validate secret from query param or custom header
    const incomingSecret = (req.query['secret'] as string) ?? req.headers['x-webhook-secret'] as string;
    if (!incomingSecret || incomingSecret !== config.webhooks.uptimerobot) {
      throw new AppError(401, 'Invalid or missing UptimeRobot webhook secret.');
    }
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Verify Sentinel Agent metrics / alerts endpoint webhook secret
 */
export function verifySentinelAgentSignature(req: Request, _res: Response, next: NextFunction) {
  const isDevBypass = config.nodeEnv !== 'production' && !config.webhooks.secret;
  if (isDevBypass) {
    log.warn('Dev Mode: Sentinel Agent Webhook Secret missing, bypassing authorization validation.');
    return next();
  }

  if (!config.webhooks.secret) {
    return next(new AppError(500, 'Webhook Secret is not configured.'));
  }

  try {
    const authHeader = req.headers.authorization;
    const webhookSecretHeader = req.headers['x-webhook-secret'] as string;

    const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : undefined;
    const incomingSecret = token ?? webhookSecretHeader;

    if (!incomingSecret || incomingSecret !== config.webhooks.secret) {
      throw new AppError(401, 'Invalid or missing Sentinel Agent webhook secret key authorization.');
    }
    next();
  } catch (err) {
    next(err);
  }
}
