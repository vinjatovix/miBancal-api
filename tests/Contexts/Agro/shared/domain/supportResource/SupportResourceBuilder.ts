import type { SupportResourcePrimitives } from '../../../../../../src/Contexts/Agro/shared/domain/supportResource/index.js';
import { random } from '../../../../shared/fixtures/random.js';

export type SupportResource = SupportResourcePrimitives;

const resource = (
  type: SupportResource['type'],
  overrides: Partial<SupportResource>
): SupportResource => ({
  type,
  url: random.url(),
  title: random.description(),
  source: random.word({ min: 3, max: 12 }),
  ...overrides
});

export const SupportResourceBuilder = {
  image(overrides: Partial<SupportResource> = {}): SupportResource {
    return resource('image', overrides);
  },

  /** A resource with only `type` and `url`. */
  bare(
    type: SupportResource['type'] = 'image',
    url: string = random.url()
  ): SupportResource {
    return { type, url };
  },

  video(overrides: Partial<SupportResource> = {}): SupportResource {
    return resource('video', overrides);
  },

  article(overrides: Partial<SupportResource> = {}): SupportResource {
    return resource('article', overrides);
  }
};
