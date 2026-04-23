import { loadSection } from '@/data/loader';
import { spawnFromRef, spawnFromTerm } from './cardSpawning';
import type { SectionBodyUnit, SectionNode } from '@/types/section';

function walkNodes(unit: SectionBodyUnit, visit: (n: SectionNode) => void): void {
  for (const n of unit.nodes) visit(n);
  for (const c of unit.children) walkNodes(c, visit);
}

export async function expandAll(sourceCardId: string, sectionNumber: string): Promise<void> {
  const section = await loadSection(sectionNumber);
  const refs = new Set<string>();
  const terms = new Set<string>();
  walkNodes(section.body, (n) => {
    if (n.kind === 'ref') refs.add(n.href);
    if (n.kind === 'term') terms.add(n.term);
  });
  for (const h of refs) spawnFromRef(sourceCardId, h);
  for (const t of terms) await spawnFromTerm(sourceCardId, t);
}
