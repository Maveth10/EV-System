'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../app/supabase';

// --- IKONY ---
const IconTrendingUp = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const IconAlertTriangle = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconActivity = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
const IconBox = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>;
const IconUsers = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconZap = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>;
const IconPlusCenter = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconTrash = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconList = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;

const customScrollbarClasses = "[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#58b347]/80";

type CustomKpiConfig = {
  id: string;
  title: string;
  metric: 'tickets_new' | 'tickets_in_progress' | 'stations_ok' | 'parts_all';
  icon: 'zap' | 'box' | 'activity' | 'users' | 'list';
  color: 'green' | 'blue' | 'slate' | 'orange' | 'red';
};

interface AnalyticsDashboardProps {
  onChangeView?: (view: string) => void;
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
    totalPartsInStock: 0,
    techWorkload: {}
  });

  const [technicians, setTechnicians] = useState<any[]>([]);

  // DRAG & DROP Wskaźników KPI
  const defaultKpiIds = ['default_uptime', 'default_critical', 'default_active', 'default_inventory'];
  const [kpiOrder, setKpiOrder] = useState<string[]>([]);
  const [customKpis, setCustomKpis] = useState<CustomKpiConfig[]>([]);
  const [draggedKpiId, setDraggedKpiId] = useState<string | null>(null);
  const draggedKpiRef = useRef<string | null>(null);
  
  const kpiScrollRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  // Modal Dodawania Kafelka
  const [isAddKpiModalOpen, setIsAddKpiModalOpen] = useState(false);
  const [newKpi, setNewKpi] = useState<Partial<CustomKpiConfig>>({ title: '', metric: 'tickets_new', icon: 'activity', color: 'blue' });

  useEffect(() => {
    let parsedCustom: CustomKpiConfig[] = [];
    const savedKpis = localStorage.getItem('ekoen_analytics_custom_kpis');
    if (savedKpis) {
      try { parsedCustom = JSON.parse(savedKpis); setCustomKpis(parsedCustom); } catch (e) {}
    }

    const savedOrder = localStorage.getItem('ekoen_analytics_kpi_order');
    const expectedIds = [...defaultKpiIds, ...parsedCustom.map(k => k.id)];
    
    if (savedOrder) {
      try { 
        let order = JSON.parse(savedOrder);
        const finalOrder = order.filter((id: string) => expectedIds.includes(id));
        expectedIds.forEach((id: string) => { if (!finalOrder.includes(id)) finalOrder.push(id); });
        setKpiOrder(finalOrder);
      } catch(e) { setKpiOrder(expectedIds); }
    } else {
      setKpiOrder(expectedIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setIsLoading(true);
      
      const [statRes, tickRes, partRes, techRes] = await Promise.all([
        supabase.from('stations').select('id, status'),
        supabase.from('tickets').select('id, status, ticket_type, technician_id'),
        supabase.from('parts').select('id, name, sku, main_stock, min_stock'),
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

      const lowStockParts = parts
        .filter(p => p.main_stock <= (p.min_stock || 0))
        .sort((a, b) => a.main_stock - b.main_stock);
        
      const totalPartsInStock = parts.reduce((sum, p) => sum + (p.main_stock || 0), 0);

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
        totalPartsInStock,
        techWorkload
      });

      setIsLoading(false);
    };

    fetchAnalytics();
  }, []);

  // AUTO-SCROLL HORIZONTAL (Rolka Myszy)
  useEffect(() => {
    const el = kpiScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > 0) {
        const isScrollable = el.scrollWidth > el.clientWidth;
        if (!isScrollable) return;

        const atLeftEdge = el.scrollLeft <= 0 && e.deltaY < 0;
        const atRightEdge = Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth && e.deltaY > 0;

        if (!atLeftEdge && !atRightEdge) {
          e.preventDefault();
          el.scrollLeft += e.deltaY * 1.5;
        }
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [isLoading]);

  // --- WODOTRYSK: INTELIGENTNY EDGE-SCROLL PRZY NAJECHANIU NA KRAWĘDZIE ---
  const stopEdgeScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const startEdgeScroll = useCallback((direction: 'left' | 'right') => {
    stopEdgeScroll();
    
    const scrollContainer = kpiScrollRef.current;
    if (!scrollContainer) return;

    const performScroll = () => {
      const speed = 6; // Prędkość automatycznego przewijania
      if (direction === 'left') {
        scrollContainer.scrollLeft -= speed;
      } else {
        scrollContainer.scrollLeft += speed;
      }
      scrollIntervalRef.current = requestAnimationFrame(performScroll);
    };

    scrollIntervalRef.current = requestAnimationFrame(performScroll);
  }, [stopEdgeScroll]);

  // Czyszczenie interwału przy odmontowaniu
  useEffect(() => {
    return () => stopEdgeScroll();
  }, [stopEdgeScroll]);

  // KLAWISZ ESCAPE (Dla Modala Dodawania)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAddKpiModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  // --- LOGIKA DRAG & DROP DLA KAFELKÓW ---
  const handleKpiDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    draggedKpiRef.current = id;
    setTimeout(() => setDraggedKpiId(id), 0);
  };

  const handleKpiDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    
    const container = kpiScrollRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < 80) container.scrollLeft -= 15;
      else if (x > rect.width - 80) container.scrollLeft += 15;
    }
  };

  const handleKpiDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedKpiRef.current || e.dataTransfer.getData('text/plain');
    
    if (!sourceId || sourceId === targetId) {
       setDraggedKpiId(null);
       return;
    }

    const sourceIndex = kpiOrder.indexOf(sourceId);
    const targetIndex = kpiOrder.indexOf(targetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const newOrder = [...kpiOrder];
      const [movedItem] = newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, movedItem);
      setKpiOrder(newOrder);
      localStorage.setItem('ekoen_analytics_kpi_order', JSON.stringify(newOrder));
    }
    setDraggedKpiId(null);
    draggedKpiRef.current = null;
  };

  const saveCustomKpi = (e: React.FormEvent) => {
    e.preventDefault();
    const newKpiObj: CustomKpiConfig = {
      id: `custom_${Math.random().toString(36).substring(7)}`,
      title: newKpi.title || 'Nowy Wskaźnik',
      metric: newKpi.metric as any,
      icon: newKpi.icon as any,
      color: newKpi.color as any
    };

    const updatedCustom = [...customKpis, newKpiObj];
    setCustomKpis(updatedCustom);
    
    const newOrder = [...kpiOrder, newKpiObj.id];
    setKpiOrder(newOrder);

    localStorage.setItem('ekoen_analytics_custom_kpis', JSON.stringify(updatedCustom));
    localStorage.setItem('ekoen_analytics_kpi_order', JSON.stringify(newOrder));
    
    setIsAddKpiModalOpen(false);
    setNewKpi({ title: '', metric: 'tickets_new', icon: 'activity', color: 'blue' });
  };

  const deleteCustomKpi = (id: string) => {
    const updatedCustom = customKpis.filter(k => k.id !== id);
    setCustomKpis(updatedCustom);
    
    const newOrder = kpiOrder.filter(kId => kId !== id);
    setKpiOrder(newOrder);

    localStorage.setItem('ekoen_analytics_custom_kpis', JSON.stringify(updatedCustom));
    localStorage.setItem('ekoen_analytics_kpi_order', JSON.stringify(newOrder));
  };

  // --- RENDEROWANIE KAFELKA KPI ---
  const renderKpiCard = (id: string) => {
    const isDragged = draggedKpiId === id;
    const commonClasses = `min-w-[280px] h-[104px] shrink-0 bg-white/80 backdrop-blur-md border rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between cursor-grab active:cursor-grabbing transition-colors relative group box-border ${isDragged ? 'opacity-40 scale-95' : ''}`;

    if (id === 'default_uptime') {
      return (
        <div key={id} draggable onDragStart={(e) => handleKpiDragStart(e, id)} onDragOver={handleKpiDragOver} onDrop={(e) => handleKpiDrop(e, id)} onClick={() => onChangeView?.('stations')} className={`${commonClasses} border-white/60 hover:border-[#58b347]/50`}>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Uptime Sieci</p>
            <p className={`text-3xl font-bold ${stats.networkHealth >= 90 ? 'text-[#58b347]' : 'text-slate-700'}`}>{stats.networkHealth}%</p>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center pointer-events-none bg-[#58b347]/10 text-[#58b347]"><IconZap /></div>
        </div>
      );
    }
    
    if (id === 'default_critical') {
      const isCritical = stats.stationsDown > 0;
      return (
        <div key={id} draggable onDragStart={(e) => handleKpiDragStart(e, id)} onDragOver={handleKpiDragOver} onDrop={(e) => handleKpiDrop(e, id)} onClick={() => onChangeView?.('tickets')} className={`${commonClasses} ${isCritical ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Stacje w awarii</p>
            <p className={`text-3xl font-bold ${isCritical ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>{stats.stationsDown}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-none ${isCritical ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}><IconAlertTriangle /></div>
        </div>
      );
    }

    if (id === 'default_active') {
      return (
        <div key={id} draggable onDragStart={(e) => handleKpiDragStart(e, id)} onDragOver={handleKpiDragOver} onDrop={(e) => handleKpiDrop(e, id)} onClick={() => onChangeView?.('tickets')} className={`${commonClasses} border-white/60 hover:border-blue-400`}>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aktywne zadania</p>
            <p className="text-3xl font-bold text-slate-700">{stats.ticketsActive}</p>
          </div>
          <div className="w-12 h-12 rounded-full flex items-center justify-center pointer-events-none bg-blue-50 text-blue-500"><IconTrendingUp /></div>
        </div>
      );
    }

    if (id === 'default_inventory') {
      const hasShortage = stats.lowStockParts.length > 0;
      return (
        <div key={id} draggable onDragStart={(e) => handleKpiDragStart(e, id)} onDragOver={handleKpiDragOver} onDrop={(e) => handleKpiDrop(e, id)} onClick={() => onChangeView?.('equipment')} className={`${commonClasses} ${hasShortage ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/50' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Krytyczne braki</p>
            <p className={`text-3xl font-bold ${hasShortage ? 'text-orange-500 animate-pulse' : 'text-slate-700'}`}>{stats.lowStockParts.length}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-none ${hasShortage ? 'bg-orange-100 text-orange-500' : 'bg-slate-50 text-slate-400'}`}><IconBox /></div>
        </div>
      );
    }

    const cKpi = customKpis.find(k => k.id === id);
    if (cKpi) {
      let value = 0;
      if (cKpi.metric === 'tickets_new') value = stats.ticketsByStatus['Nowe'] || 0;
      if (cKpi.metric === 'tickets_in_progress') value = stats.ticketsByStatus['W toku'] || 0;
      if (cKpi.metric === 'stations_ok') value = stats.totalStations - stats.stationsDown;
      if (cKpi.metric === 'parts_all') value = stats.totalPartsInStock;

      const colorMap: any = {
        'green': { border: 'hover:border-[#58b347]/50', iconBg: 'bg-green-50 text-[#58b347]' },
        'blue': { border: 'hover:border-blue-400', iconBg: 'bg-blue-50 text-blue-500' },
        'orange': { border: 'hover:border-orange-400', iconBg: 'bg-orange-50 text-orange-500' },
        'red': { border: 'hover:border-red-400', iconBg: 'bg-red-50 text-red-500' },
        'slate': { border: 'hover:border-slate-400', iconBg: 'bg-slate-100 text-slate-500' }
      };
      const colors = colorMap[cKpi.color];

      return (
        <div key={id} draggable onDragStart={(e) => handleKpiDragStart(e, id)} onDragOver={handleKpiDragOver} onDrop={(e) => handleKpiDrop(e, id)} className={`${commonClasses} border-white/60 ${colors.border}`}>
          <button onClick={(e) => { e.stopPropagation(); deleteCustomKpi(id); }} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-auto" title="Usuń wskaźnik"><IconTrash /></button>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{cKpi.title}</p>
            <p className="text-3xl font-bold text-slate-700">{value}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-none ${colors.iconBg}`}>
            {cKpi.icon === 'zap' && <IconZap />}
            {cKpi.icon === 'box' && <IconBox />}
            {cKpi.icon === 'activity' && <IconActivity />}
            {cKpi.icon === 'users' && <IconUsers />}
            {cKpi.icon === 'list' && <IconList />}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`absolute inset-0 bg-slate-100/60 backdrop-blur-2xl border-l border-white/20 z-40 overflow-hidden flex flex-col font-sans transition-[left] duration-300 ease-out shadow-[-10px_0_30px_rgba(0,0,0,0.05)] ${isSidebarHovered ? 'left-[256px]' : 'left-[72px]'}`}>
      
      {/* Pasek nawigacji górnej */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/40 px-6 py-4 flex justify-between items-center shrink-0">
        <div>
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
        <div className="max-w-[1300px] mx-auto flex flex-col gap-6 min-h-max">
          
          {isLoading ? (
            <div className="flex justify-center p-12 text-sm text-slate-600 font-medium animate-pulse bg-white/50 rounded-xl border border-white/60 shadow-sm backdrop-blur-md">
              Kalkulowanie danych operacyjnych...
            </div>
          ) : (
            <>
              {/* --- KAFELKI KPI Z DOTYKOWYMI / MYSZKOWYMI STREFAMI EDGE-SCROLL --- */}
              <div className="relative group/scroll">
                
                {/* STREFA EDGE-SCROLL LEWA */}
                <div 
                  onMouseEnter={() => startEdgeScroll('left')} 
                  onMouseLeave={stopEdgeScroll}
                  className="absolute left-0 top-0 bottom-2 w-10 z-30 cursor-w-resize bg-gradient-to-r from-slate-100/40 to-transparent pointer-events-auto opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300"
                />

                {/* KONTENER KAFELKÓW */}
                <div 
                  ref={kpiScrollRef} 
                  className={`flex overflow-x-auto gap-6 pb-2 items-stretch shrink-0 select-none ${customScrollbarClasses}`}
                >
                  {kpiOrder.map(id => renderKpiCard(id))}

                  {/* Przycisk "Dodaj wskaźnik" */}
                  <div 
                    onClick={() => setIsAddKpiModalOpen(true)}
                    className="min-w-[150px] w-[150px] h-[104px] shrink-0 bg-white/50 hover:bg-slate-50 backdrop-blur-md border-2 border-dashed border-slate-300 hover:border-[#58b347] rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-[#58b347] cursor-pointer transition-all group box-border relative overflow-hidden"
                  >
                    <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm mb-1.5 group-hover:scale-110 transition-transform z-10">
                      <IconPlusCenter />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-center z-10">Nowy Wskaźnik</span>
                  </div>
                  <div className="w-2 shrink-0 opacity-0 pointer-events-none">.</div>
                </div>

                {/* STREFA EDGE-SCROLL PRAWA */}
                <div 
                  onMouseEnter={() => startEdgeScroll('right')} 
                  onMouseLeave={stopEdgeScroll}
                  className="absolute right-0 top-0 bottom-2 w-10 z-30 cursor-e-resize bg-gradient-to-l from-slate-100/40 to-transparent pointer-events-auto opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300"
                />
              </div>

              {/* --- GŁÓWNE PANELE DANYCH --- */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Lejek zgłoszeń */}
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

                {/* Typy zgłoszeń */}
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

                {/* Obciążenie techników */}
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

                {/* ALERTY MAGAZYNOWE */}
                <div 
                  onClick={() => onChangeView?.('equipment')}
                  className="bg-white/95 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm flex flex-col overflow-hidden cursor-pointer hover:border-orange-300 hover:shadow-md transition-all duration-300 group"
                  title="Przejdź do Magazynu"
                >
                  <div className="p-5 border-b border-slate-100/60 flex items-center justify-between bg-slate-50/50 group-hover:bg-orange-50/30 transition-colors">
                    <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider group-hover:text-orange-600 transition-colors">Braki Magazynowe</h3>
                    {stats.lowStockParts.length > 0 && (
                      <span className="bg-orange-50 text-orange-600 border border-orange-100 text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shadow-sm">Poniżej progu</span>
                    )}
                  </div>
                  <div className="p-0 flex-1 overflow-y-auto max-h-[300px] scrollbar-hide">
                    <ul className="divide-y divide-slate-100/60">
                      {stats.lowStockParts.length > 0 ? (
                        stats.lowStockParts.map((part: any) => (
                          <li key={part.id} className="p-4 hover:bg-orange-50/50 transition-colors flex justify-between items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-slate-800 truncate leading-tight">{part.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5">{part.sku}</p>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                               <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded" title={`Próg krytyczny w bazie to ${part.min_stock || 0}`}>Min: {part.min_stock || 0}</span>
                               <span className="text-orange-600 font-bold text-base tabular-nums">{part.main_stock}</span>
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
            </>
          )}
        </div>
      </div>

      {/* --- MODAL DODAWANIA KAFELKA --- */}
      {isAddKpiModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setIsAddKpiModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">Nowy Wskaźnik (KPI)</h3>
              <button onClick={() => setIsAddKpiModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            
            <form onSubmit={saveCustomKpi} className="p-6 space-y-5 bg-slate-50/30">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Tytuł wskaźnika *</label>
                  <input required type="text" value={newKpi.title} onChange={e => setNewKpi({...newKpi, title: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" placeholder="Np. Działające stacje" />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Źródło danych (Metryka)</label>
                <select value={newKpi.metric} onChange={e => setNewKpi({...newKpi, metric: e.target.value as any})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] transition-all shadow-sm cursor-pointer">
                  <option value="tickets_new">Liczba Zgłoszeń: Nowe</option>
                  <option value="tickets_in_progress">Liczba Zgłoszeń: W toku</option>
                  <option value="stations_ok">Działające Stacje (Online)</option>
                  <option value="parts_all">Suma wszystkich części (Magazyn)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Motyw kolorystyczny</label>
                  <select value={newKpi.color} onChange={e => setNewKpi({...newKpi, color: e.target.value as any})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] transition-all shadow-sm cursor-pointer">
                    <option value="green">Zielony Ekoen</option>
                    <option value="blue">Niebieski</option>
                    <option value="orange">Pomarańczowy</option>
                    <option value="slate">Szary Neutralny</option>
                    <option value="red">Czerwony</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Ikona</label>
                  <select value={newKpi.icon} onChange={e => setNewKpi({...newKpi, icon: e.target.value as any})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] transition-all shadow-sm cursor-pointer">
                    <option value="activity">Wykres Liniowy</option>
                    <option value="zap">Piorun (Energia)</option>
                    <option value="box">Pudełko (Magazyn)</option>
                    <option value="users">Ludzie (Zespoły)</option>
                    <option value="list">Lista (Zadania)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200 mt-4">
                <button type="button" onClick={() => setIsAddKpiModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-xs uppercase tracking-widest">Anuluj</button>
                <button type="submit" disabled={!newKpi.title} className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl hover:bg-[#499b3a] disabled:opacity-50 shadow-sm transition-all text-xs uppercase tracking-widest">Zapisz wskaźnik</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}