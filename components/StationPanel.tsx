import React, { useEffect, useState } from 'react';
import { supabase } from '../app/supabase';

export type Station = {
  id: string; name: string; client: string | null; model: string | null;
  inspection_date: string | null; last_ticket_date: string | null;
  technicians_in_range: string | null; technician: string | null;
  status: string; city: string | null; street: string | null; country: string | null;
  additional_info: string | null; lat?: number; lng?: number;
};

type StationPanelProps = { 
  station: Station | null; 
  onClose: () => void; 
  onEdit: (station: Station) => void;
};

const IconClose = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>;
const IconInfo = () => <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconMapNav = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>;
const IconHistory = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
const IconEdit = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconAlert = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;

const getStatusColorClass = (status: string) => {
  switch(status) {
    case 'Awaria': return 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]';
    case 'Uruchomienie': return 'bg-purple-500 shadow-[0_0_8px_rgba(139,92,246,0.6)]';
    case 'Przegląd': return 'bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]';
    case 'Zlecenie jakościowe': return 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
    case 'Naprawa odpłatna': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
    case 'Brak akcji': default: return 'bg-[#58b347] shadow-[0_0_8px_rgba(88,179,71,0.6)]';
  }
};

export default function StationPanel({ station, onClose, onEdit }: StationPanelProps) {
  const [liveStation, setLiveStation] = useState<Station | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Pobieranie świeżych danych przy każdym otwarciu panelu
  useEffect(() => {
    if (!station) {
      setLiveStation(null);
      return;
    }
    
    const fetchLiveStation = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('stations')
        .select('*, st_x(location::geometry) as lng, st_y(location::geometry) as lat')
        .eq('id', station.id)
        .single();
        
      if (data && !error) setLiveStation(data as Station);
      else setLiveStation(station); // Fallback w razie błędu
      setIsLoading(false);
    };

    fetchLiveStation();
  }, [station]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!station || !liveStation) return null;

  const hasActiveTask = liveStation.status !== 'Brak akcji';

  return (
    <>
      <div className="absolute top-0 right-0 h-full w-96 bg-white/95 backdrop-blur-xl shadow-2xl border-l border-slate-200 z-40 flex flex-col transform transition-transform duration-300">
        
        {/* NAGŁÓWEK */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2.5 h-2.5 rounded-full ${getStatusColorClass(liveStation.status)}`} />
              <h2 className="text-xl font-bold text-slate-800">{liveStation.name}</h2>
            </div>
            <p className="text-sm text-slate-500 flex items-center gap-1.5">{liveStation.city}, {liveStation.street}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-white rounded-full border border-slate-200 text-slate-400 hover:text-slate-600 shadow-sm transition-colors"><IconClose /></button>
        </div>

        {/* ZAWARTOŚĆ */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 relative">
          {isLoading && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-sm z-10 flex justify-center pt-10">
              <span className="text-sm text-[#58b347] font-semibold animate-pulse">Aktualizowanie danych...</span>
            </div>
          )}

          {/* AKTYWNE ZADANIA (Jeśli są) */}
          {hasActiveTask && (
            <div className={`rounded-xl p-4 border ${liveStation.status === 'Awaria' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-orange-50 border-orange-200 text-orange-800'}`}>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <IconAlert /> Wymagana interwencja
              </h3>
              <p className="text-sm font-semibold mb-1">Status: {liveStation.status}</p>
              <p className="text-xs opacity-80">Przypisany technik: {liveStation.technician || 'Brak przypisania'}</p>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><IconInfo /> Podstawowe informacje</h3>
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
              <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Klient / Sieć</span><span className="text-sm font-semibold text-slate-800">{liveStation.client || '-'}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Model ładowarki</span><span className="text-sm font-semibold text-slate-800">{liveStation.model || '-'}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Ważność UDT</span><span className="text-sm font-semibold text-slate-800">{liveStation.inspection_date || '-'}</span></div>
              <div className="flex justify-between items-center"><span className="text-xs text-slate-500">Domyślny opiekun</span><span className="text-sm font-semibold text-[#58b347]">{liveStation.technician || 'Poza strefami'}</span></div>
            </div>
          </div>

          {liveStation.additional_info && (
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5"><IconInfo /> Notatki dla serwisu</h3>
              <div className="bg-yellow-50/50 rounded-xl p-4 border border-yellow-100 text-sm text-yellow-800">{liveStation.additional_info}</div>
            </div>
          )}

          {/* SZYBKIE AKCJE */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button onClick={() => setIsHistoryModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 hover:text-[#58b347] hover:border-[#58b347] font-medium py-2.5 rounded-lg shadow-sm transition-all flex flex-col items-center justify-center gap-1 text-xs">
              <IconHistory /> Historia zgłoszeń
            </button>
            <button onClick={() => setIsMapModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 hover:text-blue-500 hover:border-blue-500 font-medium py-2.5 rounded-lg shadow-sm transition-all flex flex-col items-center justify-center gap-1 text-xs">
              <IconMapNav /> Trasa dojazdu
            </button>
          </div>
        </div>

        {/* DOLNY PRZYCISK EDYCJI */}
        <div className="p-6 border-t border-slate-100 bg-slate-50">
          <button 
            onClick={() => onEdit(liveStation)}
            className="w-full bg-white border-2 border-[#58b347] text-[#58b347] hover:bg-[#58b347] hover:text-white font-bold py-3 rounded-xl shadow-sm transition-all flex items-center justify-center gap-2" 
          >
            <IconEdit /> Edytuj dane stacji
          </button>
        </div>
      </div>

      {/* MODAL NAWIGACJI GOOGLE MAPS */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsMapModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><IconMapNav /> Trasa dojazdu: {liveStation.name}</h3>
              <button onClick={() => setIsMapModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="w-full bg-slate-200 relative" style={{ height: '60vh' }}>
              {/* Iframe generujący trasę od lokalizacji urządzenia (saddr=My+Location) do koordynatów stacji */}
              <iframe 
                width="100%" height="100%" frameBorder="0" style={{ border: 0 }} allowFullScreen
                src={`https://maps.google.com/maps?saddr=My+Location&daddr=${liveStation.lat},${liveStation.lng}&output=embed`}
                allow="geolocation"
              />
            </div>
            <div className="p-4 bg-white border-t border-slate-100 text-center flex justify-between items-center">
              <p className="text-xs text-slate-500 text-left">
                Jeśli nawigacja nie wykrywa Twojej lokalizacji, zezwól przeglądarce na dostęp do GPS.
              </p>
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${liveStation.lat},${liveStation.lng}`} 
                target="_blank" rel="noopener noreferrer"
                className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold py-2 px-4 rounded-lg transition-colors shadow-sm"
              >
                Otwórz w aplikacji Google Maps
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORII ZGŁOSZEŃ (ZAŚLEPKA) */}
      {isHistoryModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setIsHistoryModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><IconHistory /> Historia zgłoszeń</h3>
              <button onClick={() => setIsHistoryModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-10 text-center">
              <IconHistory />
              <h4 className="text-lg font-bold text-slate-800 mt-4">Moduł w budowie</h4>
              <p className="text-sm text-slate-500 mt-2">
                Pełny rejestr historycznych zgłoszeń dla punktu <strong>{liveStation.name}</strong> będzie dostępny po zintegrowaniu modułu Ticketingu.
              </p>
              <button onClick={() => setIsHistoryModalOpen(false)} className="mt-6 text-[#58b347] font-bold hover:underline">Zamknij</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}