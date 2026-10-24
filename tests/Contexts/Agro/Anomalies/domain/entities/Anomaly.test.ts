import { createAnomalyId } from '../../../../../../src/Contexts/Agro/Anomalies/domain/AnomalyId.js';
import { Anomaly } from '../../../../../../src/Contexts/Agro/Anomalies/domain/entities/Anomaly.js';
import { AnomalyStatus } from '../../../../../../src/Contexts/Agro/Anomalies/domain/entities/types/AnomalyStatus.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { random } from '../../../../shared/fixtures/random.js';
import { AnomalyScenarios } from '../mothers/AnomalyScenarios.js';

const USER = 'curator';

describe('Anomaly aggregate', () => {
  describe('create', () => {
    it('normalises and starts ACTIVE at version 0', () => {
      const anomaly = AnomalyScenarios.domainBase();

      expect(anomaly.status).toBe(AnomalyStatus.ACTIVE);
      expect(anomaly.version).toBe(0);
      expect(anomaly.isDeleted()).toBe(false);
      expect(anomaly.deletedAt).toBeUndefined();
    });

    it('drops blanks and case-insensitive duplicates from guidance lists', () => {
      const anomaly = AnomalyScenarios.domainBase({
        symptoms: ['Curled leaves', 'curled leaves', '  ', 'Honeydew']
      });

      expect(anomaly.symptoms).toEqual(['Curled leaves', 'Honeydew']);
    });

    it('stores an empty optional list as absent', () => {
      const anomaly = AnomalyScenarios.domainBase({ naturalEnemies: [] });

      expect(anomaly.naturalEnemies).toBeUndefined();
    });

    it('rejects a category outside the closed set', () => {
      expect(() =>
        Anomaly.create({
          id: createAnomalyId(random.uuid()),
          slug: 'pulgon',
          name: 'Pulgón',
          // @ts-expect-error invalid category on purpose
          category: 'fungus',
          metadata: Metadata.create(USER)
        })
      ).toThrow(InvalidArgumentException);
    });

    it('rejects a blank required name', () => {
      expect(() => AnomalyScenarios.domainBase({ name: '   ' })).toThrow(
        InvalidArgumentException
      );
    });
  });

  describe('updateGuidance (merge-patch)', () => {
    it('replaces a provided field and keeps omitted ones', () => {
      const anomaly = AnomalyScenarios.domainBase();

      anomaly.updateGuidance({ name: 'Áfido' }, USER);

      expect(anomaly.name).toBe('Áfido');
      expect(anomaly.slug).toBe('pulgon');
    });

    it('clears an optional field with null', () => {
      const anomaly = AnomalyScenarios.domainBase();

      anomaly.updateGuidance({ description: null, treatment: null }, USER);

      expect(anomaly.description).toBeUndefined();
      expect(anomaly.treatment).toBeUndefined();
    });

    it('re-normalises a replaced list', () => {
      const anomaly = AnomalyScenarios.domainBase();

      anomaly.updateGuidance({ symptoms: ['A', 'a', 'B'] }, USER);

      expect(anomaly.symptoms).toEqual(['A', 'B']);
    });

    it('is a no-op when nothing changes (metadata untouched)', () => {
      const anomaly = AnomalyScenarios.domainBase();
      const before = anomaly.metadata.toPrimitives();

      anomaly.updateGuidance({}, USER, new Date(Date.now() + 1000));

      expect(anomaly.metadata.toPrimitives()).toEqual(before);
    });

    it('cannot mutate a deleted anomaly', () => {
      const anomaly = AnomalyScenarios.domainDeleted();

      expect(() => anomaly.updateGuidance({ name: 'x' }, USER)).toThrow(
        DomainConflictException
      );
    });
  });

  describe('markAsDeleted', () => {
    it('moves ACTIVE to DELETED and sets deletedAt', () => {
      const anomaly = AnomalyScenarios.domainBase();
      const at = new Date();

      anomaly.markAsDeleted(USER, at);

      expect(anomaly.status).toBe(AnomalyStatus.DELETED);
      expect(anomaly.isDeleted()).toBe(true);
      expect(anomaly.deletedAt).toEqual(at);
    });

    it('is idempotent on an already deleted anomaly', () => {
      const anomaly = AnomalyScenarios.domainDeleted();
      const previous = anomaly.deletedAt;

      anomaly.markAsDeleted(USER);

      expect(anomaly.deletedAt).toEqual(previous);
    });
  });
});
