'use client';
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../app/supabase';

// --- TYPY ---
type CalendarEvent = { id: string; start_time: string; end_time: string; title: string; event_type: string; technician_id: string | null; ticket_id: string | null; };
type Ticket = { id: string; ticket_code: string; station_id: string; technician_id: string | null; ticket_type: string; status: string; priority: string; created_at: string; };
type Station = { id: string; name: string; city: string | null; client: string | null; technician: string | null; };
type Technician = { id: string; name: string; color?: string; };
type Client = { id: string; name: string; sla_hours: number; };

type SearchQuery = { id: string; text: string; logic: 'AND' | 'OR' | 'NOT' };
type CustomTabEq = { id: string; name: string; filterQueries: SearchQuery[] };

// --- KLASY DLA SCROLLBARA ---
const customScrollbarClasses = "[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#58b347]/40 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#58b347]/80";

// --- IKONY SVG ---
const IconChevronLeft = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const IconChevronRight = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const IconChevronDown = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const IconCalendar = () => <svg className="w-4 h-4 inline-block mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconCalendarLarge = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconTrash = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconFilter = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const IconSearch = () => <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconPlus = () => <svg className="w-4 h-4 inline-block mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconPlusCenter = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconAlertTriangle = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconList = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IconMapPin = () => <svg className="w-3.5 h-3.5 inline mr-1 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconUser = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>;
const IconCheckCircle = () => <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

const WEEKDAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];

// Pełna doba (48 slotów co 30 min)
const GENERATED_SLOTS = Array.from({ length: 49 }, (_, i) => i * 0.5);

const addDays = (dateStr: string | Date, days: number) => {
  const d = new Date(dateStr); d.setDate(d.getDate() + days); return d;
};
const getMonday = (d: Date) => {
  const date = new Date(d); const day = date.getDay(); const diff = date.getDate() - day + (day === 0 ? -6 : 1); return new Date(date.setDate(diff));
};

