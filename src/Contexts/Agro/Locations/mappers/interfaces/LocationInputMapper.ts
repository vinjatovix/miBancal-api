import type { CreateLocationInput } from '../../application/useCases/interfaces/CreateLocationInput.js';
import type { UpdateLocationInput } from '../../application/useCases/interfaces/UpdateLocationInput.js';
import type { Location } from '../../domain/entities/Location.js';
import type { LocationChanges } from '../../domain/entities/types/LocationChanges.js';

export interface LocationInputMapper {
  fromCreateInputToDomain(input: CreateLocationInput, user: string): Location;
  toChanges(input: UpdateLocationInput): LocationChanges;
}
