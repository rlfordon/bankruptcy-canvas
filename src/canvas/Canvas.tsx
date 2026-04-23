import { useCallback, useMemo } from 'react';
import {
  ReactFlow, ReactFlowProvider, Background, Controls,
  type Node, type Edge as FlowEdge, type NodeChange, type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useSessionStore } from '@/state/sessionStore';
import { moveCard } from '@/state/cardOps';
import SectionCardNode from './SectionCard';
import DefinitionCardNode from './DefinitionCard';
import PickerCardNode from './PickerCard';

const nodeTypes = { section: SectionCardNode, definition: DefinitionCardNode, picker: PickerCardNode };

function InnerCanvas() {
  const cards = useSessionStore((s) => s.cards);
  const edges = useSessionStore((s) => s.edges);
  const setCards = useSessionStore((s) => s.setCards);

  const nodes: Node[] = useMemo(
    () => cards.map((c) => ({
      id: c.id,
      position: { x: c.x, y: c.y },
      type: c.kind,                       // 'section' | 'definition' | 'picker' (registered in Task 19-21)
      data: { cardId: c.id },
    })),
    [cards],
  );

  const flowEdges: FlowEdge[] = useMemo(
    () => edges.map((e) => ({
      id: e.id, source: e.source, target: e.target,
      label: e.label,
      style: e.kind === 'manual' ? { strokeWidth: 2 } : { strokeWidth: 1, opacity: 0.6 },
    })),
    [edges],
  );

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    // Controlled mode: translate React Flow's position changes into store updates.
    // Selection and dimension changes are ignored by design in v1.
    setCards((prev) => {
      let next = prev;
      for (const ch of changes) {
        if (ch.type === 'position' && ch.position) {
          next = moveCard(next, ch.id, ch.position.x, ch.position.y);
        }
      }
      return next;
    });
  }, [setCards]);

  const onEdgesChange = useCallback((_changes: EdgeChange[]) => {
    // Edge deletions in v1 happen via explicit card-delete flows (Task 19/20/21),
    // which sweep matching edges out of the store. No-op here.
  }, []);

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}

export default function Canvas() {
  return (
    <ReactFlowProvider>
      <InnerCanvas />
    </ReactFlowProvider>
  );
}