// --- KOMPONENT WYSZUKIWARKI ---
const SearchQueryBuilder = ({ queries, setQueries }: { queries: SearchQuery[], setQueries: (q: SearchQuery[]) => void }) => {
  const addQuery = () => setQueries([...queries, { id: Math.random().toString(), text: '', logic: 'AND' }]);
  const updateQuery = (id: string, updates: Partial<SearchQuery>) => {
    setQueries(queries.map(q => q.id === id ? { ...q, ...updates } : q));
  };
  const removeQuery = (id: string) => {
    setQueries(queries.filter(q => q.id !== id));
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-2xl animate-fadeIn">
      {queries.map((q, idx) => (
        <div key={q.id} className="flex items-center gap-2 w-full">
          <select
            value={q.logic}
            onChange={e => updateQuery(q.id, { logic: e.target.value as any })}
            className={`border border-slate-200 rounded-xl px-2 py-2 text-[10px] font-bold uppercase tracking-widest focus:outline-none focus:border-[#58b347] transition-colors shrink-0 shadow-sm cursor-pointer ${q.logic === 'AND' ? 'bg-[#58b347]/10 text-[#499b3a] border-[#58b347]/30' : q.logic === 'NOT' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-slate-50 text-slate-600'}`}
          >
            <option value="AND">{idx === 0 ? 'ZAWIERA' : 'ORAZ'}</option>
            <option value="OR">{idx === 0 ? 'MOŻE BYĆ' : 'LUB'}</option>
            <option value="NOT">{idx === 0 ? 'WYKLUCZ' : 'WYKLUCZ'}</option>
          </select>

          <div className="relative flex-1 flex items-center bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden focus-within:border-[#58b347] focus-within:ring-1 focus-within:ring-[#58b347]/30 transition-all h-[38px]">
            <div className="flex items-center justify-center pl-3 w-8 h-full shrink-0 text-slate-400">
              <IconSearch />
            </div>
            <input
              value={q.text}
              onChange={e => updateQuery(q.id, { text: e.target.value })}
              placeholder="Szukaj (miasto, nr zgłoszenia, typ)..."
              className="w-full pl-2 pr-3 py-2 text-xs font-semibold focus:outline-none bg-transparent h-full border-none"
            />
          </div>

          {queries.length > 1 && (
            <button type="button" onClick={() => removeQuery(q.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors shrink-0 flex items-center justify-center h-[38px]" title="Usuń warunek">
              <IconTrash />
            </button>
          )}
        </div>
      ))}
      
      <button 
        type="button"
        onClick={addQuery}
        className="text-[10px] font-bold text-slate-500 hover:text-[#58b347] bg-white border border-slate-200 hover:border-[#58b347]/50 rounded-xl py-2 px-3 w-max flex items-center gap-1.5 transition-colors shadow-sm mt-1"
      >
        <IconPlus /> Dodaj warunek
      </button>
    </div>
  );
};

interface CalendarViewProps {
  isSidebarHovered?: boolean;
}

export default function CalendarView({ isSidebarHovered = false }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedTechId, setSelectedTechId] = useState<string>('ALL');
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // ZAAWANSOWANE FILTROWANIE
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([{ id: 'init', text: '', logic: 'AND' }]);
  const [activeFilter, setActiveFilter] = useState<string>('default_all');
  const [customTabs, setCustomTabs] = useState<CustomTabEq[]>([]);
  const defaultTabIds = ['default_all', 'default_urgent', 'default_today'];
  const [tabOrder, setTabOrder] = useState<string[]>([]);
  
  const [isCustomTabModalOpen, setIsCustomTabModalOpen] = useState(false);
  const [newCustomTab, setNewCustomTab] = useState<{ name: string, filterQueries: SearchQuery[] }>({ name: '', filterQueries: [{ id: 'c_init', text: '', logic: 'AND' }] });

  // DANE Z BAZY
  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  // MECHANIZM DRAG & DROP ZGŁOSZEŃ
  const [dragState, setDragState] = useState<{ type: 'NEW' | 'MOVE' | 'RESIZE', payloadId: string } | null>(null);
  
  // TIMERY I OPÓŹNIENIA (WODOTRYSKI UX)
  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null);
  const eventHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ticketHoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoRevertTechTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // MECHANIZM DRAG & DROP ZAKŁADEK
  const draggedTabRef = useRef<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

  // REFS DO SCROLLOWANIA I ZDARZEŃ
  const scrollContainerRef = useRef<HTMLDivElement>(null); 
  const gridScrollRef = useRef<HTMLDivElement>(null);      
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const headerWheelRef = useRef<HTMLDivElement>(null);
  const wheelTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // --- OBSŁUGA KLAWISZA ESC ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsCustomTabModalOpen(false);
        setIsDatePickerOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- ŁADOWANIE ZAKŁADEK ---
  useEffect(() => {
    let parsedCustom: CustomTabEq[] = [];
    const savedTabs = localStorage.getItem('ekoen_calendar_custom_tabs');
    if (savedTabs) {
      try { parsedCustom = JSON.parse(savedTabs); setCustomTabs(parsedCustom); } catch (e) {}
    }

    const savedOrder = localStorage.getItem('ekoen_calendar_tab_order');
    const expectedIds = [...defaultTabIds, ...parsedCustom.map(t => t.id)];
    
    if (savedOrder) {
      try { 
        let order = JSON.parse(savedOrder);
        const finalOrder = order.filter((id: string) => expectedIds.includes(id));
        expectedIds.forEach(id => { if (!finalOrder.includes(id)) finalOrder.push(id); });
        setTabOrder(finalOrder);
      } catch(e) { setTabOrder(expectedIds); }
    } else {
      setTabOrder(expectedIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    const [eventsRes, ticketsRes, statRes, techRes, clientsRes] = await Promise.all([
      supabase.from('calendar_events').select('*'),
      supabase.from('tickets').select('*').neq('status', 'Zakończone'),
      supabase.from('stations').select('id, name, city, client, technician'),
      supabase.from('technicians').select('id, name, color'),
      supabase.from('clients').select('id, name, sla_hours')
    ]);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (ticketsRes.data) setTickets(ticketsRes.data);
    if (statRes.data) setStations(statRes.data);
    if (techRes.data) setTechnicians(techRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    setIsLoading(false);
  };

  useEffect(() => { 
    fetchData(); 
    return () => { 
      if (ticketHoverTimeoutRef.current) clearTimeout(ticketHoverTimeoutRef.current);
      if (eventHoverTimeoutRef.current) clearTimeout(eventHoverTimeoutRef.current);
      if (autoRevertTechTimeoutRef.current) clearTimeout(autoRevertTechTimeoutRef.current);
      if (wheelTimeoutRef.current) clearTimeout(wheelTimeoutRef.current);
    };
  }, []);

  // AUTO-SCROLL ZAKŁADEK (Horyzontalny)
  useEffect(() => {
    const el = tabsScrollRef.current;
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

  // SMART AUTO-SCROLL KALENDARZA DO RZECZYWISTEJ GODZINY (MINUS 2 GODZINY)
  useEffect(() => {
    if (viewMode !== 'month' && gridScrollRef.current) {
      setTimeout(() => {
        if (gridScrollRef.current) {
          const now = new Date();
          const currentHour = now.getHours();
          const currentMinute = now.getMinutes();
          // Odejmujemy aż 2 godziny dla idealnego kontekstu wzrokowego
          let targetScroll = ((currentHour - 2) + currentMinute / 60) * 80;
          if (targetScroll < 0) targetScroll = 0;
          
          gridScrollRef.current.scrollTop = targetScroll;
        }
      }, 100);
    }
  }, [viewMode, isLoading, currentDate]);

  // NAWIGACJA DAT
  const goPrev = useCallback(() => setCurrentDate(prev => addDays(prev, viewMode === 'day' ? -1 : viewMode === 'week' ? -7 : -30)), [viewMode]);
  const goNext = useCallback(() => setCurrentDate(prev => addDays(prev, viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30)), [viewMode]);
  const goToday = () => { setCurrentDate(new Date()); setIsDatePickerOpen(false); };

  // NASŁUCHIWANIE SWIPE'A NA SIATCE (BLOKADA OSI Y PRZY SWIPE X)
  useEffect(() => {
    const grid = gridScrollRef.current;
    if (!grid) return;

    const handleWheel = (e: WheelEvent) => {
      // Swipe w poziomie (Trackpad) - blokada góra/dół i przeskok kalendarza
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY) && Math.abs(e.deltaX) > 10) {
        e.preventDefault(); 
        if (wheelTimeoutRef.current) return;
        if (e.deltaX > 0) goNext();
        else goPrev();
        wheelTimeoutRef.current = setTimeout(() => { wheelTimeoutRef.current = null; }, 500);
      }
    };

    grid.addEventListener('wheel', handleWheel, { passive: false });
    return () => grid.removeEventListener('wheel', handleWheel);
  }, [goNext, goPrev]);

  // NASŁUCHIWANIE SWIPE'A NA NAGŁÓWKU DATY (Blokada Scrolla i zmiana daty)
  useEffect(() => {
    const headerEl = headerWheelRef.current;
    if (!headerEl) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault(); // CAŁKOWITA blokada scrolla góra/dół strony gdy jesteśmy na nagłówku
      if (wheelTimeoutRef.current) return;
      if (e.deltaY > 0 || e.deltaX > 0) goNext();
      else if (e.deltaY < 0 || e.deltaX < 0) goPrev();
      wheelTimeoutRef.current = setTimeout(() => { wheelTimeoutRef.current = null; }, 300);
    };

    headerEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => headerEl.removeEventListener('wheel', handleWheel);
  }, [goNext, goPrev]);

  // METODY GLOBALNE DO GRIDU
  const handleDoubleClickGrid = () => {
    if (selectedTechId !== 'ALL') {
      setSelectedTechId('ALL');
      clearAutoRevert();
    }
  };

  const handleRightClickGrid = (e: React.MouseEvent) => {
    e.preventDefault();
    setViewMode(prev => prev === 'day' ? 'week' : prev === 'week' ? 'month' : 'day');
  };

  // --- SMART FOCUS (Kontrola powrotów do widoku ALL) ---
  const setTempTechFilter = useCallback((techId: string, durationMs: number) => {
    setSelectedTechId(techId);
    if (autoRevertTechTimeoutRef.current) clearTimeout(autoRevertTechTimeoutRef.current);
    if (durationMs > 0) {
      autoRevertTechTimeoutRef.current = setTimeout(() => {
        setSelectedTechId('ALL');
      }, durationMs);
    }
  }, []);

  const clearAutoRevert = useCallback(() => {
    if (autoRevertTechTimeoutRef.current) clearTimeout(autoRevertTechTimeoutRef.current);
  }, []);

  const triggerAutoRevert = useCallback(() => {
    if (selectedTechId !== 'ALL') {
      setTempTechFilter(selectedTechId, 4000);
    }
  }, [selectedTechId, setTempTechFilter]);

  const handleManualTechSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'ALL') {
      setSelectedTechId('ALL');
      clearAutoRevert();
    } else {
      setTempTechFilter(val, 10000); 
    }
  };

  // --- HOVER LOGIC ---
  const handleTicketMouseEnter = (ticket: Ticket) => {
    ticketHoverTimeoutRef.current = setTimeout(() => {
      let techId = ticket.technician_id;
      if (!techId) {
        const st = stations.find(s => s.id === ticket.station_id);
        const techObj = technicians.find(t => t.name === st?.technician);
        if (techObj) techId = techObj.id;
      }
      if (techId) setTempTechFilter(techId, 0); 
    }, 500); 
  };

  const handleTicketMouseLeave = () => {
    if (ticketHoverTimeoutRef.current) clearTimeout(ticketHoverTimeoutRef.current);
    triggerAutoRevert(); 
  };

  const handleCalendarEventMouseEnter = (eventId: string) => {
    clearAutoRevert(); 
    eventHoverTimeoutRef.current = setTimeout(() => {
      setHoveredEventId(eventId);
    }, 1000); 
  };

  const handleCalendarEventMouseLeave = () => {
    if (eventHoverTimeoutRef.current) clearTimeout(eventHoverTimeoutRef.current);
    setHoveredEventId(null);
    triggerAutoRevert(); 
  };

  // --- LOGIKA FILTROWANIA (BACKLOG) ---
  const getSlaHoursLeft = useCallback((createdAt: string, stationId: string) => {
    const station = stations.find(s => s.id === stationId);
    const client = clients.find(c => c.name === station?.client);
    const slaHours = client?.sla_hours || 48;
    return ((new Date(createdAt).getTime() + (slaHours * 3600000)) - Date.now()) / 3600000;
  }, [stations, clients]);

  const evaluateCondition = useCallback((t: Ticket, qText: string) => {
    const lowerQ = qText.toLowerCase().trim();
    if (!lowerQ) return true;
    
    const s = stations.find(st => st.id === t.station_id);
    return (t.ticket_code.toLowerCase().includes(lowerQ)) ||
           (t.ticket_type.toLowerCase().includes(lowerQ)) ||
           (s?.name?.toLowerCase().includes(lowerQ)) ||
           (s?.city?.toLowerCase().includes(lowerQ)) ||
           (s?.client?.toLowerCase().includes(lowerQ));
  }, [stations]);

  const unscheduledTickets = useMemo(() => {
    return tickets.filter(tick => !events.some(e => e.ticket_id === tick.id));
  }, [tickets, events]);

  const filteredTickets = useMemo(() => {
    let result = unscheduledTickets;

    if (activeFilter === 'default_urgent') {
      result = result.filter(t => getSlaHoursLeft(t.created_at, t.station_id) < 24);
    } else if (activeFilter !== 'default_all' && activeFilter !== 'default_today') {
      const tabInfo = customTabs.find(c => c.id === activeFilter);
      if (tabInfo) {
        result = result.filter(t => {
          const validQ = tabInfo.filterQueries.filter(q => q.text.trim() !== '');
          if (validQ.length > 0) {
            let match = evaluateCondition(t, validQ[0].text);
            if (validQ[0].logic === 'NOT') match = !match;
            for (let i = 1; i < validQ.length; i++) {
              const conditionMet = evaluateCondition(t, validQ[i].text);
              if (validQ[i].logic === 'AND') match = match && conditionMet;
              else if (validQ[i].logic === 'OR') match = match || conditionMet;
              else if (validQ[i].logic === 'NOT') match = match && !conditionMet;
            }
            if (!match) return false;
          }
          return true;
        });
      }
    }

    const validSearchQueries = searchQueries.filter(q => q.text.trim() !== '');
    if (validSearchQueries.length > 0) {
      result = result.filter(t => {
        let match = evaluateCondition(t, validSearchQueries[0].text);
        if (validSearchQueries[0].logic === 'NOT') match = !match;
        for (let i = 1; i < validSearchQueries.length; i++) {
          const conditionMet = evaluateCondition(t, validSearchQueries[i].text);
          if (validSearchQueries[i].logic === 'AND') match = match && conditionMet;
          else if (validSearchQueries[i].logic === 'OR') match = match || conditionMet;
          else if (validSearchQueries[i].logic === 'NOT') match = match && !conditionMet;
        }
        return match;
      });
    }

    return result.sort((a, b) => getSlaHoursLeft(a.created_at, a.station_id) - getSlaHoursLeft(b.created_at, b.station_id));
  }, [unscheduledTickets, activeFilter, customTabs, searchQueries, evaluateCondition, getSlaHoursLeft]);

  // SMART BACKLOG
  const { myZoneTickets, otherZoneTickets, selectedTechName } = useMemo(() => {
    if (selectedTechId === 'ALL') {
      return { myZoneTickets: [], otherZoneTickets: filteredTickets, selectedTechName: null };
    }
    
    const techObj = technicians.find(t => t.id === selectedTechId);
    const my: Ticket[] = [];
    const others: Ticket[] = [];
    
    filteredTickets.forEach(t => {
      const st = stations.find(s => s.id === t.station_id);
      if (t.technician_id === selectedTechId || (!t.technician_id && st?.technician === techObj?.name)) {
        my.push(t);
      } else {
        others.push(t);
      }
    });

    return { myZoneTickets: my, otherZoneTickets: others, selectedTechName: techObj?.name };
  }, [filteredTickets, selectedTechId, technicians, stations]);

  // KPI
  const urgentCount = useMemo(() => unscheduledTickets.filter(t => getSlaHoursLeft(t.created_at, t.station_id) < 24).length, [unscheduledTickets, getSlaHoursLeft]);
  const todayDateStr = new Date().toISOString().split('T')[0];
  const todayEventsCount = useMemo(() => events.filter(e => e.start_time.startsWith(todayDateStr)).length, [events, todayDateStr]);

  const getCustomTabCount = useCallback((tabInfo: CustomTabEq) => {
    let res = unscheduledTickets.filter(t => {
      const validQ = tabInfo.filterQueries.filter(q => q.text.trim() !== '');
      if (validQ.length > 0) {
        let match = evaluateCondition(t, validQ[0].text);
        if (validQ[0].logic === 'NOT') match = !match;
        for (let i = 1; i < validQ.length; i++) {
          const conditionMet = evaluateCondition(t, validQ[i].text);
          if (validQ[i].logic === 'AND') match = match && conditionMet;
          else if (validQ[i].logic === 'OR') match = match || conditionMet;
          else if (validQ[i].logic === 'NOT') match = match && !conditionMet;
        }
        if (!match) return false;
      }
      return true;
    });
    return res.length;
  }, [unscheduledTickets, evaluateCondition]);

  const handleSaveCustomTab = (e: React.FormEvent) => {
    e.preventDefault();
    const newTab: CustomTabEq = {
      id: Math.random().toString(36).substring(7),
      name: newCustomTab.name,
      filterQueries: newCustomTab.filterQueries.filter(q => q.text.trim() !== '')
    };
    const updatedTabs = [...customTabs, newTab];
    setCustomTabs(updatedTabs);
    
    const newOrder = [...tabOrder, newTab.id];
    setTabOrder(newOrder);

    localStorage.setItem('ekoen_calendar_custom_tabs', JSON.stringify(updatedTabs));
    localStorage.setItem('ekoen_calendar_tab_order', JSON.stringify(newOrder));
    
    setIsCustomTabModalOpen(false);
    setNewCustomTab({ name: '', filterQueries: [{ id: Math.random().toString(), text: '', logic: 'AND' }] });
  };

  const handleDeleteCustomTab = (id: string) => {
    const updatedTabs = customTabs.filter(t => t.id !== id);
    setCustomTabs(updatedTabs);
    
    const newOrder = tabOrder.filter(tId => tId !== id);
    setTabOrder(newOrder);

    localStorage.setItem('ekoen_calendar_custom_tabs', JSON.stringify(updatedTabs));
    localStorage.setItem('ekoen_calendar_tab_order', JSON.stringify(newOrder));
    
    if (activeFilter === id) setActiveFilter('default_all');
  };

  const handleTabDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    draggedTabRef.current = id;
    setTimeout(() => setDraggedTabId(id), 0);
  };

  const handleTabDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    
    const container = tabsScrollRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < 80) container.scrollLeft -= 15;
      else if (x > rect.width - 80) container.scrollLeft += 15;
    }
  };

  const handleTabDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedTabRef.current || e.dataTransfer.getData('text/plain');
    
    if (!sourceId || sourceId === targetId) {
       setDraggedTabId(null);
       return;
    }

    const sourceIndex = tabOrder.indexOf(sourceId);
    const targetIndex = tabOrder.indexOf(targetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const newOrder = [...tabOrder];
      const [movedTab] = newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, movedTab);
      setTabOrder(newOrder);
      localStorage.setItem('ekoen_calendar_tab_order', JSON.stringify(newOrder));
    }
    setDraggedTabId(null);
    draggedTabRef.current = null;
  };

  const handleRightClickClearFilters = (e: React.MouseEvent) => {
    e.preventDefault();
    setSearchQueries([{ id: Math.random().toString(), text: '', logic: 'AND' }]);
    setActiveFilter('default_all');
  };

  // --- DRAG & DROP ZGŁOSZEŃ (DO KALENDARZA) ---
  const checkOverlap = (techId: string | null, start: Date, end: Date, excludeEventId?: string) => {
    if (!techId) return false;
    return events.some(ev => {
      if (ev.id === excludeEventId) return false;
      if (ev.technician_id !== techId) return false;
      const evStart = new Date(ev.start_time).getTime();
      const evEnd = new Date(ev.end_time).getTime();
      return start.getTime() < evEnd && end.getTime() > evStart;
    });
  };

  const handleEventDragStart = (e: React.DragEvent, type: 'NEW' | 'MOVE' | 'RESIZE', id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    clearAutoRevert(); 

    if (type === 'NEW') {
        const ticket = tickets.find(t => t.id === id);
        let techId = ticket?.technician_id;
        if (!techId && ticket) {
            const st = stations.find(s => s.id === ticket.station_id);
            const techObj = technicians.find(t => t.name === st?.technician);
            if (techObj) techId = techObj.id;
        }
        if (techId) setSelectedTechId(techId);
    } else {
        const ev = events.find(ev => ev.id === id);
        if (ev?.technician_id) setSelectedTechId(ev.technician_id);
    }

    setTimeout(() => {
      setDragState({ type, payloadId: id });
      setHoveredEventId(null);
    }, 0);
  };

  const handleEventDragEnd = () => {
    setDragState(null);
    triggerAutoRevert();
  };

  const handleEventDrop = async (e: React.DragEvent, targetDate: Date, hourValue: number) => {
    e.preventDefault();
    if (!dragState) return;

    const startTime = new Date(targetDate);
    startTime.setHours(Math.floor(hourValue), hourValue % 1 === 0 ? 0 : 30, 0, 0);

    if (dragState.type === 'NEW') {
      const ticket = tickets.find(t => t.id === dragState.payloadId);
      if (!ticket) return;
      const station = stations.find(s => s.id === ticket.station_id);
      
      const endTime = new Date(startTime.getTime() + 2 * 3600000); 
      const targetTechId = selectedTechId !== 'ALL' ? selectedTechId : ticket.technician_id;

      if (checkOverlap(targetTechId, startTime, endTime)) {
        alert('Kolizja harmonogramu! Ten technik ma już zaplanowaną robotę w tym czasie.');
        handleEventDragEnd(); return;
      }

      const newEvent = {
        title: `${ticket.ticket_code} - ${station?.name || 'Stacja'}`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        event_type: ticket.ticket_type === 'Awaria' ? 'repair' : 'inspection',
        technician_id: targetTechId,
        ticket_id: ticket.id
      };

      const { error } = await supabase.from('calendar_events').insert([newEvent]);
      if (error) alert(error.message);
      else fetchData();

    } else if (dragState.type === 'MOVE') {
      const event = events.find(ev => ev.id === dragState.payloadId);
      if (!event) return;

      const duration = new Date(event.end_time).getTime() - new Date(event.start_time).getTime();
      const newEndTime = new Date(startTime.getTime() + duration);

      if (checkOverlap(event.technician_id, startTime, newEndTime, event.id)) {
        alert('Kolizja harmonogramu! Ten slot czasowy u technika jest zajęty.');
        handleEventDragEnd(); return;
      }

      setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, start_time: startTime.toISOString(), end_time: newEndTime.toISOString() } : ev));
      await supabase.from('calendar_events').update({ start_time: startTime.toISOString(), end_time: newEndTime.toISOString() }).eq('id', event.id);

    } else if (dragState.type === 'RESIZE') {
      const event = events.find(ev => ev.id === dragState.payloadId);
      if (!event) return;

      const newEndTime = new Date(targetDate);
      const endHourValue = hourValue + 0.5; 
      newEndTime.setHours(Math.floor(endHourValue), Math.round((endHourValue % 1) * 60), 0, 0);

      const currentStartTime = new Date(event.start_time);
      const durationMs = newEndTime.getTime() - currentStartTime.getTime();

      if (durationMs < 30 * 60000) { alert('Minimalny czas zlecenia to 30 minut.'); handleEventDragEnd(); return; }
      if (durationMs > 24 * 3600000) { alert('Maksymalny czas zlecenia to 24 godziny.'); handleEventDragEnd(); return; }

      if (checkOverlap(event.technician_id, currentStartTime, newEndTime, event.id)) {
        alert('Kolizja przy rozciąganiu! Nakładasz zadanie na inną wizytę.');
        handleEventDragEnd(); return;
      }

      setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, end_time: newEndTime.toISOString() } : ev));
      await supabase.from('calendar_events').update({ end_time: newEndTime.toISOString() }).eq('id', event.id);
    }
    handleEventDragEnd();
  };

  const handleDeleteEvent = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (!confirm('Usunąć wizytę z kalendarza? Zgłoszenie pozostanie w Backlogu.')) return;
    setEvents(prev => prev.filter(ev => ev.id !== eventId));
    await supabase.from('calendar_events').delete().eq('id', eventId);
  };

  // --- RENDERING TABS ---
  const renderTab = (tabId: string) => {
    const isDragged = draggedTabId === tabId;
    const commonClasses = `min-w-[280px] h-[104px] shrink-0 bg-white/80 backdrop-blur-md border rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between cursor-grab active:cursor-grabbing transition-colors relative group box-border ${isDragged ? 'opacity-40 scale-95' : ''}`;
    
    if (tabId === 'default_all') {
      const isActive = activeFilter === 'default_all';
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => setActiveFilter('default_all')} className={`${commonClasses} ${isActive ? 'border-[#58b347] ring-2 ring-[#58b347]/20 bg-[#58b347]/5' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Do Zaplanowania</p>
            <p className="text-3xl font-bold text-slate-700">{unscheduledTickets.length}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-none ${isActive ? 'bg-[#58b347] text-white' : 'bg-[#58b347]/10 text-[#58b347]'}`}><IconList /></div>
        </div>
      );
    }

    if (tabId === 'default_urgent') {
      const isActive = activeFilter === 'default_urgent';
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => setActiveFilter(prev => prev === 'default_urgent' ? 'default_all' : 'default_urgent')} className={`${commonClasses} ${isActive ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50' : urgentCount > 0 ? 'border-red-200 hover:bg-red-50/30' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Pilne SLA (&lt; 24h)</p>
            <p className={`text-3xl font-bold ${urgentCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>{urgentCount}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-none ${urgentCount > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}><IconAlertTriangle /></div>
        </div>
      );
    }

    if (tabId === 'default_today') {
      const isActive = activeFilter === 'default_today';
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => setActiveFilter('default_today')} className={`${commonClasses} ${isActive ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Wizyty na dziś</p>
            <p className="text-3xl font-bold text-slate-700">{todayEventsCount}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-none ${isActive ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500'}`}><IconCalendarLarge /></div>
        </div>
      );
    }

    const tabInfo = customTabs.find(t => t.id === tabId);
    if (tabInfo) {
      const isActive = activeFilter === tabInfo.id;
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => setActiveFilter(prev => prev === tabInfo.id ? 'default_all' : tabInfo.id)} className={`${commonClasses} ${isActive ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
          <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomTab(tabId); }} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-auto" title="Usuń zakładkę"><IconTrash /></button>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{tabInfo.name}</p>
            <p className="text-3xl font-bold text-slate-700">{getCustomTabCount(tabInfo)}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-none ${isActive ? 'bg-orange-100 text-orange-500' : 'bg-slate-50 text-slate-400'}`}><IconFilter /></div>
        </div>
      );
    }

    return null;
  };

  const renderTicketCard = (ticket: Ticket, isHighlightedRegion: boolean) => {
    const station = stations.find(s => s.id === ticket.station_id);
    const tech = technicians.find(t => t.id === ticket.technician_id);
    const slaLeft = Math.round(getSlaHoursLeft(ticket.created_at, ticket.station_id));

    return (
      <div 
        key={ticket.id} 
        draggable 
        onDragStart={(e) => handleEventDragStart(e, 'NEW', ticket.id)}
        onDragEnd={handleEventDragEnd}
        onMouseEnter={() => handleTicketMouseEnter(ticket)}
        onMouseLeave={handleTicketMouseLeave}
        className={`bg-white border p-3 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-[#58b347] hover:shadow-md transition-all z-50 group ${isHighlightedRegion ? 'border-l-4 border-l-[#58b347] border-[#58b347]/40 ring-1 ring-[#58b347]/10' : 'border-slate-200'}`}
      >
        <div className="flex justify-between items-center mb-2">
          <span className="text-[9px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 transition-colors group-hover:text-[#58b347] group-hover:border-[#58b347]/30">{ticket.ticket_code}</span>
          <span className={`text-[9px] font-black px-2 py-0.5 rounded border uppercase tracking-widest ${slaLeft < 12 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-green-50 text-green-700 border-green-200'}`}>SLA: {slaLeft}h</span>
        </div>
        <h4 className="font-bold text-slate-800 text-xs leading-tight mb-1">{station?.name || 'Stacja'}</h4>
        <p className="text-[10px] text-slate-400 truncate mb-3 flex items-center gap-1"><IconMapPin /> {station?.city || 'Nieznane miasto'}</p>
        <div 
          className="text-[9px] uppercase tracking-widest text-slate-500 font-bold p-2 rounded-lg border flex justify-between items-center"
          style={{ 
            backgroundColor: tech?.color ? `${tech.color}15` : '#f8fafc',
            borderColor: tech?.color ? `${tech.color}30` : '#f1f5f9'
          }}
        >
          <span style={{ color: tech?.color || undefined }}>{tech?.name || 'Brak przypisania'}</span>
          <span className={`font-black ${ticket.ticket_type === 'Awaria' ? 'text-red-500' : 'text-blue-500'}`}>{ticket.ticket_type}</span>
        </div>
      </div>
    );
  };

  // --- RENDEROWANIE WIDOKU KALENDARZA ---
  const daysToRender = useMemo(() => {
    if (viewMode === 'day') return [currentDate];
    if (viewMode === 'week') {
      const mon = getMonday(currentDate);
      return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    }
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const startCalendarDate = addDays(new Date(year, month, 1), -startOffset);
    return Array.from({ length: 42 }, (_, i) => addDays(startCalendarDate, i));
  }, [currentDate, viewMode]);

  const getTechColor = (id: string | null) => technicians.find(t => t.id === id)?.color || '#94a3b8';

  return (
    <div className={`absolute inset-0 bg-slate-100/60 backdrop-blur-2xl border-l border-white/20 z-40 flex flex-col font-sans transition-[left] duration-300 ease-out shadow-[-10px_0_30px_rgba(0,0,0,0.05)] overflow-hidden ${isSidebarHovered ? 'left-[256px]' : 'left-[72px]'}`}>
      
      {/* Pasek Nawigacji */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/40 px-6 py-4 flex items-center justify-between shrink-0 z-50">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            Harmonogram Serwisowy
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Dysponuj zespołami na osi czasu.</p>
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto overflow-x-hidden relative ${customScrollbarClasses}`} onContextMenu={handleRightClickClearFilters}>
        
        <div className="w-full max-w-[1600px] mx-auto p-6 flex flex-col gap-6">
          
          {/* KPI Dashboard */}
          <div ref={tabsScrollRef} className={`flex overflow-x-auto gap-6 pb-2 items-stretch shrink-0 select-none ${customScrollbarClasses}`}>
            {tabOrder.map(tabId => renderTab(tabId))}

            <div 
              onClick={() => setIsCustomTabModalOpen(true)}
              className="min-w-[150px] w-[150px] h-[104px] shrink-0 bg-white/50 hover:bg-slate-50 backdrop-blur-md border-2 border-dashed border-slate-300 hover:border-[#58b347] rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-[#58b347] cursor-pointer transition-all group box-border relative overflow-hidden"
            >
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm mb-1.5 group-hover:scale-110 transition-transform z-10">
                <IconPlusCenter />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-center z-10">Nowy Filtr</span>
            </div>
            <div className="w-2 shrink-0 opacity-0 pointer-events-none">.</div>
          </div>

          {/* Smart Search */}
          <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-5 shrink-0 items-start z-10">
            <div className="flex-1 w-full relative z-20">
              <SearchQueryBuilder queries={searchQueries} setQueries={setSearchQueries} />
            </div>
            <div className="flex gap-3 items-center shrink-0 w-full md:w-auto mt-auto flex-wrap z-10">
              {(searchQueries.some(q => q.text.trim() !== '') || activeFilter !== 'default_all') && (
                <button 
                  onClick={() => { setSearchQueries([{ id: Math.random().toString(), text: '', logic: 'AND' }]); setActiveFilter('default_all'); }} 
                  className="w-full bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest px-3 py-2.5 rounded-xl transition-colors shadow-sm h-[38px]"
                >
                  Wyczyść Filtry
                </button>
              )}
            </div>
          </div>

          {/* MAIN CONTENT: BACKLOG + CALENDAR */}
          <div className="flex gap-6 items-stretch h-[65vh] min-h-[640px] relative z-[5]">
            
            {/* BACKLOG PANEL */}
            <div className={`w-[340px] bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col h-full shrink-0 overflow-hidden transition-all ${activeFilter === 'default_today' ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
              <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center shrink-0 rounded-t-xl z-20">
                <h2 className="font-bold text-xs uppercase tracking-widest text-slate-600 flex items-center gap-2"><IconFilter /> Backlog ({filteredTickets.length})</h2>
              </div>
              
              <div className={`flex-1 overflow-y-auto p-3 bg-slate-50/50 ${customScrollbarClasses}`} onMouseLeave={triggerAutoRevert}>
                {filteredTickets.length === 0 ? (
                  <div className="text-center p-8 text-xs font-bold text-slate-400">Brak zgłoszeń spełniających wybrane kryteria.</div>
                ) : (
                  <div className="space-y-3 pb-4">
                    {selectedTechId !== 'ALL' && myZoneTickets.length > 0 && (
                      <>
                        <div className="pt-1 pb-2 text-[10px] font-black uppercase tracking-widest text-[#58b347] flex items-center gap-2 px-1">
                          <span><IconMapPin /> Rejon: {selectedTechName}</span>
                        </div>
                        {myZoneTickets.map(ticket => renderTicketCard(ticket, true))}
                      </>
                    )}
                    
                    {selectedTechId !== 'ALL' && myZoneTickets.length > 0 && otherZoneTickets.length > 0 && (
                      <div className="pt-6 pb-2 text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 px-1 border-b border-slate-200">
                        <span>Pozostałe regiony</span>
                      </div>
                    )}

                    {(selectedTechId === 'ALL' ? filteredTickets : otherZoneTickets).map(ticket => renderTicketCard(ticket, false))}
                  </div>
                )}
              </div>
            </div>

            {/* CALENDAR PANEL */}
            <div className="flex-1 flex flex-col h-full bg-white border border-slate-200 rounded-xl shadow-sm relative" onMouseEnter={clearAutoRevert} onMouseLeave={triggerAutoRevert}>
              
              {/* Pasek Kontrolny Kalendarza */}
              <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50/50 shrink-0 z-[100] rounded-t-xl" ref={headerWheelRef}>
                {/* Lewa strona */}
                <div className="flex items-center gap-4">
                  <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
                    <button onClick={() => setViewMode('day')} className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-md transition-colors ${viewMode === 'day' ? 'bg-[#58b347]/10 text-[#58b347]' : 'text-slate-500 hover:text-slate-800'}`}>Dzień</button>
                    <button onClick={() => setViewMode('week')} className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-md transition-colors ${viewMode === 'week' ? 'bg-[#58b347]/10 text-[#58b347]' : 'text-slate-500 hover:text-slate-800'}`}>Tydzień</button>
                    <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 text-[10px] uppercase tracking-widest font-bold rounded-md transition-colors ${viewMode === 'month' ? 'bg-[#58b347]/10 text-[#58b347]' : 'text-slate-500 hover:text-slate-800'}`}>Miesiąc</button>
                  </div>
                </div>
                
                {/* Środek */}
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3 bg-white p-1 rounded-xl shadow-sm border border-slate-200 h-[38px] transition-colors focus-within:border-[#58b347] focus-within:ring-1 focus-within:ring-[#58b347]/30">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center ml-0.5"><IconUser /></div>
                    <select 
                      value={selectedTechId} 
                      onChange={handleManualTechSelect} 
                      className="text-[11px] font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer uppercase tracking-widest w-56 border-none appearance-none"
                    >
                      <option value="ALL">Cała Flota (Widok Zbiorczy)</option>
                      {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <div className="pr-3 text-slate-400 pointer-events-none"><IconChevronDown /></div>
                  </div>

                  {/* Interaktywny nagłówek daty - TYLKO INFORMACYJNY */}
                  <div className="relative flex items-center justify-center pointer-events-none">
                    <h2 className="text-sm font-black text-slate-800 w-48 text-center uppercase tracking-widest pointer-events-none">
                      {currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric', day: viewMode === 'day' ? 'numeric' : undefined })}
                    </h2>
                  </div>
                </div>

                {/* Prawa strona */}
                <div className="flex items-center gap-4 relative">
                  <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                    <button onClick={goPrev} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors border-r border-slate-200"><IconChevronLeft /></button>
                    <button onClick={(e) => { e.stopPropagation(); setIsDatePickerOpen(!isDatePickerOpen); }} className={`px-4 py-2 font-bold text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1.5 ${isDatePickerOpen ? 'bg-slate-100 text-[#58b347]' : 'text-slate-500 hover:bg-slate-50 hover:text-[#58b347]'}`}>
                      <IconCalendar /> DZIŚ
                    </button>
                    <button onClick={goNext} className="p-2 hover:bg-slate-50 text-slate-400 hover:text-slate-700 transition-colors border-l border-slate-200"><IconChevronRight /></button>
                  </div>

                  {/* POPUP DATE PICKER (WYSUWA SIĘ W DÓŁ) */}
                  {isDatePickerOpen && (
                    <>
                      <div className="fixed inset-0 z-[110]" onClick={(e) => { e.stopPropagation(); setIsDatePickerOpen(false); }}></div>
                      <div className="absolute top-full right-0 mt-3 bg-white border border-slate-200 rounded-xl shadow-2xl p-4 z-[120] flex flex-col gap-3 min-w-[220px] animate-fadeIn origin-top">
                        <input 
                          type="date" 
                          value={currentDate.toISOString().split('T')[0]} 
                          onChange={e => {
                            if (e.target.value) {
                              setCurrentDate(new Date(e.target.value));
                              setIsDatePickerOpen(false);
                            }
                          }}
                          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-[#58b347] cursor-pointer"
                        />
                        <button onClick={(e) => { e.stopPropagation(); goToday(); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] uppercase tracking-widest py-2.5 rounded-lg transition-colors w-full">
                          Wróć na Dziś
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* SIATKA GŁÓWNA - Wewnętrzny Scroll */}
              <div 
                className={`flex-1 overflow-y-auto overflow-x-auto relative ${customScrollbarClasses} rounded-b-xl`} 
                ref={gridScrollRef}
                onDoubleClick={handleDoubleClickGrid}
                onContextMenu={handleRightClickGrid}
              >
                
                {viewMode === 'month' ? (
                  <div className="w-full h-full flex flex-col bg-slate-100 min-h-[650px]">
                    <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 shrink-0 text-center py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0 z-[70] shadow-sm">
                      {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
                    </div>
                    <div className="flex-1 grid grid-cols-7 grid-rows-6 text-xs bg-white">
                      {daysToRender.map((dateObj, idx) => {
                        const dateStr = dateObj.toISOString().split('T')[0];
                        const isCurrentMonth = dateObj.getMonth() === currentDate.getMonth();
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        
                        const dayEvents = events.filter(e => {
                          if (!e.start_time) return false;
                          const matchesDate = e.start_time.split('T')[0] === dateStr;
                          const matchesTech = selectedTechId === 'ALL' || e.technician_id === selectedTechId;
                          return matchesDate && matchesTech;
                        });

                        return (
                          <div key={idx} className={`border-r border-b border-slate-100 p-1 flex flex-col min-h-[110px] relative ${!isCurrentMonth ? 'bg-slate-50/40 opacity-40' : 'bg-white hover:bg-slate-50/20 transition-colors'}`}>
                            
                            <div 
                              className={`absolute inset-0 ${dragState ? 'z-10 bg-[#58b347]/5' : '-z-10'}`} 
                              onDragOver={e => e.preventDefault()} 
                              onDrop={e => handleEventDrop(e, dateObj, 8)} 
                            />

                            <div className="flex justify-end p-1">
                              <span className={`w-6 h-6 flex items-center justify-center font-bold text-[10px] rounded-full ${isToday ? 'bg-[#58b347] text-white shadow-sm' : 'text-slate-500'}`}>{dateObj.getDate()}</span>
                            </div>
                            
                            <div className={`flex-1 overflow-y-auto space-y-1 max-h-[85px] px-1 z-20 relative scrollbar-hide`}>
                              {dayEvents.map(e => (
                                <div 
                                  key={e.id} 
                                  draggable
                                  onDragStart={(ev) => handleEventDragStart(ev, 'MOVE', e.id)}
                                  onDragEnd={handleEventDragEnd}
                                  className={`relative group text-[9px] px-2 py-1 rounded shadow-sm border font-bold text-slate-700 bg-white cursor-grab active:cursor-grabbing hover:shadow transition-all flex justify-between items-center ${dragState?.payloadId === e.id ? 'pointer-events-none opacity-40' : ''}`} 
                                  style={{ borderColor: getTechColor(e.technician_id), borderLeftWidth: '4px' }}
                                >
                                  <span className="truncate pr-1">{e.title.split('-')[0]}</span>
                                  <button 
                                    onClick={(ev) => handleDeleteEvent(ev, e.id)} 
                                    className="text-slate-300 hover:text-red-500 rounded transition-colors bg-white pointer-events-auto shrink-0"
                                    title="Usuń wizytę"
                                  >
                                    <IconTrash />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full bg-slate-50 min-w-max">
                    {/* Oś Czasu Y */}
                    <div className="w-16 shrink-0 border-r border-slate-200 bg-white sticky left-0 z-[60] shadow-[10px_0_15px_-10px_rgba(0,0,0,0.05)]">
                      <div className="h-12 border-b border-slate-200 sticky top-0 bg-slate-50 z-[80]"></div>
                      {GENERATED_SLOTS.slice(0, -1).map(slot => {
                        const isWholeHour = slot % 1 === 0;
                        return (
                          <div key={slot} className={`h-10 border-b border-slate-100 flex items-start justify-end pr-2 pt-1 text-[10px] font-bold text-slate-400 ${isWholeHour ? 'bg-slate-50/20' : 'opacity-0'}`}>
                            {isWholeHour ? `${String(slot).padStart(2, '0')}:00` : ''}
                          </div>
                        );
                      })}
                    </div>

                    {/* Siatka Kolumnowa Dni */}
                    <div className="flex-1 flex h-[1960px] bg-white"> 
                      {daysToRender.map((dateObj, dIdx) => {
                        const dateStr = dateObj.toISOString().split('T')[0];
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        
                        const dayEvents = events
                          .filter(e => {
                            if (!e.start_time) return false;
                            const matchesDate = e.start_time.split('T')[0] === dateStr;
                            const matchesTech = selectedTechId === 'ALL' || e.technician_id === selectedTechId;
                            return matchesDate && matchesTech;
                          })
                          .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());

                        const eventsWithOverlap = dayEvents.map((event, index, array) => {
                          let overlapCount = 0;
                          for (let i = 0; i < index; i++) {
                            if (new Date(array[i].end_time).getTime() > new Date(event.start_time).getTime()) overlapCount++;
                          }
                          return { ...event, overlapIndex: overlapCount };
                        });

                        return (
                          <div key={dIdx} className="flex-1 border-r border-slate-100 min-w-[150px] relative h-full">
                            
                            {/* STICKY HEADER DNIA */}
                            <div className={`h-12 border-b border-slate-200 flex flex-col items-center justify-center sticky top-0 z-[70] shadow-sm ${isToday ? 'bg-[#eef8f0]' : 'bg-slate-100'}`}>
                              <span className={`text-[9px] font-black uppercase tracking-widest ${isToday ? 'text-[#58b347]' : 'text-slate-500'}`}>{WEEKDAYS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1]}</span>
                              <span className={`text-sm font-black mt-0.5 ${isToday ? 'text-[#58b347]' : 'text-slate-800'}`}>{dateObj.getDate()}</span>
                            </div>

                            {/* Kontener Roboczy Dnia */}
                            <div className="relative h-[1920px]">
                              
                              {/* Aktywne linie dropzonów */}
                              {GENERATED_SLOTS.slice(0, -1).map(slot => (
                                <div 
                                  key={slot} 
                                  className={`h-10 border-b transition-colors ${dragState ? 'hover:bg-[#58b347]/10 z-10 relative' : ''} ${slot % 1 === 0 ? 'border-slate-100 border-solid' : 'border-slate-50 border-dashed'}`}
                                  onDragOver={e => e.preventDefault()}
                                  onDrop={e => handleEventDrop(e, dateObj, slot)}
                                />
                              ))}

                              {/* Rendering Kafelków Zadań */}
                              {dayEvents.map(event => {
                                const evWithOverlap = eventsWithOverlap.find(evo => evo.id === event.id);
                                const overlapIndex = evWithOverlap?.overlapIndex || 0;

                                const sDate = new Date(event.start_time);
                                const eDate = new Date(event.end_time);
                                
                                const startHour = sDate.getHours() + (sDate.getMinutes() / 60);
                                const durationHours = (eDate.getTime() - sDate.getTime()) / 3600000;
                                
                                const topOffset = startHour * 80;
                                const height = durationHours * 80;
                                const isShort = durationHours <= 0.5; 
                                
                                const techColor = getTechColor(event.technician_id);
                                const leftOffsetPx = 4 + (overlapIndex * 16);
                                
                                const isDraggedEvent = dragState?.payloadId === event.id;
                                const isAnyDragActive = !!dragState;

                                let zIndex = 10 + overlapIndex;
                                if (hoveredEventId === event.id) zIndex = 40; 
                                if (isDraggedEvent) zIndex = 50; 

                                return (
                                  <div 
                                    key={event.id}
                                    draggable
                                    onDragStart={e => handleEventDragStart(e, 'MOVE', event.id)}
                                    onDragEnd={handleEventDragEnd}
                                    onMouseEnter={() => handleCalendarEventMouseEnter(event.id)}
                                    onMouseLeave={handleCalendarEventMouseLeave}
                                    className={`absolute rounded-xl border p-2 flex transition-all bg-white shadow-sm overflow-hidden
                                      ${hoveredEventId === event.id ? 'shadow-lg ring-1 ring-black/5 scale-[1.02]' : ''}
                                      ${isShort ? 'flex-row items-center justify-between py-0 h-10' : 'flex-col justify-between'}
                                      ${isDraggedEvent ? 'opacity-80 ring-2 ring-[#58b347]' : (isAnyDragActive ? 'pointer-events-none opacity-50' : 'cursor-grab active:cursor-grabbing')}
                                    `}
                                    style={{ 
                                      top: `${topOffset}px`, 
                                      height: `${height}px`,
                                      left: `${leftOffsetPx}px`,
                                      right: '8px',
                                      zIndex: zIndex,
                                      borderColor: techColor,
                                      borderLeftWidth: '5px'
                                    }}
                                  >
                                    <div className={`flex-1 flex overflow-hidden min-w-0 ${isShort ? 'flex-row items-center gap-2 justify-between w-full' : 'flex-col'}`}>
                                      <div className="flex justify-between items-start min-w-0 w-full">
                                        <div className={`font-black text-slate-800 leading-tight truncate min-w-0 flex-1 ${isShort ? 'text-[9px]' : 'text-[10px] break-words whitespace-normal'}`}>
                                          {event.title}
                                        </div>
                                        <button 
                                          onClick={e => handleDeleteEvent(e, event.id)} 
                                          className="text-slate-300 hover:text-red-500 rounded p-0.5 transition-colors shrink-0 pointer-events-auto ml-1"
                                          title="Usuń z grafiku"
                                        >
                                          <IconTrash />
                                        </button>
                                      </div>
                                      <div className={`text-slate-500 font-mono font-bold shrink-0 ${isShort ? 'text-[8px] bg-slate-50 px-1 rounded border border-slate-100 ml-auto' : 'text-[9px] mt-2'}`}>
                                        {sDate.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})} {!isShort && `- ${eDate.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}`}
                                      </div>
                                    </div>

                                    {/* SUWAK ZMIANY CZASU TRWANIA */}
                                    <div 
                                      draggable
                                      onDragStart={e => { e.stopPropagation(); handleEventDragStart(e, 'RESIZE', event.id); }}
                                      onDragEnd={(e) => { e.stopPropagation(); handleEventDragEnd(); }}
                                      className="absolute bottom-0 left-0 right-0 h-2 bg-slate-100 hover:bg-[#58b347] cursor-row-resize flex items-center justify-center transition-colors pointer-events-auto opacity-0 group-hover:opacity-100"
                                    />
                                  </div>
                                );
                              })}

                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* --- WODOTRYSK TOAST --- */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-slideUp border border-slate-700 pointer-events-none">
          <IconCheckCircle />
          <span className="text-xs font-bold uppercase tracking-widest">{toastMessage}</span>
        </div>
      )}

      {/* MODAL: TWORZENIE ZAKŁADKI CUSTOMOWEJ --- */}
      {isCustomTabModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setIsCustomTabModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">Stwórz nową zakładkę Backlogu</h3>
              <button onClick={() => setIsCustomTabModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleSaveCustomTab} className="p-6 space-y-5 bg-slate-50/30">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nazwa zakładki na pasku *</label>
                <input required type="text" value={newCustomTab.name} onChange={e => setNewCustomTab({...newCustomTab, name: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" placeholder="Np. Krytyczne, Warszawa, itp." />
              </div>

              <div className="bg-white p-5 border border-slate-200 rounded-xl space-y-3 shadow-sm">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#58b347]">Warunki Filtrowania Zgłoszeń</label>
                <p className="text-[10px] text-slate-400 mb-3 leading-relaxed border-b border-slate-100 pb-3">
                  Każde pole to osobny warunek wyszukiwania działający na Backlog.
                </p>
                <SearchQueryBuilder queries={newCustomTab.filterQueries} setQueries={(q) => setNewCustomTab({...newCustomTab, filterQueries: q})} />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200 mt-4">
                <button type="button" onClick={() => setIsCustomTabModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-xs uppercase tracking-widest">Anuluj</button>
                <button type="submit" disabled={!newCustomTab.name} className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl hover:bg-[#499b3a] disabled:opacity-50 shadow-sm transition-all text-xs uppercase tracking-widest">Zapisz zakładkę</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}