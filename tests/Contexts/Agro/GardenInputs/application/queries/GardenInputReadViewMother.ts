import type { GardenInputReadView } from '../../../../../../src/Contexts/Agro/GardenInputs/application/queries/index.js';
import { toGardenInputReadView } from '../../../../../../src/Contexts/Agro/GardenInputs/infrastructure/persistence/gardenInputReadViewMapper.js';
import { GardenInputMother } from '../../domain/mothers/GardenInputMother.js';

export const GardenInputReadViewMother = {
  base(): GardenInputReadView {
    return toGardenInputReadView(GardenInputMother.mongoBase());
  },

  deleted(): GardenInputReadView {
    return toGardenInputReadView(
      GardenInputMother.mongoBase({ status: 'deleted', deletedAt: new Date() })
    );
  },

  withSlug(slug: string): GardenInputReadView {
    return toGardenInputReadView(GardenInputMother.mongoBase({ slug }));
  }
};
