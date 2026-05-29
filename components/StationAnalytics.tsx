import React, { useEffect } from 'react';
import { Station } from './StationsDatabase';

type StationAnalyticsProps = {
  station: Station;
  onClose: () => void;
};

// Ikony w barwach Ekoen
const IconMapPin = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconActivity = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconClose = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconArrowRight = () => <svg className="w-4 h-4 inline-block ml-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>;

const customScrollbarClasses = "[&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-slate-400";

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
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!station) return null;

  const analytics = generateMockAnalytics(station.id);

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 sm:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="bg-slate-50 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] w-full max-w-5xl overflow-hidden border border-slate-300 flex flex-col max-h-[90vh] transition-all transform scale-100 opacity-100"
        style={{ animation: 'slideUpScale 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Nagłówek Modalu */}
        <div className="bg-white px-8 py-6 border-b border-slate-200 flex justify-between items-start shrink-0 z-10 shadow-sm relative">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <div className={`p-2.5 rounded-xl shadow-sm border ${station.status === 'Awaria' ? 'bg-red-50 text-red-500 border-red-100' : 'bg-green-50 text-[#58b347] border-green-100'}`}>
                <IconActivity />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">{station.name}</h2>
              <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase shadow-sm border ${station.status === 'Awaria' ? 'bg-red-500 text-white border-red-600' : 'bg-[#58b347] text-white border-[#499b3a]'}`}>
                {station.status}
              </span>
            </div>
            <p className="text-slate-500 text-xs font-semibold flex items-center gap-2 mt-2">
              <IconMapPin /> {station.city}, {station.street} <span className="text-slate-300 mx-1">•</span> <span className="text-slate-600">{station.client || 'Brak przypisanego klienta'}</span>
            </p>
          </div>
          
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-2.5 rounded-full transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#58b347]/50"
            title="Zamknij analitykę (ESC)"
          >
            <IconClose />
          </button>
        </div>

        {/* Zawartość Scrollowana */}
        <div className={`overflow-y-auto p-8 shrink grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-0 ${customScrollbarClasses}`}>
          
          {/* KOLUMNA LEWA: Statystyki KPI */}
          <div className="col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#58b347]/50 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-400"></div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Ostatnia usterka</h4>
              <div className="text-4xl font-black text-slate-800 tracking-tight">{getDaysSince(station.last_ticket_date)}</div>
              <p className="text-[11px] font-semibold text-slate-500 mt-2">Czas bezawaryjnej pracy</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#58b347]/50 transition-colors">
              <div className="absolute top-0 left-0 w-1 h-full bg-[#58b347]"></div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Szacowane SLA</h4>
              <div className="text-4xl font-black text-[#58b347] tracking-tight">{analytics.sla}%</div>
              <p className="text-[11px] font-semibold text-slate-500 mt-2">Zgodnie z umową serwisową</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-5">Informacje sprzętowe</h4>
              <ul className="text-xs font-medium text-slate-600 divide-y divide-slate-100">
                <li className="flex justify-between items-center py-3 first:pt-0">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Model</span> 
                  <span className="font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-100">{station.model || 'Brak danych'}</span>
                </li>
                <li className="flex justify-between items-center py-3">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Ostatni przegląd</span> 
                  <span className="font-bold text-slate-800 bg-slate-50 px-2 py-1 rounded border border-slate-100">{station.inspection_date || 'Brak danych'}</span>
                </li>
                <li className="flex justify-between items-center py-3 last:pb-0">
                  <span className="text-slate-400 uppercase tracking-wider text-[10px] font-bold">Opiekun rejonu</span> 
                  <span className="font-black text-[#58b347] bg-green-50 border border-green-100 px-2 py-1 rounded">{station.technician || 'Nie przypisano'}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* KOLUMNA PRAWA: Wykresy i Historia */}
          <div className="col-span-1 lg:col-span-2 space-y-6">
            
            {/* WYKRES AKTYWNOŚCI GODZINOWEJ */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Obciążenie Stacji</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Uśredniony dobowy ruch (Ostatnie 30 dni)</p>
                </div>
              </div>
              
              <div className="h-44 flex items-end justify-between gap-1.5 mt-4 border-b border-slate-100 pb-2 relative">
                {analytics.hourlyData.map((val, i) => (
                  <div key={i} className="w-full flex flex-col items-center gap-3 group relative cursor-crosshair h-full justify-end">
                    
                    {/* Tooltip ukryty/pokazywany na hover */}
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[10px] font-bold px-2.5 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 z-10 whitespace-nowrap shadow-lg translate-y-2 group-hover:translate-y-0">
                      {Math.round(val)}% użycia
                    </div>
                    
                    {/* Słupek tła */}
                    <div className="w-full bg-slate-50 hover:bg-green-50 rounded-md relative flex items-end transition-colors overflow-hidden h-[120px]">
                      {/* Słupek wartości */}
                      <div 
                        className="w-full bg-[#58b347] rounded-md transition-all duration-700 ease-out opacity-80 group-hover:opacity-100" 
                        style={{ height: `${val}%` }} 
                      />
                    </div>
                    {/* Etykieta godziny */}
                    <span className="text-[10px] font-bold text-slate-400 group-hover:text-slate-800 transition-colors">{i}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* HISTORIA ZGŁOSZEŃ */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">Dziennik Zdarzeń</h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1">Ostatnie aktywności systemowe</p>
                </div>
                <button className="text-xs font-black uppercase tracking-widest text-[#58b347] hover:text-[#499b3a] bg-green-50 hover:bg-green-100 border border-green-200 px-4 py-2 rounded-xl transition-colors">
                  Pełna historia <IconArrowRight />
                </button>
              </div>
              
              <div className="space-y-3">
                {station.last_ticket_date && (
                  <div className="flex gap-5 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 group">
                    <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                    </div>
                    <div className="flex flex-col justify-center">
                      <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider group-hover:text-[#58b347] transition-colors">Zgłoszenie Usterki / Awarii</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-1">Zarejestrowano w systemie serwisowym: <span className="font-bold text-slate-700">{station.last_ticket_date}</span></p>
                    </div>
                  </div>
                )}
                
                <div className="flex gap-5 p-4 rounded-xl hover:bg-slate-50 transition-colors border border-slate-100 group">
                  <div className="w-10 h-10 rounded-full bg-green-50 border border-green-100 flex items-center justify-center shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#58b347]" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider group-hover:text-[#58b347] transition-colors">Zakończenie Przeglądu Okresowego</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">Status: OK. Zrealizowano przez: <span className="font-bold text-slate-700">{station.technician || 'System Ekoen'}</span></p>
                  </div>
                </div>

                <div className="flex gap-5 p-4 rounded-xl transition-colors border border-transparent opacity-50">
                  <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  </div>
                  <div className="flex flex-col justify-center">
                    <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Inicjalizacja Systemu i Rozruch</p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1">Dodanie obiektu do Ekoen Management System.</p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Style lokalne dla unikalnych animacji wejścia */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes slideUpScale {
            0% { opacity: 0; transform: translateY(40px) scale(0.95); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }
        `}} />
      </div>
    </div>
  );
}