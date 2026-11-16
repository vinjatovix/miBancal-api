import { AggregateRoot } from '../../../../../src/Contexts/shared/domain/entities/AggregateRoot.js';
import { random } from '../../fixtures/index.js';

export class TestAggregate extends AggregateRoot<string> {
  public constructor(id: string) {
    super(id);
  }
}

export class TestAggregateMother {
  static create(id: string = random.uuid()): TestAggregate {
    return new TestAggregate(id);
  }
}
