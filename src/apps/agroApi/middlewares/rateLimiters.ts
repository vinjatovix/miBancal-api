import type { Request, RequestHandler, Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { getClientIp } from '../../../shared/infrastructure/http/real-ip.js';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

type Skip = (req: Request) => boolean;

/** Limiters are off in the test suite, where every scenario shares one IP. */
const skipInTests: Skip = (_req: Request) => process.env.NODE_ENV === 'test';

/**
 * Per-IP ceiling over the whole surface and the backstop for anonymous
 * traffic. Interactive authenticated routes additionally carry a per-identity
 * budget via `userRateLimiter`; the auth routes keep their stricter limiters.
 */
export const globalLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 300,
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests
});

/** Counts failed attempts only: login, Google sign-in, GitHub sign-in, activation. */
export const createAuthLimiter = ({
  skip = skipInTests
}: { skip?: Skip } = {}): RequestHandler =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    max: 5,
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false, xForwardedForHeader: false },
    skipSuccessfulRequests: true,
    keyGenerator: getClientIp,
    skip
  });

/**
 * Counts every request, for routes whose every answer is the same success and
 * may send an email: counting only failures would allow unlimited emails.
 */
const createEveryRequestLimiter = (
  message: string,
  skip: Skip
): RequestHandler =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    max: 5,
    message,
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false, xForwardedForHeader: false },
    keyGenerator: getClientIp,
    skipSuccessfulRequests: false,
    skip
  });

export const createRegistrationLimiter = ({
  skip = skipInTests
}: { skip?: Skip } = {}): RequestHandler =>
  createEveryRequestLimiter(
    'Too many registration attempts, please try again later',
    skip
  );

export const authLimiter = createAuthLimiter();

export const registrationLimiter = createRegistrationLimiter();

export const createPasswordResetLimiter = ({
  skip = skipInTests
}: { skip?: Skip } = {}): RequestHandler =>
  createEveryRequestLimiter(
    'Too many password reset attempts, please try again later',
    skip
  );

export const passwordResetLimiter = createPasswordResetLimiter();

export const strictLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  max: 30,
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipInTests
});

const USER_RATE_LIMIT_MAX = 300;

/**
 * Keys authenticated requests by user (`res.locals.user.id`, set by `auth`),
 * so each identity carries its own budget even as it roams between IPs;
 * anonymous requests fall back to the client IP.
 */
const userOrIpKey = (req: Request, res: Response): string => {
  const user = res.locals.user as { id?: unknown } | undefined;

  return typeof user?.id === 'string' ? `user:${user.id}` : getClientIp(req);
};

/**
 * Per-identity limiter for interactive authenticated routes (catalogue
 * filtering, bookmark toggles): it bounds a single account's usage even as it
 * roams between IPs, while the global limiter stays the per-IP ceiling for all
 * traffic from one address. `max` is injectable for tests.
 */
export const createUserRateLimiter = ({
  skip = skipInTests,
  max = USER_RATE_LIMIT_MAX
}: { skip?: Skip; max?: number } = {}): RequestHandler =>
  rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    max,
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    validate: { trustProxy: false, xForwardedForHeader: false },
    keyGenerator: userOrIpKey,
    skip
  });

export const userRateLimiter = createUserRateLimiter();
