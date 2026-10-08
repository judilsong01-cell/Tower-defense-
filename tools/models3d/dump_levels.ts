// Writes levels.json (id, biome, map of every stage) for mapshot.html. Run: npx tsx dump_levels.ts
import { writeFileSync } from 'node:fs';
import { LEVELS } from '../../src/data/levels/index.ts';
writeFileSync('levels.json', JSON.stringify(LEVELS.map((l) => ({ id: l.id, biome: l.biome, map: l.map }))));
console.log('levels', LEVELS.length);
