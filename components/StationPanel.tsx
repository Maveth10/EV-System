import React from 'react';

// Typ eksportujemy, by można było go użyć w innych plikach
export type Station = {
  id: string;
  name: string;
  status: string;
  lat: number;
  lng: number;
  technician: string;
};

type StationPanelProps = {
  station: Station | null;
  onClose: () => void;
};

export default function StationPanel({ station, onClose }: StationPanelProps) {
  return (
    <div
      className={`absolute top-0 right-0 h-full w-[400px] bg-slate-900/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl transition-transform duration-300 ease-in-out p-6 z-30 ${
        station ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {station && (
        <div className="flex flex-col h-full text-slate-100">
          <div className="flex justify-between items-center pb-6 border-b border-slate-800 mb-6">
            <h2 className="text-2xl font-bold tracking-tight">
              {station.name}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white transition-colors text-xl"
            >
              ✕
            </button>
          </div>
          <div className="flex-grow space-y-5">
            <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Status aktualny
              </p>
              <div className="flex items-center gap-2.5 mt-1.5">
                <div
                  className={`w-3 h-3 rounded-full ${
                    station.status === 'Awaria'
                      ? 'bg-red-500 shadow-[0_0_10px_#ef4444]'
                      : 'bg-green-500 shadow-[0_0_10px_#10b981]'
                  }`}
                />
                <p className="text-xl font-bold uppercase tracking-wide">
                  {station.status}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Przypisany technik
              </p>
              <p className="text-lg font-medium mt-1 text-slate-200">
                {station.technician}
              </p>
            </div>
            <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-800/80 text-xs font-mono text-slate-400 space-y-1">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider font-sans mb-1">
                Geolokalizacja
              </p>
              <div>LAT: {station.lat.toFixed(5)}</div>
              <div>LNG: {station.lng.toFixed(5)}</div>
            </div>
          </div>
          <button className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:bg-blue-500 transition-colors mt-auto shadow-lg shadow-blue-950/50 tracking-wide">
            Zgłoś awarię / Wyślij technika
          </button>
        </div>
      )}
    </div>
  );
}
