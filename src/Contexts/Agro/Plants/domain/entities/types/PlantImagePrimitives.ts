import type { SupportResourcePrimitives } from '../../../../shared/domain/supportResource/index.js';

/** The plant's primary picture: the first `knowledge.resources` image. */
export type PlantImagePrimitives = Pick<
  SupportResourcePrimitives,
  'url' | 'title' | 'source'
>;
