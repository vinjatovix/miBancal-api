import { ensureConfusedWithExist } from '../../../../../../src/Contexts/Agro/Anomalies/application/useCases/ensureConfusedWithExist.js';
import { InvalidArgumentException } from '../../../../../../src/Contexts/shared/domain/errors/index.js';
import { AnomalyReadRepositoryMock } from '../../__mocks__/AnomalyReadRepositoryMock.js';
import { AnomalyReadViewMother } from '../queries/AnomalyReadViewMother.js';

describe('ensureConfusedWithExist', () => {
  let readRepository: AnomalyReadRepositoryMock;
  let lookup: jest.SpyInstance;

  beforeEach(() => {
    readRepository = new AnomalyReadRepositoryMock();
    lookup = jest.spyOn(readRepository, 'findExistingSlugs');
  });

  it('is a no-op for undefined without any lookup', async () => {
    await ensureConfusedWithExist(readRepository, undefined, 'oidio');

    expect(lookup).not.toHaveBeenCalled();
  });

  it('is a no-op for null without any lookup', async () => {
    await ensureConfusedWithExist(readRepository, null, 'oidio');

    expect(lookup).not.toHaveBeenCalled();
  });

  it('is a no-op for an empty list without any lookup', async () => {
    await ensureConfusedWithExist(readRepository, [], 'oidio');

    expect(lookup).not.toHaveBeenCalled();
  });

  it('drops the own slug before the lookup and passes when the rest exist', async () => {
    readRepository.addToStorage(AnomalyReadViewMother.withSlug('mildiu'));

    await ensureConfusedWithExist(readRepository, ['Oidio', 'mildiu'], 'oidio');

    expect(lookup).toHaveBeenCalledTimes(1);
    expect(lookup).toHaveBeenCalledWith(['mildiu']);
  });

  it('skips the lookup when only the own slug is referenced', async () => {
    await ensureConfusedWithExist(readRepository, ['oidio'], 'oidio');

    expect(lookup).not.toHaveBeenCalled();
  });

  it('passes when every referenced slug exists', async () => {
    readRepository.addToStorage(AnomalyReadViewMother.withSlug('mildiu'));
    readRepository.addToStorage(AnomalyReadViewMother.withSlug('roya'));

    await expect(
      ensureConfusedWithExist(readRepository, ['mildiu', 'roya'], 'oidio')
    ).resolves.toBeUndefined();

    expect(lookup).toHaveBeenCalledTimes(1);
  });

  it('rejects when a referenced slug does not exist', async () => {
    readRepository.addToStorage(AnomalyReadViewMother.withSlug('mildiu'));

    await expect(
      ensureConfusedWithExist(readRepository, ['mildiu', 'ghost'], 'oidio')
    ).rejects.toBeInstanceOf(InvalidArgumentException);
  });
});
