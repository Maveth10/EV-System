import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../app/supabase';

const IconTrendingUp = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const IconAlertTriangle = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconActivity = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconBox = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;

export default function AnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalStations: 0,
    stationsDown: 0,
    ticketsTotal: 0,
    ticketsActive: 0,
    ticketsByStatus: {},
    ticketsByType: {},
    lowStockParts: 0,
    techWorkload: {}
  });

  const [technicians, setTechnicians] = useState<any[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      
      const [statRes, tickRes, partRes, techRes] = await Promise.all([
        supabase.from('stations').select('id, status'),
        supabase.from('tickets').select('id, status, ticket_type, technician_id'),
        supabase.from('parts').select('id, main_stock'),
        supabase.from('technicians').select('id, name')
      ]);

      const stations = statRes.data || [];
      const tickets = tickRes.data || [];
      const parts = partRes.data || [];
      const techs = techRes.data || [];

      setTechnicians(techs);

      // Obliczenia
      const totalStations = stations.length;
      const stationsDown = stations.filter(s => s.status === 'Awaria').length;
      
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

      const lowStockParts = parts.filter(p => p.main_stock < 5).length;

      const techWorkload = tickets.filter(t => t.status !== 'Zakończone').reduce((acc: any, t) => {
        if (t.technician_id) {
          acc[t.technician_id] = (acc[t.technician_id] || 0) + 1;
        }
        return acc;
      }, {});

      setStats({
        totalStations,
        stationsDown,
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

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-50 z-40 p-8 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto space-y-6">
        
        {/* Nagłówek */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <IconTrendingUp /> Statystyki i BI
          </h1>
          <p className="text-sm text-slate-500 mt-1">Podsumowanie operacyjne sieci, zgłoszeń i zasobów na żywo.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12 text-slate-400 font-medium animate-pulse">Analizowanie danych operacyjnych...</div>
        ) : (
          <>
            {/* Kafelki KPI */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><IconActivity /></div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sieć EV</span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-800">{stats.totalStations}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Wszystkie stacje w bazie</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-red-50 text-red-600 rounded-lg"><IconAlertTriangle /></div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Krytyczne</span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-red-600">{stats.stationsDown}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Stacje w stanie Awarii</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg"><IconTrendingUp /></div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Zgłoszenia</span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-slate-800">{stats.ticketsActive}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Aktywne zadania w toku</p>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><IconBox /></div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Magazyn</span>
                </div>
                <div>
                  <h3 className="text-3xl font-black text-purple-600">{stats.lowStockParts}</h3>
                  <p className="text-sm font-medium text-slate-500 mt-1">Części z niskim stanem (&lt;5 szt)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Lejek zgłoszeń (Rozkład statusów) */}
              <div className="col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Lejek Operacyjny Zgłoszeń</h3>
                <div className="space-y-5">
                  {[
                    { label: 'Nowe', count: stats.ticketsByStatus['Nowe'] || 0, color: 'bg-slate-500' },
                    { label: 'W toku', count: stats.ticketsByStatus['W toku'] || 0, color: 'bg-blue-500' },
                    { label: 'Oczekuje na części', count: stats.ticketsByStatus['Oczekuje na części'] || 0, color: 'bg-orange-500' },
                    { label: 'Zakończone', count: stats.ticketsByStatus['Zakończone'] || 0, color: 'bg-[#58b347]' },
                  ].map(stat => (
                    <div key={stat.label}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className="font-medium text-slate-700">{stat.label}</span>
                        <span className="font-bold text-slate-800">{stat.count} <span className="text-slate-400 font-normal ml-1">({getPercentage(stat.count, stats.ticketsTotal)}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div className={`h-2.5 rounded-full ${stat.color} transition-all duration-1000`} style={{ width: `${getPercentage(stat.count, stats.ticketsTotal)}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Typy zgłoszeń */}
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Rozkład Akcji</h3>
                <div className="space-y-3">
                  {Object.entries(stats.ticketsByType).sort((a: any, b: any) => b[1] - a[1]).map(([type, count]: any) => (
                    <div key={type} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <span className="text-sm font-medium text-slate-700">{type}</span>
                      <span className="bg-white border border-slate-200 px-3 py-1 rounded-md text-sm font-bold text-slate-800 shadow-sm">{count}</span>
                    </div>
                  ))}
                  {Object.keys(stats.ticketsByType).length === 0 && (
                    <div className="text-center text-slate-400 text-sm py-4">Brak danych o zgłoszeniach</div>
                  )}
                </div>
              </div>

              {/* Obciążenie techników */}
              <div className="col-span-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Obciążenie Serwisu Mobilnego (Aktywne Zadania)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Object.entries(stats.techWorkload).length > 0 ? (
                    Object.entries(stats.techWorkload).sort((a: any, b: any) => b[1] - a[1]).map(([techId, count]: any) => (
                      <div key={techId} className="flex items-center gap-4 p-4 border border-slate-100 rounded-xl bg-slate-50">
                        <div className="w-10 h-10 rounded-full bg-[#58b347]/10 flex items-center justify-center text-[#58b347] font-bold text-sm shrink-0">
                          {getTechName(techId).charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 leading-tight">{getTechName(techId)}</p>
                          <p className="text-xs text-slate-500 mt-0.5"><strong className="text-orange-600">{count}</strong> przypisanych zadań</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="col-span-full text-center text-slate-400 text-sm py-8">Wszyscy technicy mają obecnie czyste konto.</div>
                  )}
                </div>
              </div>

            </div>
          </>
        )}
      </div>
    </div>
  );
}