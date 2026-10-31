import {
  PLANT_FIELDS,
  type PlantField,
  type PlantReadView
} from '../../../../../../../src/Contexts/Agro/Plants/application/queries/index.js';
import type { Plant } from '../../../../../../../src/Contexts/Agro/Plants/domain/entities/Plant.js';
import {
  toPlantImage,
  toPlantReadView,
  toPlantSparseView,
  type StoredPlantDocument
} from '../../../../../../../src/Contexts/Agro/Plants/infrastructure/persistence/mongo/plantReadViewMapper.js';
import type { MongoPlantDocument } from '../../../../../../../src/Contexts/Agro/Plants/infrastructure/persistence/types/MongoPlantDocument.js';
import {
  plantPersistenceMapper,
  toPlantResponse
} from '../../../../../../../src/Contexts/Agro/Plants/mappers/index.js';
import { PlantFactory } from '../../../domain/mothers/PlantFactory.js';
import { PlantIdentityBuilder } from '../../../domain/mothers/PlantIdentityBuilder.js';
import { PlantKnowledgeBuilder } from '../../../domain/mothers/PlantKnowledgeBuilder.js';
import { PlantResourceBuilder } from '../../../domain/mothers/PlantResourceBuilder.js';
import { PlantTraitsBuilder } from '../../../domain/mothers/PlantTraitsBuilder.js';
import { projectedPlantDocument } from './projectedPlantDocument.js';

// The body a write sends: the stored document round-tripped through the
// aggregate. The read view must equal it for every document.
const domainRoundTrip = (document: MongoPlantDocument): unknown =>
  toPlantResponse(plantPersistenceMapper.fromMongoDocument(document));

// The read view of a stored document, read through the contract projection.
const readView = (document: MongoPlantDocument): PlantReadView =>
  toPlantReadView(projectedPlantDocument(document));

const stored = (plant: Plant): MongoPlantDocument =>
  plantPersistenceMapper.toMongoDocument(plant);

const without = <K extends keyof MongoPlantDocument>(
  document: MongoPlantDocument,
  key: K
): MongoPlantDocument => {
  const copy = { ...document };
  delete copy[key];

  return copy;
};

const deletedPlant = (): Plant => {
  const plant = PlantFactory.random();
  plant.markAsDeleted('test-user');

  return plant;
};

