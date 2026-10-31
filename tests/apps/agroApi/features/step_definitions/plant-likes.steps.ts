import { Given, Then } from '@cucumber/cucumber';
import { assert } from 'chai';
import type { Binary } from 'mongodb';

import type { MongoPlantLikeDocument } from '../../../../../src/Contexts/Agro/PlantLikes/infrastructure/persistence/types/MongoPlantLikeDocument.js';
import { toMongoId } from '../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { random } from '../../../../Contexts/shared/fixtures/random.js';
import { currentResponse, suite, type AgroWorld } from './utils/index.js';

const likesCollection = () =>
  suite().client.db().collection<MongoPlantLikeDocument>('plant_likes');

const plantsCollection = () =>
  suite()
    .client.db()
    .collection<{ _id: string | Binary; likesCount?: number }>('plants');

const insertLike = async (
  userIdValue: string,
  plantIdValue: string
): Promise<void> => {
  await likesCollection().insertOne({
    _id: toMongoId(random.uuid()),
    userId: toMongoId(userIdValue),
    plantId: toMongoId(plantIdValue),
    likedAt: new Date()
  });
};

const bumpLikesCount = async (
  plantIdValue: string,
  delta: number
): Promise<void> => {
  await plantsCollection().updateOne(
    { _id: toMongoId(plantIdValue) },
    { $inc: { likesCount: delta } }
  );
};

const setLikesCount = async (
  plantIdValue: string,
  value: number
): Promise<void> => {
  await plantsCollection().updateOne(
    { _id: toMongoId(plantIdValue) },
    { $set: { likesCount: value } }
  );
};

const requirePlantId = (world: AgroWorld): string => {
  if (!world.plantId) {
    assert.fail('plantId not set in world');
  }

  return world.plantId;
};

Given('the current user has liked the plant', async function (this: AgroWorld) {
  const plantId = requirePlantId(this);
  await insertLike(suite().ids.user, plantId);
  await bumpLikesCount(plantId, 1);
});

Given('another user has liked the plant', async function (this: AgroWorld) {
  const plantId = requirePlantId(this);
  await insertLike(suite().ids.anotherUser, plantId);
  await bumpLikesCount(plantId, 1);
});

Given(
  'the plant has {int} likes',
  async function (this: AgroWorld, count: number) {
    const plantId = requirePlantId(this);

    for (let i = 0; i < count; i++) {
      await insertLike(random.uuid(), plantId); // NOSONAR: distinct synthetic likers seeded one by one
    }

    await setLikesCount(plantId, count);
  }
);

Then(
  'the response should contain the liked plantId',
  async function (this: AgroWorld) {
    const response = await currentResponse(this);
    const body = response.body as { plantId?: string };
    assert.equal(body.plantId, this.plantId);
  }
);

Then(
  'the stored plant likesCount should be {int}',
  async function (this: AgroWorld, expected: number) {
    const plantId = requirePlantId(this);
    const plant = await plantsCollection().findOne({
      _id: toMongoId(plantId)
    });
    assert.isNotNull(plant, 'Plant not found in MongoDB');
    assert.equal(plant?.likesCount ?? 0, expected);
  }
);

Then(
  'the plant response likesCount should be {int}',
  async function (this: AgroWorld, expected: number) {
    const response = await currentResponse(this);
    const body = response.body as { likesCount?: number };
    assert.equal(body.likesCount, expected);
  }
);

Then(
  'every listed plant should include a likesCount',
  async function (this: AgroWorld) {
    const response = await currentResponse(this);
    const body = response.body as { data: Array<{ likesCount?: number }> };
    assert.isNotEmpty(body.data, 'The list has no plants to check');
    for (const plant of body.data) {
      assert.isNumber(plant.likesCount);
      assert.isAtLeast(plant.likesCount ?? -1, 0);
    }
  }
);

Then('the plant should be liked by me', async function (this: AgroWorld) {
  const plantId = requirePlantId(this);
  const existing = await likesCollection().findOne({
    userId: toMongoId(suite().ids.user),
    plantId: toMongoId(plantId)
  });
  assert.isNotNull(existing, 'Like was not saved to MongoDB');
});

Then('the plant should not be liked by me', async function (this: AgroWorld) {
  const plantId = requirePlantId(this);
  const existing = await likesCollection().findOne({
    userId: toMongoId(suite().ids.user),
    plantId: toMongoId(plantId)
  });
  assert.isNull(existing, 'Like is still present in MongoDB');
});

Then(
  'the check response should indicate liked true',
  async function (this: AgroWorld) {
    const response = await currentResponse(this);
    const body = response.body as { liked: boolean; likedAt?: string };
    assert.isTrue(body.liked);
    assert.isString(body.likedAt);
  }
);

Then(
  'the check response should indicate liked false',
  async function (this: AgroWorld) {
    const response = await currentResponse(this);
    const body = response.body as { liked: boolean; likedAt?: string };
    assert.isFalse(body.liked);
    assert.isUndefined(body.likedAt);
  }
);
