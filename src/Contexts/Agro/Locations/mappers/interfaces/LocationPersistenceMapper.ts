import type { Location } from '../../domain/entities/Location.js';
import type { MongoLocationDocument } from '../../infrastructure/persistence/types/MongoLocationDocument.js';

export interface LocationPersistenceMapper {
  fromMongoDocument(document: MongoLocationDocument): Location;
  toMongoDocument(location: Location): MongoLocationDocument;
}