describe('toPlantReadView', () => {
  describe('matches the aggregate round-trip', () => {
    it.each([
      ['a generic plant', () => PlantFactory.create()],
      [
        'a plant with ecological traits',
        () => PlantFactory.create({ traits: PlantTraitsBuilder.potato() })
      ],
      ['a random plant', () => PlantFactory.random()],
      ['a tomato', () => PlantFactory.tomato()],
      ['a lettuce', () => PlantFactory.lettuce()],
      ['a fully described plant', () => PlantFactory.full()],
      [
        'a plant with full knowledge',
        () => PlantFactory.random({ knowledge: PlantKnowledgeBuilder.full() })
      ],
      [
        'a plant with aliases',
        () =>
          PlantFactory.random({ identity: PlantIdentityBuilder.withAliases() })
      ],
      [
        'a plant with image resources',
        () =>
          PlantFactory.random({
            knowledge: PlantKnowledgeBuilder.withResources([
              PlantResourceBuilder.video(),
              PlantResourceBuilder.image(),
              PlantResourceBuilder.image()
            ])
          })
      ],
      ['a deleted plant', deletedPlant]
    ])('for %s', (_case, build) => {
      const document = stored(build());

      const read = readView(document);
      const expected = {
        ...(domainRoundTrip(document) as Record<string, unknown>),
        slug: document.slug
      };

      expect(read).toEqual(expected);
    });

    it('when the stored version is missing (read as 0)', () => {
      const document = without(stored(PlantFactory.tomato()), 'version');

      const view = readView(document);

      expect(view.version).toBe(0);
      expect(view).toEqual(domainRoundTrip(document));
    });

    it('when the stored deletedAt is missing (sent as null)', () => {
      const document = without(stored(PlantFactory.tomato()), 'deletedAt');

      const view = readView(document);

      expect(view.deletedAt).toBeNull();
      expect(view).toEqual(domainRoundTrip(document));
    });

    // No `Plant` can hold it (every plant has an image), so there is no
    // round trip to compare with: the read view copies what is stored.
    it('when the stored knowledge is missing (sent as {}, image null)', () => {
      const document = without(stored(PlantFactory.tomato()), 'knowledge');

      const view = readView(document);

      expect(view.knowledge).toEqual({});
      expect(view.image).toBeNull();
    });

    it('when the stored aliases are missing (key left out, never null)', () => {
      const document = stored(PlantFactory.tomato());

      const view = readView(document);

      expect(view.identity.name).not.toHaveProperty('aliases');
      expect(view).toEqual(domainRoundTrip(document));
    });

    it('for a deleted plant, keeping its status and deletion date', () => {
      const document = stored(deletedPlant());

      const view = readView(document);

      expect(view.status).toBe('DELETED');
      expect(view.deletedAt).toEqual(expect.any(String));
      expect(view).toEqual(domainRoundTrip(document));
    });
  });

  describe('id', () => {
    it('reads a Binary UUID _id as its string form', () => {
      const plant = PlantFactory.tomato();

      expect(readView(stored(plant)).id).toBe(plant.id);
    });

    it('reads a string _id as is', () => {
      const plant = PlantFactory.tomato();
      const document = { ...stored(plant), _id: plant.id };

      expect(readView(document).id).toBe(plant.id);
      expect(readView(document)).toEqual(domainRoundTrip(document));
    });
  });

  it('keeps the family as the stored plain id', () => {
    const plant = PlantFactory.tomato();

    expect(readView(stored(plant)).identity.family).toBe(plant.identity.family);
  });

  describe('genus (derived, hardened)', () => {
    it('derives genus from scientificName (tomato → Solanum)', () => {
      const document = stored(PlantFactory.tomato());

      expect(readView(document).identity.genus).toBe('Solanum');
    });

    it('strips a stale stored genus and re-derives the correct one', () => {
      const document = stored(PlantFactory.tomato());
      const stale = {
        ...document,
        identity: { ...document.identity, genus: 'Stale' }
      };

      expect(readView(stale).identity.genus).toBe('Solanum');
    });

    it('omits genus for a hybrid-prefix scientific name', () => {
      const document = stored(PlantFactory.tomato());
      const hybrid = {
        ...document,
        identity: { ...document.identity, scientificName: '×Brassicoraphanus' }
      };

      expect(readView(hybrid).identity).not.toHaveProperty('genus');
    });

    it('read-view genus equals write-response genus (parity)', () => {
      const document = stored(PlantFactory.tomato());

      const view = readView(document);
      const response = domainRoundTrip(document) as {
        identity: { genus?: string };
      };

      expect(view.identity.genus).toBe(response.identity.genus);
    });
  });

  it('builds no aggregate: a document breaking a business rule is copied', () => {
    const document = stored(PlantFactory.tomato());
    const broken = {
      ...document,
      traits: {
        ...document.traits,
        size: { ...document.traits.size, height: { min: 50, max: 10 } }
      }
    };

    expect(readView(broken).traits.size.height).toEqual({
      min: 50,
      max: 10
    });
  });
});

// What a read with a narrowed projection gets back: `_id` and the fields.
const projected = (
  document: StoredPlantDocument,
  fields: readonly PlantField[]
): StoredPlantDocument =>
  Object.fromEntries(
    Object.entries(document).filter(
      ([key]) => key === '_id' || fields.includes(key as PlantField)
    )
  ) as StoredPlantDocument;

