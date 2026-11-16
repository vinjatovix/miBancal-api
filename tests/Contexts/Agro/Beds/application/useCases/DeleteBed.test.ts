import { DeleteBed } from '../../../../../../src/Contexts/Agro/Beds/application/useCases/DeleteBed.js';
import { BedDeleted } from '../../../../../../src/Contexts/Agro/Beds/domain/events/index.js';
import type { UserSessionInfo } from '../../../../../../src/Contexts/Auth/application/index.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import type { EventBus } from '../../../../../../src/Contexts/shared/application/eventBus/index.js';
import type { UnitOfWork } from '../../../../../../src/Contexts/shared/application/interfaces/index.js';
import {
  DomainNotFoundException,
  DomainStaleVersionException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import type { DomainEvent } from '../../../../../../src/Contexts/shared/domain/events/index.js';
import { UnitOfWorkMock } from '../../../../shared/__mocks__/UnitOfWorkMock.js';
import { random } from '../../../../shared/fixtures/random.js';
import { BedRepositoryMock } from '../../__mocks__/BedRepositoryMock.js';
import { BedFactory } from '../../domain/mothers/BedFactory.js';

describe('DeleteBed', () => {
  const CURRENT_VERSION = 0;
  let bedRepository: BedRepositoryMock;
  let publish: jest.Mock<Promise<void>, [DomainEvent[]]>;
  let eventBus: EventBus;
  let unitOfWork: UnitOfWorkMock;
  let useCase: DeleteBed;
  const USER: UserSessionInfo = {
    username: 'test-user',
    id: random.uuid(),
    email: random.email(),
    roles: ['user']
  };

  beforeEach(() => {
    bedRepository = new BedRepositoryMock();
    publish = jest.fn<Promise<void>, [DomainEvent[]]>().mockResolvedValue();
    eventBus = { publish, subscribe: jest.fn() };
    unitOfWork = new UnitOfWorkMock();
    useCase = new DeleteBed({ bedRepository, eventBus, unitOfWork });
  });

  describe('announcing the deletion', () => {
    it('publishes exactly the recorded BedDeleted fact inside the unit and drains the buffer', async () => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);
      const write = unitOfWork.trace(
        'deleteBed',
        bedRepository.updateWithDiff.bind(bedRepository)
      );
      jest.spyOn(bedRepository, 'updateWithDiff').mockImplementation(write);
      publish.mockImplementation(
        unitOfWork.trace('publish', (): Promise<void> => Promise.resolve())
      );

      await useCase.execute(bed.id, USER, [bed.version]);

      expect(unitOfWork.runCount).toBe(1);
      expect(unitOfWork.tracedCalls).toEqual([
        { name: 'deleteBed', insideUnit: true, unit: 1 },
        { name: 'publish', insideUnit: true, unit: 1 }
      ]);
      expect(publish).toHaveBeenCalledTimes(1);

      const [firstCall] = publish.mock.calls;
      const published = firstCall?.[0] ?? [];
      expect(published).toHaveLength(1);

      const [event] = published;
      expect(event).toBeInstanceOf(BedDeleted);
      expect(event?.payload).toEqual({
        bedId: bed.id,
        ownerId: USER.id,
        deletedBy: USER.username,
        occurredAt: expect.any(String) as string
      });
      expect(bedRepository.getStored(bed.id)?.pullDomainEvents()).toHaveLength(
        0
      );
    });

    it('re-announces the captured fact on a retried attempt without draining it to empty', async () => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);
      jest.spyOn(bedRepository, 'updateWithDiff').mockResolvedValue('written');
      const retryingUnitOfWork: UnitOfWork = {
        async run<T>(work: () => Promise<T>): Promise<T> {
          await work();

          return work();
        }
      };
      useCase = new DeleteBed({
        bedRepository,
        eventBus,
        unitOfWork: retryingUnitOfWork
      });

      await useCase.execute(bed.id, USER, [bed.version]);

      expect(publish).toHaveBeenCalledTimes(2);
      for (const [batch] of publish.mock.calls) {
        expect(batch).toHaveLength(1);
        expect(batch?.[0]).toBeInstanceOf(BedDeleted);
      }
    });

    it('never opens a unit nor announces anything for a missing bed', async () => {
      await expect(
        useCase.execute(random.uuid(), USER, [CURRENT_VERSION])
      ).rejects.toBeInstanceOf(DomainNotFoundException);

      expect(unitOfWork.runCount).toBe(0);
      expect(publish).not.toHaveBeenCalled();
    });

    it.each([
      ['a missing If-Match', []],
      ['a stale If-Match', [CURRENT_VERSION + 1]]
    ])('never announces anything for %s', async (_case, expectedVersions) => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);

      await expect(
        useCase.execute(bed.id, USER, expectedVersions)
      ).rejects.toBeInstanceOf(DomainStaleVersionException);

      expect(unitOfWork.runCount).toBe(0);
      expect(publish).not.toHaveBeenCalled();
    });

    it('rejects and aborts the unit when a reactor throws while handling the fact', async () => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);
      publish.mockRejectedValueOnce(new Error('reactor failed'));

      await expect(
        useCase.execute(bed.id, USER, [bed.version])
      ).rejects.toThrow();

      expect(unitOfWork.runCount).toBe(1);
      expect(publish).toHaveBeenCalledTimes(1);
    });
  });

  it('marks the bed as deleted via updateWithDiff on a genuine deletion', async () => {
    const bed = BedFactory.fromUser(USER);
    bedRepository.addToStorage(bed);

    await useCase.execute(bed.id, USER, [CURRENT_VERSION]);

    expect(bedRepository.getStored(bed.id)?.isDeleted).toBe(true);
    bedRepository.assertUpdateCalled();
    bedRepository.assertSaveNotCalled();
  });

  it('stores the deleting user and time as audit data with one read and one write', async () => {
    const bed = BedFactory.fromUser(USER);
    bedRepository.addToStorage(bed);
    const deleter: UserSessionInfo = { ...USER, username: 'deleter' };

    await useCase.execute(bed.id, deleter, [bed.version]);

    const stored = bedRepository.getStoredPrimitives(bed.id);
    expect(stored?.metadata.updatedBy).toBe('deleter');
    expect(stored?.metadata.updatedAt.toISOString()).toBe(stored?.deletedAt);
    expect(stored?.metadata.createdBy).toBe(bed.metadata.createdBy);
    expect(stored?.version).toBe(bed.version + 1);
    bedRepository.assertReadCalledTimes('findOwnedActiveById', 1);
    bedRepository.assertUpdateCalledTimes(1);
  });

  it('throws not found if bed already deleted (repeat delete)', async () => {
    const bed = BedFactory.create({
      deleted: true,
      deletedAt: new Date(),
      userId: createUserId(USER.id)
    });

    bedRepository.addToStorage(bed);

    await expect(
      useCase.execute(bed.id, USER, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    bedRepository.assertUpdateNotCalled();
    bedRepository.assertSaveNotCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  it('reports the missing bed id in the not found message', async () => {
    const nonExistentId = random.uuid();
    const expectedMessage = `Bed not found: ${nonExistentId}`;

    await expect(
      useCase.execute(nonExistentId, USER, [CURRENT_VERSION])
    ).rejects.toMatchObject({ message: expectedMessage });
  });

  it('throws not found if user is not the owner of the bed (foreign bed)', async () => {
    const bed = BedFactory.fromUser(USER);
    bedRepository.addToStorage(bed);
    const otherUser: UserSessionInfo = {
      username: 'other-user',
      id: random.uuid(),
      email: random.email(),
      roles: ['user']
    };

    await expect(
      useCase.execute(bed.id, otherUser, [CURRENT_VERSION])
    ).rejects.toBeInstanceOf(DomainNotFoundException);
    bedRepository.assertUpdateNotCalled();
    expect(publish).not.toHaveBeenCalled();
  });

  describe('optimistic concurrency', () => {
    it('soft-deletes via updateWithDiff when expectedVersion matches', async () => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);

      await useCase.execute(bed.id, USER, [bed.version]);

      expect(bedRepository.getStored(bed.id)?.isDeleted).toBe(true);
      expect(bedRepository.getStored(bed.id)?.version).toBe(bed.version + 1);
    });

    it('throws DomainStaleVersionException without writing when expectedVersion is outdated', async () => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);

      await expect(
        useCase.execute(bed.id, USER, [bed.version + 1])
      ).rejects.toBeInstanceOf(DomainStaleVersionException);

      bedRepository.assertUpdateNotCalled();
      expect(bedRepository.getStored(bed.id)?.isDeleted).toBe(false);
    });

    it('throws DomainNotFoundException (not stale) for an absent bed with a wrong version', async () => {
      await expect(
        useCase.execute(random.uuid(), USER, [999])
      ).rejects.toBeInstanceOf(DomainNotFoundException);
    });

    it('reads once, writes once and never runs the existence check on success', async () => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);

      await useCase.execute(bed.id, USER, [bed.version]);

      bedRepository.assertReadCalledTimes('findOwnedActiveById', 1);
      bedRepository.assertUpdateCalledTimes(1);
      bedRepository.assertExistenceCountCalledTimes(0);
    });
  });

  describe('expected version lists', () => {
    it('proceeds when the list contains the current version', async () => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);

      await useCase.execute(bed.id, USER, [bed.version + 1, bed.version]);

      expect(bedRepository.getStored(bed.id)?.isDeleted).toBe(true);
    });

    it('answers stale for an empty list without writing', async () => {
      const bed = BedFactory.fromUser(USER);
      bedRepository.addToStorage(bed);

      const remove = useCase.execute(bed.id, USER, []);

      await expect(remove).rejects.toBeInstanceOf(DomainStaleVersionException);
      bedRepository.assertUpdateNotCalled();
    });

    it('answers not found before checking an empty list', async () => {
      const remove = useCase.execute(random.uuid(), USER, []);

      await expect(remove).rejects.toBeInstanceOf(DomainNotFoundException);
    });
  });
});
