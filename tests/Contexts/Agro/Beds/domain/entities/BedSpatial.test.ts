import { createBedId } from '../../../../../../src/Contexts/Agro/Beds/domain/BedId.js';
import { BedName } from '../../../../../../src/Contexts/Agro/Beds/domain/BedName.js';
import { Bed } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/Bed.js';
import type { BedProps } from '../../../../../../src/Contexts/Agro/Beds/domain/entities/types/BedProps.js';
import { createUserId } from '../../../../../../src/Contexts/Auth/domain/UserId.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/InvalidArgumentException.js';
import { Metadata } from '../../../../../../src/Contexts/shared/domain/valueObject/Metadata.js';
import { PositiveNumber } from '../../../../../../src/Contexts/shared/domain/valueObject/PositiveNumber.js';

describe('Bed Spatial Configuration', () => {
  const defaultProps: BedProps = {
    id: createBedId('123e4567-e89b-12d3-a456-426614174000'),
    userId: createUserId('123e4567-e89b-12d3-a456-426614174001'),
    name: new BedName('Test Bed'),
    width: PositiveNumber.create(100),
    height: PositiveNumber.create(200),
    depth: PositiveNumber.create(50),
    metadata: Metadata.create('test-user', new Date()),
    deleted: false
  };

  describe('Placement', () => {
    it('places a bed and calculates net orientation', () => {
      const bed = Bed.create(defaultProps);

      bed.place({ x: 10, y: 20 }, 90, 45, 'test-user', new Date());

      expect(bed.position).toEqual({ x: 10, y: 20 });
      expect(bed.rotation).toBe(90);
      expect(bed.netOrientation).toBe(135);
    });

    it('handles rotation wrap-around in net orientation', () => {
      const bed = Bed.create(defaultProps);

      bed.place({ x: 10, y: 20 }, 300, 90, 'test-user', new Date());

      expect(bed.netOrientation).toBe(30);
    });

    it('calculates net orientation as bed rotation when no canvas north is provided', () => {
      const bed = Bed.create(defaultProps);

      bed.place({ x: 10, y: 20 }, 90, undefined, 'test-user', new Date());

      expect(bed.netOrientation).toBe(90);
    });

    it.each([[{ x: -10, y: 20 }], [{ x: 10, y: -20 }]])(
      'throws InvalidArgumentException when placing bed with negative position %j',
      (position) => {
        const bed = Bed.create(defaultProps);

        expect(() => {
          bed.place(position, 90, 45, 'test-user', new Date());
        }).toThrow(InvalidArgumentException);
      }
    );

    it('unplaces a placed bed', () => {
      const bed = Bed.create(defaultProps);
      bed.place({ x: 10, y: 20 }, 90, 45, 'test-user', new Date());

      bed.unplace('test-user', new Date());

      expect(bed.position).toBeUndefined();
      expect(bed.rotation).toBeUndefined();
      expect(bed.netOrientation).toBeUndefined();
    });
  });
});
