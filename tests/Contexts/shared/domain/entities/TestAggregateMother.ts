import { AggregateRoot } from '../../../../../src/Contexts/shared/domain/entities/AggregateRoot.js';
import { random } from '../../fixtures/index.js';

type TestAggregateId = string;

export class TestAggregate extends AggregateRoot<TestAggregateId> {
  public constructor(id: TestAggregateId) {
    super(id);
  }
}

export class TestAggregateMother {
  static create(id: TestAggregateId = random.uuid()): TestAggregate {
    return new TestAggregate(id);
  }
}
