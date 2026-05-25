'use client';
import React, { useState, useEffect } from 'react';
import { supabase } from '../app/supabase';

// --- IKONY ---
const IconTrendingUp = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const IconAlertTriangle = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconActivity = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconBox = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IconUsers = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconZap = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;

interface AnalyticsDashboardProps {
  onChangeView?: (view: any) => void;
  // NOWE: Precyzyjna informacja od rodzica (ChargeMap)
  isSidebarHovered?: boolean; 
}

export default function AnalyticsDashboard({ onChangeView, isSidebarHovered = false }: AnalyticsDashboardProps) {
  const [isLoading, setIsLoading] = useState(true);
  
  const [stats, setStats] = useState<any>({
    totalStations: 0,
    stationsDown: 0,
    networkHealth: 0,
    ticketsTotal: 0,
    ticketsActive: 0,
    ticketsByStatus: {},
    ticketsByType: {},
    lowStockParts: [],
    techWorkload: {}
  });

  const [technicians, setTechnicians] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      
      const [statRes, tickRes, partRes, techRes] = await Promise.all([
        supabase.from('stations').select('id, status'),
        supabase.from('tickets').select('id, status, ticket_type, technician_id'),
        supabase.from('parts').select('id, name, sku, main_stock'),
        supabase.from('technicians').select('id, name')
      ]);

      const stations = statRes.data || [];
      const tickets = tickRes.data || [];
      const parts = partRes.data || [];
      const techs = techRes.data || [];

      setTechnicians(techs);

      const totalStations = stations.length;
      const stationsDown = stations.filter(s => s.status === 'Awaria').length;
      const networkHealth = totalStations > 0 ? Math.round(((totalStations - stationsDown) / totalStations) * 100) : 0;
      
      const ticketsTotal = tickets.length;
      const ticketsActive = tickets.filter(t => t.status !== 'Zakończone').length;

      const ticketsByStatus = tickets.reduce((acc: any, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});

      const ticketsByType = tickets.reduce((acc: any, t) => {
        acc[t.ticket_type] = (acc[t.ticket_type] || 0) + 1;
        return acc;
      }, {});

      const lowStockParts = parts.filter(p => p.main_stock < 5).sort((a, b) => a.main_stock - b.main_stock);

      const techWorkload = tickets.filter(t => t.status !== 'Zakończone').reduce((acc: any, t) => {
        if (t.technician_id) {
          acc[t.technician_id] = (acc[t.technician_id] || 0) + 1;
        }
        return acc;
      }, {});

      setStats({
        totalStations,
        stationsDown,
        networkHealth,
        ticketsTotal,
        ticketsActive,
        ticketsByStatus,
        ticketsByType,
        lowStockParts,
        techWorkload
      });

      setIsLoading(false);
    };

    fetchAnalytics();
  }, []);

  const getPercentage = (value: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  };

  const getTechName = (id: string) => technicians.find(t => t.id === id)?.name || 'Nieznany';
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  const maxWorkload = Object.values(stats.techWorkload).length > 0 ? Math.max(...Object.values(stats.techWorkload) as number[]) : 1;

  const getWorkloadStyle = (count: number, max: number) => {
    if (max <= 2) return { bg: 'bg-[#58b347]', text: 'text-emerald-600', label: 'W normie' };
    const pct = (count / max) * 100;
    if (pct >= 80) return { bg: 'bg-red-500', text: 'text-red-500', label: 'Przeciążenie' };
    if (pct >= 50) return { bg: 'bg-orange-400', text: 'text-orange-500', label: 'Podwyższone' };
    return { bg: 'bg-[#58b347]', text: 'text-emerald-600', label: 'W normie' };
  };

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-100/60 backdrop-blur-2xl border-l border-white/20 z-40 overflow-hidden flex flex-col font-sans transition-all duration-300 ease-out shadow-[-10px_0_30px_rgba(0,0,0,0.05)]">
      
      {/* Pasek nawigacji górnej - Wymuszona płynność przez precyzyjny margines `ml-[184px]` */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/40 px-6 py-4 flex justify-between items-center shrink-0">
        <div className={`transition-all duration-300 ease-in-out ${isSidebarHovered ? 'ml-[184px]' : 'ml-0'}`}>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Analityka i Raporty</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Podsumowanie operacyjne sieci, zgłoszeń i zasobów na żywo.</p>
        </div>
        <div className="flex items-center gap-2 bg-white/50 px-3 py-1.5 rounded-lg border border-white/60 shadow-sm shrink-0">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#58b347] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#58b347]"></span>
          </span>
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest hidden sm:block">Dane na żywo</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
        <div className="max-w-[1300px] mx-auto space-y-6">
          
          {isLoading ? (
            <div className="flex justify-center p-12 text-sm text-slate-600 font-medium animate-pulse bg-white/50 rounded-xl border border-white/60 shadow-sm backdrop-blur-md">
              Kalkulowanie danych operacyjnych...
            </div>
          ) : (
            <div className="animate-fadeIn transition-all duration-500">
              
              {/* --- KAFELKI KPI --- */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                
                <div 
                  onClick={() => onChangeView?.('stations')}
                  className="bg-white/95 backdrop-blur-sm p-5 rounded-xl border border-white/60 shadow-sm flex flex-col justify-between cursor-pointer hover:border-[#58b347]/50 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
                  title="Przejdź do Bazy Stacji"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-slate-50 border border-slate-100/80 text-[#58b347] rounded-lg group-hover:bg-[#58b347]/10 transition-colors"><IconZap /></div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Uptime Sieci</span>
                      <span className={`text-lg font-bold ${stats.networkHealth > 90 ? 'text-[#58b347]' : 'text-slate-700'}`}>{stats.networkHealth}%</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-slate-800 tabular-nums">{stats.totalStations}</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Wszystkie stacje</p>
                  </div>
                </div>

                <div 
                  onClick={() => onChangeView?.('tickets')}
                  className="bg-white/95 backdrop-blur-sm p-5 rounded-xl border border-white/60 shadow-sm flex flex-col justify-between cursor-pointer hover:border-red-400 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
                  title="Przejdź do Zgłoszeń"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-slate-50 border border-slate-100/80 text-red-500 rounded-lg group-hover:bg-red-50 transition-colors"><IconAlertTriangle /></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Krytyczne</span>
                  </div>
                  <div>
                    <h3 className={`text-3xl font-bold tabular-nums ${stats.stationsDown > 0 ? 'text-red-500' : 'text-slate-800'}`}>{stats.stationsDown}</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Stacje w awarii</p>
                  </div>
                </div>

                <div 
                  onClick={() => onChangeView?.('tickets')}
                  className="bg-white/95 backdrop-blur-sm p-5 rounded-xl border border-white/60 shadow-sm flex flex-col justify-between cursor-pointer hover:border-[#58b347]/50 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
                  title="Przejdź do Zgłoszeń"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-slate-50 border border-slate-100/80 text-[#58b347] rounded-lg group-hover:bg-[#58b347]/10 transition-colors"><IconTrendingUp /></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Zgłoszenia</span>
                  </div>
                  <div>
                    <h3 className="text-3xl font-bold text-slate-800 tabular-nums">{stats.ticketsActive}</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Aktywne zadania</p>
                  </div>
                </div>

                <div 
                  onClick={() => onChangeView?.('equipment')}
                  className="bg-white/95 backdrop-blur-sm p-5 rounded-xl border border-white/60 shadow-sm flex flex-col justify-between cursor-pointer hover:border-orange-400 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group"
                  title="Przejdź do Magazynu"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-slate-50 border border-slate-100/80 text-slate-500 rounded-lg group-hover:bg-orange-50 group-hover:text-orange-500 transition-colors"><IconBox /></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Magazyn</span>
                  </div>
                  <div>
                    <h3 className={`text-3xl font-bold tabular-nums ${stats.lowStockParts.length > 0 ? 'text-orange-500' : 'text-slate-800'}`}>{stats.lowStockParts.length}</h3>
                    <p className="text-xs font-medium text-slate-500 mt-1">Braki (poniżej 5 szt)</p>
                  </div>
                </div>
              </div>

              {/* --- GŁÓWNE PANELE DANYCH --- */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Lejek zgłoszeń - Klikalny */}
                <div 
                  onClick={() => onChangeView?.('tickets')}
                  className="lg:col-span-2 bg-white/95 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm flex flex-col overflow-hidden cursor-pointer hover:border-[#58b347]/50 hover:shadow-md transition-all duration-300 group"
                  title="Przejdź do Zgłoszeń"
                >
                  <div className="p-5 border-b border-slate-100/60 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider group-hover:text-[#58b347] transition-colors">Lejek Operacyjny Zgłoszeń</h3>
                    <span className="text-xs font-bold text-slate-500 bg-white border border-slate-200/60 px-3 py-1 rounded shadow-sm">Suma: {stats.ticketsTotal}</span>
                  </div>

                  <div className="p-6 space-y-6 flex-1 flex flex-col justify-center">
                    {[
                      { label: 'Nowe', count: stats.ticketsByStatus['Nowe'] || 0, color: 'bg-slate-300' },
                      { label: 'W toku', count: stats.ticketsByStatus['W toku'] || 0, color: 'bg-[#58b347]/60' },
                      { label: 'Oczekuje na części', count: stats.ticketsByStatus['Oczekuje na części'] || 0, color: 'bg-slate-500' },
                      { label: 'Zakończone', count: stats.ticketsByStatus['Zakończone'] || 0, color: 'bg-[#58b347]' },
                    ].map(stat => {
                      const pct = getPercentage(stat.count, stats.ticketsTotal);
                      return (
                        <div key={stat.label}>
                          <div className="flex justify-between items-end mb-1.5">
                            <span className="text-sm font-semibold text-slate-700">{stat.label}</span>
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold text-slate-800">{stat.count}</span>
                              <span className="text-xs font-medium text-slate-400 w-8 text-right">{pct}%</span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${stat.color} transition-all duration-1000`} 
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Typy zgłoszeń - Klikalny */}
                <div 
                  onClick={() => onChangeView?.('tickets')}
                  className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm flex flex-col overflow-hidden cursor-pointer hover:border-[#58b347]/50 hover:shadow-md transition-all duration-300 group"
                  title="Przejdź do Zgłoszeń"
                >
                  <div className="p-5 border-b border-slate-100/60 bg-slate-50/50">
                    <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider group-hover:text-[#58b347] transition-colors">Klasyfikacja Akcji</h3>
                  </div>
                  
                  <div className="p-5 flex-1 overflow-y-auto space-y-2 scrollbar-hide">
                    {Object.entries(stats.ticketsByType).sort((a: any, b: any) => b[1] - a[1]).map(([type, count]: any) => (
                      <div key={type} className="flex justify-between items-center p-3 bg-white border border-slate-100 rounded-lg hover:border-[#58b347]/30 hover:bg-[#58b347]/5 transition-colors">
                        <span className="text-xs font-semibold text-slate-700">{type}</span>
                        <span className="bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-md text-xs font-bold text-slate-800 shadow-sm">{count}</span>
                      </div>
                    ))}
                    {Object.keys(stats.ticketsByType).length === 0 && (
                      <div className="text-center text-slate-400 text-xs py-8">Brak danych.</div>
                    )}
                  </div>
                </div>

                {/* Obciążenie techników - Klikalny z dynamicznymi kolorami */}
                <div 
                  onClick={() => onChangeView?.('technicians')}
                  className="lg:col-span-2 bg-white/95 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm flex flex-col overflow-hidden cursor-pointer hover:border-[#58b347]/50 hover:shadow-md transition-all duration-300 group"
                  title="Przejdź do Zespołów"
                >
                  <div className="p-5 border-b border-slate-100/60 bg-slate-50/50 flex items-center justify-between group-hover:bg-[#58b347]/5 transition-colors">
                    <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider flex items-center gap-2 group-hover:text-[#58b347] transition-colors"><IconUsers /> Zespół Zadaniowy</h3>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aktywne zadania</span>
                  </div>
                  <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    {Object.entries(stats.techWorkload).length > 0 ? (
                      Object.entries(stats.techWorkload).sort((a: any, b: any) => b[1] - a[1]).map(([techId, count]: any) => {
                        const loadPct = (count / maxWorkload) * 100;
                        const workloadStyle = getWorkloadStyle(count, maxWorkload);

                        return (
                          <div key={techId} className="flex flex-col gap-2">
                            <div className="flex justify-between items-end">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-slate-100/80 flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-200">
                                  {getInitials(getTechName(techId))}
                                </div>
                                <div>
                                  <span className="block text-sm font-semibold text-slate-800 leading-tight">{getTechName(techId)}</span>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider ${workloadStyle.text}`}>{workloadStyle.label}</span>
                                </div>
                              </div>
                              <span className="text-lg font-bold text-slate-800 tabular-nums">{count}</span>
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1">
                              <div 
                                className={`h-full rounded-full transition-all duration-1000 ease-out ${workloadStyle.bg}`} 
                                style={{ width: `${loadPct}%` }}
                              ></div>
                            </div>
                          </div>
                        )
                      })
                    ) : (
                      <div className="col-span-full flex flex-col items-center justify-center py-8 text-slate-400">
                        <IconActivity />
                        <p className="text-xs font-medium mt-2">Wszyscy technicy mają puste kolejki.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* ALERTY MAGAZYNOWE - Klikalny */}
                <div 
                  onClick={() => onChangeView?.('equipment')}
                  className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm flex flex-col overflow-hidden cursor-pointer hover:border-red-300 hover:shadow-md transition-all duration-300 group"
                  title="Przejdź do Magazynu"
                >
                  <div className="p-5 border-b border-slate-100/60 flex items-center justify-between bg-slate-50/50 group-hover:bg-red-50/30 transition-colors">
                    <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider group-hover:text-red-700 transition-colors">Braki Magazynowe</h3>
                    <span className="bg-red-50 text-red-600 border border-red-100 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">Krytyczne</span>
                  </div>
                  <div className="p-0 flex-1 overflow-y-auto max-h-[300px] scrollbar-hide">
                    <ul className="divide-y divide-slate-100/60">
                      {stats.lowStockParts.length > 0 ? (
                        stats.lowStockParts.map((part: any) => (
                          <li key={part.id} className="p-4 hover:bg-red-50/50 transition-colors flex justify-between items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{part.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{part.sku}</p>
                            </div>
                            <div className="shrink-0 text-red-600 font-bold text-base tabular-nums">
                              {part.main_stock}
                            </div>
                          </li>
                        ))
                      ) : (
                        <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400">
                          <IconBox />
                          <p className="text-xs font-medium mt-2">Stany magazynowe w normie.</p>
                        </div>
                      )}
                    </ul>
                  </div>
                </div>

              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}