describe('toPlantSparseView', () => {
  it('returns id and only the selected fields', () => {
    const document = stored(PlantFactory.tomato());
    const fields: PlantField[] = ['identity', 'traits'];

    const view = toPlantSparseView(projected(document, fields), fields);

    expect(Object.keys(view).sort()).toEqual(['id', 'identity', 'traits']);
    expect(view.identity).toEqual(toPlantReadView(document).identity);
  });

  it('returns only id for an empty fieldset', () => {
    const document = stored(PlantFactory.random());

    expect(toPlantSparseView(projected(document, []), [])).toEqual({
      id: toPlantReadView(document).id
    });
  });

  it('applies the same defaults as the full view', () => {
    const {
      version: _version,
      status: _status,
      knowledge: _knowledge,
      ...legacy
    } = stored(PlantFactory.random());
    const document = legacy as StoredPlantDocument;
    const fields: PlantField[] = ['version', 'status', 'knowledge'];

    const view = toPlantSparseView(projected(document, fields), fields);
    const full = toPlantReadView(document);

    expect(view).toEqual({
      id: full.id,
      version: full.version,
      status: full.status,
      knowledge: full.knowledge
    });
  });

  it.each([
    ['a live plant', () => PlantFactory.full()],
    ['a deleted plant', deletedPlant]
  ])(
    'equals the full view when every field is selected for %s',
    (_case, build) => {
      const document = stored(build());
      const fields = PLANT_FIELDS.filter((field) => field !== 'id');

      expect(toPlantSparseView(document, fields)).toEqual(
        toPlantReadView(document)
      );
    }
  );
});

describe('likesCount projection', () => {
  it('projects the stored likesCount into the read view', () => {
    const document = { ...stored(PlantFactory.tomato()), likesCount: 42 };

    expect(readView(document).likesCount).toBe(42);
  });

  it('defaults likesCount to 0 when the document has none', () => {
    const document = stored(PlantFactory.tomato());

    expect(document).not.toHaveProperty('likesCount');
    expect(readView(document).likesCount).toBe(0);
  });
});

describe('genus projection', () => {
  const withScientificName = (name: string): MongoPlantDocument => {
    const document = stored(PlantFactory.tomato());

    return {
      ...document,
      identity: { ...document.identity, scientificName: name }
    };
  };

  it('derives the capitalized genus from the first word of the scientific name', () => {
    expect(
      readView(withScientificName('solanum lycopersicum')).identity.genus
    ).toBe('Solanum');
  });

  it('takes the genus even when a hybrid "×" marker follows it', () => {
    expect(readView(withScientificName('citrus × limon')).identity.genus).toBe(
      'Citrus'
    );
  });

  it('omits genus when none can be derived (leading hybrid "×")', () => {
    const view = readView(withScientificName('× Citrofortunella microcarpa'));

    expect(view.identity).not.toHaveProperty('genus');
  });
});

describe('toPlantImage', () => {
  it.each([
    ['missing', undefined],
    ['null', null]
  ])('is null when the projected image is %s', (_case, image) => {
    expect(toPlantImage(image)).toBeNull();
  });

  it('is null when the url is not a string', () => {
    const malformed = {
      ...PlantResourceBuilder.image(),
      url: 42
    } as unknown as StoredPlantDocument['image'];

    expect(toPlantImage(malformed)).toBeNull();
  });

  it('leaves out a title or source that is not a string', () => {
    const malformed = {
      ...PlantResourceBuilder.image(),
      title: 42,
      source: null
    } as unknown as StoredPlantDocument['image'];

    expect(toPlantImage(malformed)).toStrictEqual({ url: malformed?.url });
  });

  it('keeps url, title and source, dropping type and tags', () => {
    const resource = PlantResourceBuilder.image({ tags: ['fruit'] });

    expect(toPlantImage(resource)).toEqual({
      url: resource.url,
      title: resource.title,
      source: resource.source
    });
  });

  it('leaves out the title and source the resource lacks', () => {
    const resource = PlantResourceBuilder.bareImage();

    const image = toPlantImage(resource);

    expect(image).toEqual({ url: resource.url });
    expect(image).not.toHaveProperty('title');
    expect(image).not.toHaveProperty('source');
  });

  it('keeps image as null in a sparse view, never dropping the key', () => {
    const document = projectedPlantDocument(
      without(stored(PlantFactory.create()), 'knowledge')
    );

    expect(
      toPlantSparseView(projected(document, ['image']), ['image'])
    ).toEqual({ id: toPlantReadView(document).id, image: null });
  });
});
