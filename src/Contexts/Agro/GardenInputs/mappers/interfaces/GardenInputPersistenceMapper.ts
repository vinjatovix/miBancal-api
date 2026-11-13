import type { GardenInput } from '../../domain/entities/GardenInput.js';
import type { MongoGardenInputDocument } from '../../infrastructure/persistence/types/MongoGardenInputDocument.js';

export interface GardenInputPersistenceMapper {
  fromMongoDocument(document: MongoGardenInputDocument): GardenInput;
  toMongoDocument(gardenInput: GardenInput): MongoGardenInputDocument;
}
