import React from 'react';
import { EkoenIcon } from './EkoenLogo';

export type ViewState = 'map' | 'stations' | 'technicians' | 'tickets' | 'equipment' | 'analytics' | 'clients' | 'calendar';

type SidebarProps = {
  activeView: ViewState;
  onChangeView: (view: ViewState) => void;
};

// Eleganckie ikony SVG dla wszystkich modułów
const IconMap = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/><line x1="9" x2="9" y1="3" y2="18"/><line x1="15" x2="15" y1="6" y2="21"/></svg>;
const IconDatabase = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>;
const IconUsers = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconEquipment = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
const IconTicket = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8l8 8v10a2 2 0 0 1-2 2z"/><polyline points="14 2 14 10 22 10"/><line x1="9" x2="15" y1="15" y2="15"/><line x1="9" x2="11" y1="11" y2="11"/></svg>;
const IconClients = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8"/><path d="M3 8h18"/><path d="M16 12v-2"/><path d="M8 12v-2"/><path d="M12 16v-6"/></svg>;
const IconCalendar = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" w="18" h="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconAnalytics = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>;

export default function Sidebar({ activeView, onChangeView }: SidebarProps) {
  const menuItems = [
    { id: 'map', label: 'Mapa systemu', icon: IconMap, spacer: false },
    { id: 'stations', label: 'Baza stacji', icon: IconDatabase, spacer: false },
    { id: 'technicians', label: 'Zasoby techniczne', icon: IconUsers, spacer: false },
    { id: 'equipment', label: 'Sprzęt i magazyn', icon: IconEquipment, spacer: false },
    { id: 'tickets', label: 'Aktualne zgłoszenia', icon: IconTicket, spacer: true }, // Spacer oddzielający sekcję operacyjną od biurowej
    { id: 'clients', label: 'Baza klientów', icon: IconClients, spacer: false },
    { id: 'calendar', label: 'Harmonogram', icon: IconCalendar, spacer: false },
    { id: 'analytics', label: 'Statystyki (BI)', icon: IconAnalytics, spacer: false },
  ];

  return (
    <div className="absolute top-0 left-0 h-full w-[72px] hover:w-64 bg-white/95 backdrop-blur-xl border-r border-slate-200 z-[100] transition-all duration-300 ease-in-out flex flex-col group shadow-2xl overflow-hidden">
      
      {/* Logo EKOEN */}
      <div className="h-20 flex items-center pl-4 border-b border-slate-100 min-w-max">
        <EkoenIcon className="w-10 h-10 shrink-0" spinning={false} />
        <span className="ml-3 font-black text-slate-800 tracking-tighter text-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">
          EKO<span className="text-[#58b347]">EN</span>
        </span>
      </div>

      {/* Nawigacja */}
      <div className="flex-1 py-6 flex flex-col gap-1.5 overflow-y-auto overflow-x-hidden scrollbar-hide">
        {menuItems.map(item => (
          <React.Fragment key={item.id}>
            {item.spacer && <div className="my-2 border-t border-slate-100 mx-4" />}
            <button
              onClick={() => onChangeView(item.id as ViewState)}
              className={`flex items-center pl-5 py-3 mx-2 rounded-xl transition-colors min-w-max ${
                activeView === item.id
                  ? 'bg-green-50 text-[#58b347] font-semibold'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="w-8 flex justify-center">
                <item.icon />
              </div>
              <span className="ml-3 text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75">
                {item.label}
              </span>
            </button>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}