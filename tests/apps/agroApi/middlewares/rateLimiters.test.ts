import express, { type RequestHandler } from 'express';
import request from 'supertest';

import {
  createAuthLimiter,
  createPasswordResetLimiter,
  createRegistrationLimiter,
  createUserRateLimiter
} from '../../../../src/apps/agroApi/middlewares/rateLimiters.js';

const LIMIT = 5;
const neverSkip = (): boolean => false;

/** A route behind `limiter` that answers `status`. */
const appWith = (limiter: RequestHandler, status: number) => {
  const app = express();
  app.post('/limited', limiter, (_req, res) => {
    res.status(status).send();
  });

  return app;
};

/** A route behind the user limiter that keys off an `x-user` header. */
const appWithUserLimiter = (max: number) => {
  const app = express();
  app.post(
    '/limited',
    (req, res, next) => {
      const userId = req.headers['x-user'];
      if (typeof userId === 'string') {
        res.locals.user = { id: userId };
      }
      next();
    },
    createUserRateLimiter({ skip: neverSkip, max }),
    (_req, res) => {
      res.status(200).send();
    }
  );

  return app;
};

const statusesOf = async (
  app: express.Express,
  count: number
): Promise<number[]> => {
  const statuses: number[] = [];
  for (let sent = 0; sent < count; sent += 1) {
    statuses.push((await request(app).post('/limited')).status);
  }

  return statuses;
};

const statusesForUser = async (
  app: express.Express,
  userId: string,
  count: number
): Promise<number[]> => {
  const statuses: number[] = [];
  for (let sent = 0; sent < count; sent += 1) {
    statuses.push(
      (await request(app).post('/limited').set('x-user', userId)).status
    );
  }

  return statuses;
};

describe('rate limit config', () => {
  describe('registration limiter', () => {
    it('should count successful answers and refuse the sixth request', async () => {
      const app = appWith(createRegistrationLimiter({ skip: neverSkip }), 202);

      const statuses = await statusesOf(app, LIMIT + 1);

      expect(statuses).toEqual([...Array<number>(LIMIT).fill(202), 429]);
    });
  });

  describe('auth limiter', () => {
    it('should not count successful answers', async () => {
      const app = appWith(createAuthLimiter({ skip: neverSkip }), 200);

      const statuses = await statusesOf(app, LIMIT + 1);

      expect(statuses).not.toContain(429);
    });

    it('should count failed answers and refuse the sixth request', async () => {
      const app = appWith(createAuthLimiter({ skip: neverSkip }), 400);

      const statuses = await statusesOf(app, LIMIT + 1);

      expect(statuses).toEqual([...Array<number>(LIMIT).fill(400), 429]);
    });
  });

  describe('password reset limiter', () => {
    it('should count successful answers and refuse the sixth request', async () => {
      const app = appWith(createPasswordResetLimiter({ skip: neverSkip }), 202);

      const statuses = await statusesOf(app, LIMIT + 1);

      expect(statuses).toEqual([...Array<number>(LIMIT).fill(202), 429]);
    });
  });

  describe('user rate limiter', () => {
    it('should count every request and refuse the one past the limit', async () => {
      const app = appWithUserLimiter(2);

      const statuses = await statusesForUser(app, 'count-user', 3);

      expect(statuses).toEqual([200, 200, 429]);
    });

    it('should bucket each user independently', async () => {
      const app = appWithUserLimiter(2);

      const exhaustedUser = await statusesForUser(app, 'indep-user-a', 3);
      const freshUser = await statusesForUser(app, 'indep-user-b', 1);

      expect(exhaustedUser).toEqual([200, 200, 429]);
      expect(freshUser).toEqual([200]);
    });

    it('should fall back to the client IP when unauthenticated', async () => {
      const app = appWithUserLimiter(2);

      const statuses = await statusesOf(app, 3);

      expect(statuses).toEqual([200, 200, 429]);
    });
  });
});
