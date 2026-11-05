import type { Request } from 'express';
import { ipKeyGenerator } from 'express-rate-limit';

/**
 * Resolves the client IP address from Express's trusted proxy resolution (`req.ip`),
 * falling back to the socket remote address.
 *
 * Normalizes IPv6 addresses using `ipKeyGenerator` to prevent rate limit bypasses.
 *
 * @param req The Express request object.
 * @returns The resolved client IP address as a string.
 */
export const getClientIp = (req: Request): string => {
  return ipKeyGenerator(req.ip || req.socket.remoteAddress || '');
};
