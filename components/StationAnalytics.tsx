import React, { useEffect } from 'react';
import { Station } from './StationsDatabase';

type StationAnalyticsProps = {
  station: Station;
  onClose: () => void;
};

// Ikony
const IconMapPin = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconActivity = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;

// Pomocnicze funkcje
const getDaysSince = (dateString: string | null) => {
  if (!dateString) return 'Brak zgłoszeń';
  const diffTime = Math.abs(new Date().getTime() - new Date(dateString).getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? 'Dzisiaj' : `${diffDays} dni`;
};

const generateMockAnalytics = (stationId: string) => {
  const seed = stationId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const sla = (85 + (seed % 15) + ((seed % 10) / 10)).toFixed(1);
  const hourlyData = Array.from({ length: 24 }).map((_, i) => {
    let base = 20; 
    if (i > 7 && i < 18) base = 60; 
    if (i > 15 && i < 20) base = 85; 
    return Math.min(100, Math.max(5, base + (Math.sin(seed + i) * 30)));
  });
  return { sla, hourlyData };
};

export default function StationAnalytics({ station, onClose }: StationAnalyticsProps) {
  
  // Zamykanie na ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!station) return null;

  const analytics = generateMockAnalytics(station.id);

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4"
      onClick={onClose}
    >
      <div 
        className="bg-slate-50 rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-300 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nagłówek Modalu */}
        <div className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${station.status === 'Awaria' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                <IconActivity />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">{station.name}</h2>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${station.status === 'Awaria' ? 'bg-red-500 text-white' : 'bg-green-500 text-white'}`}>
                {station.status.toUpperCase()}
              </span>
            </div>
            <p className="text-slate-500 text-sm flex items-center gap-2">
              <IconMapPin /> {station.city}, {station.street} • {station.client || 'Brak przypisanego klienta'}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 p-2 rounded-full transition-colors">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto p-8 shrink grid grid-cols-3 gap-6">
          
          {/* KOLUMNA LEWA: Statystyki KPI */}
          <div className="col-span-3 lg:col-span-1 space-y-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ostatnia usterka</h4>
              <div className="text-3xl font-black text-slate-800">{getDaysSince(station.last_ticket_date)}</div>
              <p className="text-xs text-slate-500 mt-1">Czas bezawaryjnej pracy</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Szacowane SLA</h4>
              <div className="text-3xl font-black text-blue-600">{analytics.sla}%</div>
              <p className="text-xs text-slate-500 mt-1">Zgodnie z umową serwisową</p>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-4">Informacje sprzętowe</h4>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between"><span className="text-slate-500">Model:</span> <span className="font-semibold text-slate-800">{station.model || 'Brak danych'}</span></li>
                <li className="flex justify-between"><span className="text-slate-500">Ostatni przegląd:</span> <span className="font-semibold text-slate-800">{station.inspection_date || 'Brak danych'}</span></li>
                <li className="flex justify-between"><span className="text-slate-500">Opiekun:</span> <span className="font-semibold text-blue-600">{station.technician || 'Brak'}</span></li>
              </ul>
            </div>
          </div>

          {/* KOLUMNA PRAWA: Wykresy i Historia */}
          <div className="col-span-3 lg:col-span-2 space-y-6">
            
            {/* WYKRES AKTYWNOŚCI GODZINOWEJ */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold text-slate-800 mb-6">Średnie dobowe obciążenie (Ostatnie 30 dni)</h3>
              <div className="h-40 flex items-end justify-between gap-1 mt-4">
                {analytics.hourlyData.map((val, i) => (
                  <div key={i} className="w-full flex flex-col items-center gap-2 group">
                    <div className="w-full bg-blue-100 rounded-t-md relative flex items-end group-hover:bg-blue-200 transition-colors" style={{ height: '100px' }}>
                      <div className="w-full bg-blue-500 rounded-t-md transition-all duration-500" style={{ height: `${val}%` }} />
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
                        {Math.round(val)}%
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-slate-400">{i}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* HISTORIA ZGŁOSZEŃ */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-slate-800">Ostatnie zdarzenia i usterki</h3>
                <button className="text-xs font-semibold text-blue-600 hover:text-blue-800">Zobacz pełną historię &rarr;</button>
              </div>
              
              <div className="space-y-4">
                {station.last_ticket_date && (
                  <div className="flex gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                    <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">Zgłoszenie awarii (Ostatnie)</p>
                      <p className="text-xs text-slate-500 mt-1">Zarejestrowano w systemie: {station.last_ticket_date}</p>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-green-500 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Ukończenie przeglądu kwartalnego</p>
                    <p className="text-xs text-slate-500 mt-1">Wykonane przez: {station.technician || 'System'}</p>
                  </div>
                </div>

                <div className="flex gap-4 p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100 opacity-60">
                  <div className="w-2 h-2 mt-1.5 rounded-full bg-slate-400 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Uruchomienie stacji w systemie</p>
                    <p className="text-xs text-slate-500 mt-1">Inicjalizacja środowiska i konfiguracja</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}