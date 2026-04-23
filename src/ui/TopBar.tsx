import SearchBox from './SearchBox';
import SessionControls from './SessionControls';

export default function TopBar() {
  return (
    <div className="flex items-center gap-4 px-3 py-2 border-b bg-white">
      <div className="font-semibold">Bankruptcy Canvas</div>
      <SearchBox />
      <div className="ml-auto"><SessionControls /></div>
    </div>
  );
}
