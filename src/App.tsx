import { ReactFlowProvider } from '@xyflow/react';
import Canvas from './canvas/Canvas';
import TopBar from './ui/TopBar';
import HistorySidebar from './ui/HistorySidebar';

export default function App() {
  return (
    <ReactFlowProvider>
      <div className="h-full w-full flex flex-col">
        <TopBar />
        <div className="flex-1 flex">
          <HistorySidebar />
          <div className="flex-1"><Canvas /></div>
        </div>
      </div>
    </ReactFlowProvider>
  );
}
