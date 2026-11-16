import { Binary, UUID } from 'bson';
import { validate as validateUuid } from 'uuid';

// eslint-disable-next-line sonarjs/function-return-type -- intentional union return: UUID strings encode to Binary, other ids pass through unchanged
export function toMongoId(id: string): Binary | string {
  if (validateUuid(id)) {
    return new UUID(id).toBinary();
  }

  return id;
}

export function fromMongoId(id: unknown): string {
  if (typeof id === 'string') {
    return id;
  }

  if (id instanceof UUID) {
    return id.toString();
  }

  if (id instanceof Binary && id.sub_type === Binary.SUBTYPE_UUID) {
    return id.toUUID().toString();
  }

  return String(id);
}
