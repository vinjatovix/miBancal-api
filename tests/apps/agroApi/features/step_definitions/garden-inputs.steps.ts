import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Given, Then } from '@cucumber/cucumber';
import { assert } from 'chai';
import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import {
  currentResponse,
  rawCollection,
  type AgroWorld
} from './utils/index.js';

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

Given(
  'a seeded garden input {string} exists',
  async function (this: AgroWorld, slug: string) {
    let doc = await rawCollection('gardenInputs').findOne({ slug });
    if (!doc) {
      const item = mockInputs.find((input) => input.slug === slug);
      if (item) {
        const { _id, ...rest } = item;
        const mongoDoc = {
          ...rest,
          _id: toMongoId(_id),
          metadata: {
            ...item.metadata,
            createdAt: new Date(item.metadata.createdAt),
            updatedAt: new Date(item.metadata.updatedAt)
          }
        };
        await rawCollection('gardenInputs').insertOne(mongoDoc);
        doc = mongoDoc;
      }
    }

    assert.exists(
      doc,
      `Garden input with slug "${slug}" not found in database or mock data`
    );
    this.gardenInputId = doc?._id?.toString();
    this.gardenInputSlug = doc?.slug as string;
  }
);

Then(
  'the stored garden input {string} has status {string}',
  async function (this: AgroWorld, slug: string, status: string) {
    const doc = await rawCollection('gardenInputs').findOne({ slug });
    assert.exists(doc, `Garden input with slug "${slug}" not found`);
    assert.strictEqual(doc?.status, status);
  }
);

Then(
  'the response recipe should contain ingredient {string}',
  async function (this: AgroWorld, ingredientItem: string) {
    const body = (await currentResponse(this)).body as {
      recipes?: Array<{ ingredients?: Array<{ item: string }> }>;
    };

    assert.isArray(body.recipes, 'Response has no recipes array');
    const allIngredients = (body.recipes ?? []).flatMap(
      (r) => r.ingredients?.map((i) => i.item) ?? []
    );
    assert.isTrue(
      allIngredients.some((item) =>
        item.toLowerCase().includes(ingredientItem.toLowerCase())
      ),
      `Expected ingredients to include "${ingredientItem}"`
    );
  }
);
