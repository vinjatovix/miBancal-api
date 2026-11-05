import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

type MockInput = {
  slug: string;
  category: string;
  targets?: string[];
  actions?: string[];
};

describe('GardenInputLinkability & decoupling', () => {
  const filePath = resolve(process.cwd(), 'mock_data/gardenInputs.json');
  const content = JSON.parse(readFileSync(filePath, 'utf-8')) as MockInput[];
  const defenseInputs = content.filter((i) => i.category === 'defense');
  const allTargets = defenseInputs.flatMap((i) => i.targets ?? []);

  it.each(['Pulgón', 'Mosca blanca', 'Oídio', 'Mildiu'])(
    'declares target "%s" in seeded defense inputs',
    (target) => {
      expect(allTargets).toContain(target);
    }
  );

  it('guarantees zero circular or cross-domain imports from GardenInputs into Anomalies or Plants', () => {
    const srcDir = resolve(process.cwd(), 'src/Contexts/Agro/GardenInputs');

    const getFiles = (dir: string): string[] => {
      const entries = readdirSync(dir);
      return entries.flatMap((entry) => {
        const fullPath = join(dir, entry);
        return statSync(fullPath).isDirectory()
          ? getFiles(fullPath)
          : [fullPath];
      });
    };

    const files = getFiles(srcDir).filter((file) => file.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);

    for (const file of files) {
      const code = readFileSync(file, 'utf-8');
      expect(code).not.toMatch(/from\s+['"].*\/Anomalies\//);
      expect(code).not.toMatch(/from\s+['"].*\/Plants\//);
    }
  });
});
