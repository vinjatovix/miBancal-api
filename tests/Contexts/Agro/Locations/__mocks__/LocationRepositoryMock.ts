/* eslint-disable @typescript-eslint/require-await */

import type { Location } from '../../../../../src/Contexts/Agro/Locations/domain/entities/Location.js';
import type { LocationPrimitives } from '../../../../../src/Contexts/Agro/Locations/domain/entities/types/LocationPrimitives.js';
import type { LocationRepository } from '../../../../../src/Contexts/Agro/Locations/domain/repositories/interfaces/LocationRepository.js';
import { locationDomainMapper } from '../../../../../src/Contexts/Agro/Locations/mappers/locationDomainMapper.js';
import type { Nullable } from '../../../../../src/shared/domain/types/Nullable.js';
import { BaseMongoCrudRepositoryMock } from '../../__mocks__/BaseMongoCrudRepositoryMock.js';

export class LocationRepositoryMock
  extends BaseMongoCrudRepositoryMock<Location, LocationPrimitives>
  implements LocationRepository
{
  private readonly findOwnedActiveByIdMock = jest.fn();
  private readonly findActiveByNameForOwnerMock = jest.fn();

  async create(location: Location): Promise<void> {
    await this.save(location);
  }

  async findOwnedActiveById(
    id: string,
    userId: string
  ): Promise<Nullable<Location>> {
    this.findOwnedActiveByIdMock(id, userId);
    this.readCalls.findOwnedActiveById += 1;

    const location = this.storage.get(id);

    return location && this.isActive(location) && location.userId === userId
      ? this.toDomain(this.toPrimitives(location))
      : null;
  }

  async findActiveByNameForOwner(
    userId: string,
    name: string
  ): Promise<Nullable<Location>> {
    this.findActiveByNameForOwnerMock(userId, name);

    const match = Array.from(this.storage.values()).find(
      (location) =>
        location.userId === userId &&
        this.isActive(location) &&
        location.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es')
    );

    return match ? this.toDomain(this.toPrimitives(match)) : null;
  }

  async findActiveByIdsForOwner(
    ids: string[],
    userId: string
  ): Promise<Location[]> {
    const idSet = new Set(ids);
    return Array.from(this.storage.values()).filter(
      (location) =>
        idSet.has(location.id) &&
        location.userId === userId &&
        this.isActive(location)
    );
  }

  findByUserId(userId: string): Promise<Location[]> {
    return Promise.resolve(
      Array.from(this.storage.values()).filter(
        (location) => location.userId === userId && this.isActive(location)
      )
    );
  }

  protected toDomain(primitives: LocationPrimitives): Location {
    return locationDomainMapper.fromPrimitives(primitives);
  }

  protected toPrimitives(entity: Location): LocationPrimitives {
    return locationDomainMapper.toPrimitives(entity);
  }

  protected entityName(): string {
    return 'Location';
  }

  protected isActive(location: Location): boolean {
    return location.status !== 'deleted';
  }

  assertFindOwnedActiveByIdHasBeenCalledWith(id: string, userId: string): void {
    expect(this.findOwnedActiveByIdMock).toHaveBeenCalledWith(id, userId);
  }

  assertFindActiveByNameForOwnerHasBeenCalledWith(
    userId: string,
    name: string
  ): void {
    expect(this.findActiveByNameForOwnerMock).toHaveBeenCalledWith(
      userId,
      name
    );
  }
}
