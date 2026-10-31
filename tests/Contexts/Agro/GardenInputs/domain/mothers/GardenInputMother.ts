import { GardenInput } from '../../../../../../src/Contexts/Agro/GardenInputs/domain/entities/GardenInput.js';
import type {
  GardenInputChanges,
  GardenInputPrimitives,
  GardenInputProps
} from '../../../../../../src/Contexts/Agro/GardenInputs/domain/entities/types/index.js';
import { createGardenInputId } from '../../../../../../src/Contexts/Agro/GardenInputs/domain/GardenInputId.js';
import type { MongoGardenInputDocument } from '../../../../../../src/Contexts/Agro/GardenInputs/infrastructure/persistence/types/MongoGardenInputDocument.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { toMongoId } from '../../../../../../src/Contexts/shared/infrastructure/persistence/mongo/MongoId.js';
import { random } from '../../../../shared/fixtures/random.js';

const USER = 'test-curator';

const GARDEN_INPUT_BASE_VALUES = {
  slug: 'jabon-potasico',
  name: 'Jabón potásico',
  description: 'Insecticida biológico de contacto y surfactante natural.',
  category: 'defense' as const,
  actions: ['insecticide' as const],
  activeIngredients: ['Oleato de potasio'],
  nutrients: ['K'],
  targets: ['Pulgón', 'Mosca blanca'],
  recipes: [
    {
      name: 'Fabricación casera de jabón potásico',
      description: 'Saponificación en caliente de aceite vegetal con KOH.',
      ingredients: [
        { item: 'Aceite vegetal', quantity: '120 g' },
        { item: 'Potasa cáustica (KOH)', quantity: '20 g' },
        { item: 'Agua blanda o destilada', quantity: '20 g' }
      ],
      instructions: [
        'Disolver con precaución la potasa cáustica en agua.',
        'Calentar el aceite vegetal a 50 °C.',
        'Batir hasta alcanzar la traza espesa.',
        'Dejar reposar 24 horas.'
      ],
      brewTime: '24 horas de reposo',
      dosage: {
        method: 'foliar' as const,
        dilution: '15-20 g/L (1.5-2%)',
        frequency: 'Preventivo semanal'
      },
      storage: {
        duration: 'Hasta 2 años',
        conditions: 'Recipiente hermético opaco en lugar fresco'
      },
      safetyNotes: ['Reacción exotérmica: usar guantes y gafas protectoras.']
    }
  ],
  resources: [
    {
      type: 'video' as const,
      url: 'https://www.youtube.com/watch?v=potassium-soap',
      title: 'Cómo hacer jabón potásico',
      source: 'YouTube',
      tags: ['insecticida']
    }
  ]
};

export const GardenInputMother = {
  domainBase: (overrides?: Partial<GardenInputProps>): GardenInput =>
    GardenInput.create(GardenInputMother.propsBase(overrides)),

  propsBase: (overrides?: Partial<GardenInputProps>): GardenInputProps => ({
    id: createGardenInputId(random.uuid()),
    ...GARDEN_INPUT_BASE_VALUES,
    status: 'active',
    metadata: Metadata.create(USER),
    version: 0,
    ...overrides
  }),

  primitivesBase: (
    overrides?: Partial<GardenInputPrimitives>
  ): GardenInputPrimitives => ({
    id: random.uuid(),
    ...GARDEN_INPUT_BASE_VALUES,
    status: 'active',
    metadata: Metadata.create(USER).toPrimitives(),
    version: 0,
    ...overrides
  }),

  mongoBase: (
    overrides?: Partial<MongoGardenInputDocument>
  ): MongoGardenInputDocument => ({
    _id: toMongoId(random.uuid()),
    ...GARDEN_INPUT_BASE_VALUES,
    status: 'active',
    metadata: Metadata.create(USER).toPrimitives(),
    version: 0,
    ...overrides
  }),

  changesBase: (
    overrides?: Partial<GardenInputChanges>
  ): GardenInputChanges => ({
    name: 'Jabón potásico concentrado',
    description: 'Fórmula reforzada con extracto cítrico.',
    ...overrides
  })
};
