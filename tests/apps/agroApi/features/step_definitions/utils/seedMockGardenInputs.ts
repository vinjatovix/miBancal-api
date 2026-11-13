import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Db, Document, OptionalId } from 'mongodb';
import { toMongoId } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';

type MockGardenInput = {
  _id: string;
  slug: string;
  metadata: {
    createdAt: string;
    updatedAt: string;
    createdBy: string;
    updatedBy: string;
  };
  [key: string]: unknown;
};

const mockInputs = JSON.parse(
  readFileSync(resolve(process.cwd(), 'mock_data/gardenInputs.json'), 'utf-8')
) as MockGardenInput[];

export const seedMockGardenInputs = async (db: Db): Promise<void> => {
  const collection = db.collection('gardenInputs');
  const count = await collection.countDocuments();
  if (count === 0) {
    const documents = mockInputs.map(({ _id, ...rest }) => ({
      ...rest,
      _id: toMongoId(_id),
      metadata: {
        ...rest.metadata,
        createdAt: new Date(rest.metadata.createdAt),
        updatedAt: new Date(rest.metadata.updatedAt)
      }
    }));
    await collection.insertMany(
      documents as unknown as readonly OptionalId<Document>[]
    );
  }
};
