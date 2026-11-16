import { Given, Then } from '@cucumber/cucumber';
import { assert } from 'chai';

import type { MongoUserBookmarksDocument } from '../../../../../src/Contexts/Agro/Bookmarks/infrastructure/persistence/types/MongoUserBookmarksDocument.js';
import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { random } from '../../../../Contexts/shared/fixtures/random.js';
import { currentResponse, suite, type AgroWorld } from './utils/index.js';

Given('the plant is in my favorites', async function (this: AgroWorld) {
  if (!this.plantId) {
    assert.fail('plantId not set in world');
  }

  const userId = suite().ids.user;
  const collection = suite()
    .client.db()
    .collection<MongoUserBookmarksDocument>('user_bookmarks');
  const existing = await collection.findOne({ userId: toMongoId(userId) });
  const plantItem = {
    plantId: toMongoId(this.plantId),
    bookmarkedAt: new Date()
  };

  if (!existing) {
    await collection.insertOne({
      _id: toMongoId(random.uuid()),
      userId: toMongoId(userId),
      plants: [plantItem],
      metadata: {
        createdAt: new Date(),
        createdBy: userId,
        updatedAt: new Date(),
        updatedBy: userId
      },
      version: 0
    });
  } else {
    await collection.updateOne(
      { userId: toMongoId(userId) },
      { $push: { plants: plantItem } }
    );
  }
});

Given(
  'another user has the plant in their favorites',
  async function (this: AgroWorld) {
    if (!this.plantId) {
      assert.fail('plantId not set in world');
    }

    const anotherUserId = suite().ids.anotherUser;
    const collection = suite()
      .client.db()
      .collection<MongoUserBookmarksDocument>('user_bookmarks');
    const existing = await collection.findOne({
      userId: toMongoId(anotherUserId)
    });
    const plantItem = {
      plantId: toMongoId(this.plantId),
      bookmarkedAt: new Date()
    };

    if (!existing) {
      await collection.insertOne({
        _id: toMongoId(random.uuid()),
        userId: toMongoId(anotherUserId),
        plants: [plantItem],
        metadata: {
          createdAt: new Date(),
          createdBy: anotherUserId,
          updatedAt: new Date(),
          updatedBy: anotherUserId
        },
        version: 0
      });
    } else {
      await collection.updateOne(
        { userId: toMongoId(anotherUserId) },
        { $push: { plants: plantItem } }
      );
    }
  }
);

Given(
  'a plant exists with primary name {string} and scientific name {string}',
  async function (this: AgroWorld, primary: string, scientificName: string) {
    const [plant] = await suite().seeders.plant.createMany(1, {
      'identity.family': this.familyId,
      'identity.name.primary': primary,
      'identity.scientificName': scientificName
    });
    assert.exists(plant, 'PlantSeeder created no plant');
    this.plantId = plant.id;
  }
);

Then(
  'the response should contain the bookmarked plantId',
  async function (this: AgroWorld) {
    const response = await currentResponse(this);
    const body = response.body as { plantId?: string };
    assert.equal(body.plantId, this.plantId);
  }
);

Then('the bookmarks list should be empty', async function (this: AgroWorld) {
  const response = await currentResponse(this);
  const body = response.body as { plants: unknown[] };
  assert.isArray(body.plants);
  assert.isEmpty(body.plants);
});

Then(
  'the bookmarks list should contain lightweight items',
  async function (this: AgroWorld) {
    const response = await currentResponse(this);
    const body = response.body as {
      plants: Array<{ plantId: string; bookmarkedAt: string; plant?: unknown }>;
    };
    assert.isNotEmpty(body.plants);
    for (const item of body.plants) {
      assert.isString(item.plantId);
      assert.isString(item.bookmarkedAt);
      assert.isUndefined(item.plant);
    }
  }
);

Then(
  'the bookmarks list should contain enriched plant items sorted alphabetically',
  async function (this: AgroWorld) {
    const response = await currentResponse(this);
    const body = response.body as {
      plants: Array<{ plant: { name: string } }>;
    };
    assert.isAbove(body.plants.length, 1);
    for (let i = 0; i < body.plants.length - 1; i++) {
      const current = body.plants[i];
      const next = body.plants[i + 1];
      assert.exists(current);
      assert.exists(next);
      const currentName = current.plant.name;
      const nextName = next.plant.name;
      assert.isAtMost(currentName.localeCompare(nextName), 0);
    }
  }
);

Then(
  'the bookmarks list should only contain active plants',
  async function (this: AgroWorld) {
    const response = await currentResponse(this);
    const body = response.body as {
      plants: Array<{ plantId: string; plant?: { name: string } }>;
    };
    assert.lengthOf(body.plants, 1);
    const onlyItem = body.plants[0];
    assert.exists(onlyItem);
    assert.exists(onlyItem.plant);
    assert.equal(onlyItem.plant.name, 'Tomate');
    if (this.plantId) {
      assert.notEqual(onlyItem.plantId, this.plantId);
    }
  }
);

Then(
  'the check response should indicate bookmarked true',
  async function (this: AgroWorld) {
    const response = await currentResponse(this);
    const body = response.body as {
      bookmarked: boolean;
      bookmarkedAt?: string;
    };
    assert.isTrue(body.bookmarked);
    assert.isString(body.bookmarkedAt);
  }
);

Then(
  'the check response should indicate bookmarked false',
  async function (this: AgroWorld) {
    const response = await currentResponse(this);
    const body = response.body as {
      bookmarked: boolean;
      bookmarkedAt?: string;
    };
    assert.isFalse(body.bookmarked);
    assert.isUndefined(body.bookmarkedAt);
  }
);

Then(
  'the plant should be saved in my favorites',
  async function (this: AgroWorld) {
    if (!this.plantId) {
      assert.fail('plantId not set in world');
    }
    const userId = suite().ids.user;
    const collection = suite()
      .client.db()
      .collection<MongoUserBookmarksDocument>('user_bookmarks');
    const existing = await collection.findOne({
      userId: toMongoId(userId),
      'plants.plantId': toMongoId(this.plantId)
    });
    assert.isNotNull(existing, 'Bookmark was not saved to MongoDB');
  }
);

Then(
  'the plant should not be in my favorites',
  async function (this: AgroWorld) {
    if (!this.plantId) {
      assert.fail('plantId not set in world');
    }
    const userId = suite().ids.user;
    const collection = suite()
      .client.db()
      .collection<MongoUserBookmarksDocument>('user_bookmarks');
    const existing = await collection.findOne({
      userId: toMongoId(userId),
      'plants.plantId': toMongoId(this.plantId)
    });
    assert.isNull(existing, 'Bookmark is still present in MongoDB');
  }
);
