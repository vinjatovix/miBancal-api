import type { Request } from 'express';
import { getClientIp } from '../../../../src/shared/infrastructure/http/real-ip.js';

describe('getClientIp', () => {
  it('should return req.ip when present', () => {
    const req = {
      ip: '192.168.1.50',
      socket: {
        remoteAddress: '9.10.11.12'
      }
    } as unknown as Request;

    const result = getClientIp(req);

    expect(result).toBe('192.168.1.50');
  });

  it('should fall back to socket remoteAddress when req.ip is absent', () => {
    const req = {
      socket: {
        remoteAddress: '9.10.11.12'
      }
    } as unknown as Request;

    const result = getClientIp(req);

    expect(result).toBe('9.10.11.12');
  });

  it('should normalize IPv6 addresses to their subnet form', () => {
    const req = {
      ip: '2001:db8::1',
      socket: {
        remoteAddress: '9.10.11.12'
      }
    } as unknown as Request;

    const result = getClientIp(req);

    expect(result).toBe('2001:db8::/56');
  });

  it('should return an empty string when neither ip nor remoteAddress are present', () => {
    const req = {
      socket: {}
    } as unknown as Request;

    const result = getClientIp(req);

    expect(result).toBe('');
  });
});
