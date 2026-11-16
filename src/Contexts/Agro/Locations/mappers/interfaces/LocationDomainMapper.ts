import type { Location } from '../../domain/entities/Location.js';
import type { LocationPrimitives } from '../../domain/entities/types/LocationPrimitives.js';

export interface LocationDomainMapper {
  toPrimitives(location: Location): LocationPrimitives;
  fromPrimitives(primitives: LocationPrimitives): Location;
}
