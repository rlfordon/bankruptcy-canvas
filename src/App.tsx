import Canvas from './canvas/Canvas';
import TopBar from './ui/TopBar';

export default function App() {
  return (
    <div className="h-full w-full flex flex-col">
      <TopBar />
      <div className="flex-1"><Canvas /></div>
    </div>
  );
}
