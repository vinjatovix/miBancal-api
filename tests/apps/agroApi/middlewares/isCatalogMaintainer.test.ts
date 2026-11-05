import type { Request, Response, NextFunction } from 'express';
import type { AppContainer } from '../../../../src/apps/agroApi/container.js';
import { EnsureAuthentication } from '../../../../src/apps/agroApi/middlewares/EnsureAuthentication.js';
import { isCatalogMaintainer } from '../../../../src/apps/agroApi/middlewares/isCatalogMaintainer.js';

describe('isCatalogMaintainer middleware', () => {
  it('should delegate to EnsureAuthentication.isCatalogMaintainer', () => {
    const next = jest.fn() as NextFunction;
    const res = {} as Response;

    const spy = jest
      .spyOn(EnsureAuthentication, 'isCatalogMaintainer')
      .mockImplementation(() => undefined);

    const req = {
      container: {
        resolve: jest.fn().mockReturnValue('logger')
      }
    } as unknown as Request & { container: AppContainer };

    isCatalogMaintainer(req, res, next);

    expect(spy).toHaveBeenCalledWith({ logger: 'logger' }, req, res, next);

    spy.mockRestore();
  });
});
