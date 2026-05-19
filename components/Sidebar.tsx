import React from 'react';

export type ViewState = 'map' | 'stations' | 'technicians' | 'tickets';

type SidebarProps = {
  activeView: ViewState;
  onChangeView: (view: ViewState) => void;
};

// Eleganckie ikony SVG
const IconMap = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>;
const IconDatabase = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>;
const IconUsers = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconTicket = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l8 8v10a2 2 0 0 1-2 2z"/><polyline points="14 2 14 10 22 10"/><line x1="9" x2="15" y1="15" y2="15"/><line x1="9" x2="11" y1="11" y2="11"/></svg>;

export default function Sidebar({ activeView, onChangeView }: SidebarProps) {
  const menuItems = [
    { id: 'map', label: 'Mapa systemu', icon: IconMap },
    { id: 'stations', label: 'Baza stacji', icon: IconDatabase },
    { id: 'technicians', label: 'Zasoby techniczne', icon: IconUsers },
    { id: 'tickets', label: 'Aktualne zgłoszenia', icon: IconTicket },
  ];

  return (
    <div className="absolute top-0 left-0 h-full w-[72px] hover:w-64 bg-white/95 backdrop-blur-xl border-r border-slate-200 z-[100] transition-all duration-300 ease-in-out flex flex-col group shadow-2xl overflow-hidden">
      
      {/* Logo / Nagłówek */}
      <div className="h-20 flex items-center pl-5 border-b border-slate-100 min-w-max">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
          V
        </div>
        <span className="ml-4 font-bold text-slate-800 tracking-wide opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
          Vyrai System
        </span>
      </div>

      {/* Elementy nawigacji */}
      <div className="flex-1 py-6 flex flex-col gap-2">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id as ViewState)}
            className={`flex items-center pl-5 py-3.5 mx-2 rounded-xl transition-colors min-w-max ${
              activeView === item.id
                ? 'bg-blue-50 text-blue-600'
                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="w-8 flex justify-center">
              <item.icon />
            </div>
            <span className="ml-3 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}