import type { SectionNode, SectionBodyUnit } from '@/types/section';

interface Props {
  unit: SectionBodyUnit;
  onRefClick: (href: string) => void;
  onTermClick: (term: string) => void;
  hideDefinitions: boolean;
}

function renderNode(
  n: SectionNode,
  i: number,
  onRefClick: Props['onRefClick'],
  onTermClick: Props['onTermClick'],
  hideDefinitions: boolean,
) {
  if (n.kind === 'text') return <span key={i}>{n.value}</span>;
  if (n.kind === 'ref') {
    return (
      <a
        key={i}
        className="text-refLink underline decoration-solid cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onRefClick(n.href); }}
      >{n.value}</a>
    );
  }
  // term
  if (hideDefinitions) return <span key={i}>{n.value}</span>;
  return (
    <span
      key={i}
      className="text-termLink underline decoration-dashed cursor-pointer"
      title={`Defined term: ${n.term}`}
      onClick={(e) => { e.stopPropagation(); onTermClick(n.term); }}
    >{n.value}</span>
  );
}

export default function InlineMarkup({ unit, onRefClick, onTermClick, hideDefinitions }: Props) {
  // Indentation grows one step per nesting level; section root has none.
  const indent = unit.level === 'section' ? '' : 'pl-4';
  return (
    <div className={indent}>
      {unit.num && <span className="font-medium mr-1">{unit.num}</span>}
      {unit.nodes.map((n, i) => renderNode(n, i, onRefClick, onTermClick, hideDefinitions))}
      {unit.children.map((child) => (
        <InlineMarkup
          key={child.id}
          unit={child}
          onRefClick={onRefClick}
          onTermClick={onTermClick}
          hideDefinitions={hideDefinitions}
        />
      ))}
    </div>
  );
}
