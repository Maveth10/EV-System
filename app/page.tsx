import ChargeMap from '../components/Map';

export default function Home() {
  return (
    <main className="relative w-screen h-screen overflow-hidden">
      {/* Tu docelowo dojdzie też Sidebar i Topbar */}
      <ChargeMap />
    </main>
  );
}
