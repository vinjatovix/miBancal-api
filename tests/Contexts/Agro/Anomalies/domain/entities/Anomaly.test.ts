import { createAnomalyId } from '../../../../../../src/Contexts/Agro/Anomalies/domain/AnomalyId.js';
import { Anomaly } from '../../../../../../src/Contexts/Agro/Anomalies/domain/entities/Anomaly.js';
import { AnomalyStatus } from '../../../../../../src/Contexts/Agro/Anomalies/domain/entities/types/AnomalyStatus.js';
import {
  DomainConflictException,
  InvalidArgumentException
} from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { random } from '../../../../shared/fixtures/random.js';
import { SupportResourceBuilder } from '../../../shared/domain/supportResource/SupportResourceBuilder.js';
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

    it.each(['fungus', 'weed'])(
      'rejects a category outside the closed set (%s)',
      (category) => {
        expect(() =>
          Anomaly.create({
            id: createAnomalyId(random.uuid()),
            slug: 'pulgon',
            name: 'Pulgón',
            category: category as never,
            metadata: Metadata.create(USER)
          })
        ).toThrow(InvalidArgumentException);
      }
    );

    it.each(['pest', 'disease', 'disorder'] as const)(
      'accepts a valid category (%s)',
      (category) => {
        const anomaly = AnomalyScenarios.domainBase({ category });

        expect(anomaly.category).toBe(category);
      }
    );

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

  describe('resources', () => {
    it('round-trips a mixed list that carries no image', () => {
      const resources = [
        SupportResourceBuilder.article(),
        SupportResourceBuilder.video()
      ];
      const anomaly = AnomalyScenarios.domainBase({ resources });

      expect(anomaly.resources).toHaveLength(2);
      expect(anomaly.resources?.map((r) => r.type)).toEqual([
        'article',
        'video'
      ]);
    });

    it('round-trips a bare resource with only type and url', () => {
      const bare = SupportResourceBuilder.bare('image');
      const anomaly = AnomalyScenarios.domainBase({ resources: [bare] });

      expect(anomaly.resources).toStrictEqual([bare]);
    });

    it('stores an empty resources list as absent', () => {
      const anomaly = AnomalyScenarios.domainBase({ resources: [] });

      expect(anomaly.resources).toBeUndefined();
    });

    it('rejects a resource with an unrecognised type', () => {
      expect(() =>
        AnomalyScenarios.domainBase({
          // @ts-expect-error invalid resource type on purpose
          resources: [{ type: 'audio', url: 'https://example.org/x' }]
        })
      ).toThrow(InvalidArgumentException);
    });

    it('clears resources with null while keeping confusedWith', () => {
      const anomaly = AnomalyScenarios.domainBase({
        resources: [SupportResourceBuilder.image()],
        confusedWith: ['mildiu']
      });

      anomaly.updateGuidance({ resources: null }, USER);

      expect(anomaly.resources).toBeUndefined();
      expect(anomaly.confusedWith).toStrictEqual(['mildiu']);
    });
  });

  describe('confusedWith', () => {
    it('deduplicates slugs case-insensitively, keeping the first', () => {
      const anomaly = AnomalyScenarios.domainBase({
        confusedWith: ['mildiu', 'Mildiu', 'oidio']
      });

      expect(anomaly.confusedWith).toEqual(['mildiu', 'oidio']);
    });

    it('silently removes the entry own slug without raising', () => {
      const anomaly = AnomalyScenarios.domainBase({
        slug: 'pulgon',
        confusedWith: ['pulgon', 'mildiu']
      });

      expect(anomaly.confusedWith).toEqual(['mildiu']);
    });

    it('stores an all-self confusedWith as absent', () => {
      const anomaly = AnomalyScenarios.domainBase({
        slug: 'pulgon',
        confusedWith: ['Pulgon']
      });

      expect(anomaly.confusedWith).toBeUndefined();
    });

    it('clears resources and confusedWith independently in one update', () => {
      const anomaly = AnomalyScenarios.domainBase({
        resources: [SupportResourceBuilder.image()],
        confusedWith: ['mildiu']
      });

      anomaly.updateGuidance(
        { resources: null, confusedWith: ['oidio'] },
        USER
      );

      expect(anomaly.resources).toBeUndefined();
      expect(anomaly.confusedWith).toStrictEqual(['oidio']);
    });
  });
});
