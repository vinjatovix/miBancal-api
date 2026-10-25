import { normaliseSupportResources } from '../../../../../../src/Contexts/Agro/shared/domain/supportResource/index.js';
import type { SupportResourcePrimitives } from '../../../../../../src/Contexts/Agro/shared/domain/supportResource/index.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { SupportResourceBuilder } from './SupportResourceBuilder.js';

describe('normaliseSupportResources', () => {
  it('trims title and source labels', () => {
    const [normalised] = normaliseSupportResources([
      SupportResourceBuilder.image({
        title: '  Powdery mildew  ',
        source: ' Wiki '
      })
    ]);

    expect(normalised).toMatchObject({
      title: 'Powdery mildew',
      source: 'Wiki'
    });
  });

  it('drops a blank label instead of storing an empty string', () => {
    const [normalised] = normaliseSupportResources([
      SupportResourceBuilder.image({ title: '   ', source: '' })
    ]);

    expect(normalised).not.toHaveProperty('title');
    expect(normalised).not.toHaveProperty('source');
  });

  it('drops blank tags and case-insensitive duplicate tags', () => {
    const [normalised] = normaliseSupportResources([
      SupportResourceBuilder.image({ tags: [' Leaf ', 'leaf', '', 'Stem'] })
    ]);

    expect(normalised?.tags).toStrictEqual(['Leaf', 'Stem']);
  });

  it('omits tags entirely when none survive normalisation', () => {
    const [normalised] = normaliseSupportResources([
      SupportResourceBuilder.image({ tags: ['', '   '] })
    ]);

    expect(normalised).not.toHaveProperty('tags');
  });

  it('rejects an unrecognised type', () => {
    const bad = {
      type: 'audio',
      url: 'https://example.org/x'
    } as unknown as SupportResourcePrimitives;

    expect(() => normaliseSupportResources([bad])).toThrow(
      InvalidArgumentException
    );
  });

  it('rejects a missing or blank url', () => {
    const bad = {
      type: 'image',
      url: '   '
    } as unknown as SupportResourcePrimitives;

    expect(() => normaliseSupportResources([bad])).toThrow(
      InvalidArgumentException
    );
  });

  it('accepts a list without any image', () => {
    const normalised = normaliseSupportResources([
      SupportResourceBuilder.article(),
      SupportResourceBuilder.video()
    ]);

    expect(normalised).toHaveLength(2);
    expect(normalised.map((r) => r.type)).toStrictEqual(['article', 'video']);
  });

  it('accepts an empty list', () => {
    expect(normaliseSupportResources([])).toStrictEqual([]);
  });
});
