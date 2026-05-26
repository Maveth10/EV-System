'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../app/supabase';

// --- TYPY DANYCH ---
type Ticket = { id: string; ticket_code: string; station_id: string; technician_id: string | null; ticket_type: string; status: string; priority: string; description: string | null; resolution_notes: string | null; created_at: string; };
type Station = { id: string; name: string; city: string | null; technician: string | null; client: string | null; lat: number | null; lng: number | null; };
type Technician = { id: string; name: string; car_plate?: string | null; color?: string; };
type Part = { id: string; sku: string; name: string; unit: string; };
type TechInventory = { id: string; part_id: string; quantity: number; };
type Client = { id: string; name: string; sla_hours: number; };

type SearchQuery = { id: string; text: string; logic: 'AND' | 'OR' | 'NOT'; radius: number; };
type CustomTab = { id: string; name: string; filterStatus: string; filterQueries: SearchQuery[]; };

// Dynamiczne kolumny
type ColumnKey = 'code' | 'type' | 'station' | 'tech' | 'sla' | 'status' | 'actions';
interface ColumnDef { key: ColumnKey; label: string; visible: boolean; sortableKey?: keyof Ticket | 'station_name' | 'client_name' | 'sla_left'; thClass: string; tdClass: string; }

const defaultListColumns: ColumnDef[] = [
  { key: 'code', label: 'Kod Zgłoszenia', visible: true, sortableKey: 'ticket_code', thClass: 'w-36', tdClass: 'font-mono font-bold text-slate-400 uppercase tracking-wider' },
  { key: 'type', label: 'Typ akcji', visible: true, sortableKey: 'ticket_type', thClass: 'w-48', tdClass: 'font-bold text-slate-700' },
  { key: 'station', label: 'Ładowarka / Klient', visible: true, sortableKey: 'station_name', thClass: 'w-auto', tdClass: '' },
  { key: 'tech', label: 'Przypisanie', visible: true, sortableKey: 'technician_id', thClass: 'w-48', tdClass: 'font-bold text-slate-600' },
  { key: 'sla', label: 'Czas SLA', visible: true, sortableKey: 'sla_left', thClass: 'w-40', tdClass: '' },
  { key: 'status', label: 'Status', visible: true, sortableKey: 'status', thClass: 'w-32', tdClass: '' },
  { key: 'actions', label: 'Akcje', visible: true, thClass: 'w-32 text-center', tdClass: 'text-center opacity-0 group-hover:opacity-100 transition-opacity' },
];

type SortConfig = { key: keyof Ticket | 'station_name' | 'client_name' | 'sla_left'; direction: 'asc' | 'desc' } | null;

// --- IKONY ---
const IconClock = () => <svg className="w-3.5 h-3.5 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconKanban = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M8 3v18"/><path d="M16 3v18"/></svg>;
const IconList = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IconSync = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>;
const IconCheck = () => <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconAlert = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconPlus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconSettings = () => (
  <svg className="w-4 h-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconCheckCircle = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconInfo = () => <svg className="w-5 h-5 inline-block text-[#58b347]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconSearch = () => <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconMapPin = () => <svg className="w-3.5 h-3.5 inline mr-1 text-[#58b347]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconFilter = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const IconTrash = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconChevronDown = () => <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const IconChevronUp = () => <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const IconRefresh = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
const IconChevronRight = () => <svg className="w-4 h-4 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const IconSort = () => <svg className="w-3.5 h-3.5 inline-block ml-1 opacity-40 hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>;
const IconColumns = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>;
const IconArrowUp = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const IconArrowDown = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;

const CustomCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-4 h-4 rounded-[4px] flex items-center justify-center cursor-pointer transition-colors duration-200 shrink-0 ${checked ? 'bg-[#58b347] border-[#58b347]' : 'border border-slate-300 bg-white hover:border-[#58b347]/50'}`}
  >
    {checked && <IconCheck />}
  </div>
);

// --- KLASY DLA SCROLLBARA ---
const customScrollbarClasses = "[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#58b347]/40 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#58b347]/80";

// --- FUNKCJA MATEMATYCZNA: OBLICZANIE ODLEGŁOŚCI GPS (Haversine) ---
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// --- INICJAŁY ---
const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// --- PARSER CSV ---
const parseCSV = (text: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];
    if (char === '"') {
      if (inQuotes && nextChar === '"') { currentCell += '"'; i++; } else { inQuotes = !inQuotes; }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim()); currentCell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell !== '')) rows.push(currentRow);
      currentRow = []; currentCell = '';
    } else { currentCell += char; }
  }
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell !== '')) rows.push(currentRow);
  }
  return rows.map(row => row.map(cell => cell.replace(/^["']|["']$/g, '').trim()));
};

// --- SMART KOMPONENT: AUTOCOMPLETE DLA STACJI ---
const StationAutocomplete = ({ stations, value, onChange }: { stations: Station[], value: string, onChange: (id: string) => void }) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (value) {
      const selected = stations.find(s => s.id === value);
      if (selected) setInputValue(`${selected.name} (${selected.city || 'Brak miasta'})`);
    } else {
      setInputValue('');
    }
  }, [value, stations]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStations = useMemo(() => {
    if (!inputValue) return stations;
    const lower = inputValue.toLowerCase();
    return stations.filter(s => 
      s.name.toLowerCase().includes(lower) || 
      (s.city && s.city.toLowerCase().includes(lower)) ||
      (s.client && s.client.toLowerCase().includes(lower))
    ).slice(0, 15);
  }, [stations, inputValue]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          if (value) onChange(''); 
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder="Zacznij wpisywać stację, miasto lub klienta..."
        className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm"
      />
      {isOpen && filteredStations.length > 0 && (
        <div className={`absolute top-[105%] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-60 overflow-y-auto animate-fadeIn ${customScrollbarClasses}`}>
          {filteredStations.map(s => (
            <div 
              key={s.id}
              onClick={() => {
                onChange(s.id);
                setInputValue(`${s.name} (${s.city || 'Brak miasta'})`);
                setIsOpen(false);
              }}
              className="px-4 py-3 hover:bg-[#58b347]/10 cursor-pointer border-b border-slate-50 last:border-b-0 transition-colors flex justify-between items-center"
            >
              <div>
                <div className="font-bold text-slate-800 text-sm">{s.name}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider">{s.city || 'Brak miasta'} • {s.client || 'Brak klienta'}</div>
              </div>
              <IconChevronRight />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

interface TicketsDatabaseProps {
  isSidebarHovered?: boolean;
}

export default function TicketsDatabase({ isSidebarHovered = false }: TicketsDatabaseProps) {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [techInventory, setTechInventory] = useState<TechInventory[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [closingForm, setClosingForm] = useState({ status: 'W toku', resolution_notes: '', part_id: '', part_qty: 1, consumePart: false });

  // --- STANY FILTROWANIA ---
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([{ id: 'init', text: '', logic: 'AND', radius: 30 }]);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  
  // Stan dla interaktywnych kafelków KPI i Customowych Tabów
  const [slaFilter, setSlaFilter] = useState<string>('ALL');
  const [customTabs, setCustomTabs] = useState<CustomTab[]>([]);
  const [isCustomTabModalOpen, setIsCustomTabModalOpen] = useState(false);
  
  const [newCustomTab, setNewCustomTab] = useState<{ name: string, filterStatus: string, filterQueries: SearchQuery[] }>({ 
    name: '', filterStatus: 'ALL', filterQueries: [{ id: 'c_init', text: '', logic: 'AND', radius: 30 }] 
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [sheetUrl, setSheetUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ station_id: '', ticket_type: 'Awaria', priority: 'Normalny', description: '', technician_id: '' });

  const [isNewModalActiveOpen, setIsNewModalActiveOpen] = useState(true);
  const [isNewModalHistoryOpen, setIsNewModalHistoryOpen] = useState(false);

  const [columns, setColumns] = useState<ColumnDef[]>(defaultListColumns);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  // Zabezpieczony stan przeciągania
  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);
  const draggedTicketRef = useRef<string | null>(null);

  // Stany i refy dla auto-scrolla Kanban
  const kanbanScrollRef = useRef<HTMLDivElement>(null);
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const scrollDirectionRef = useRef<'left' | 'right' | null>(null);

  // Prawidłowe zainicjowanie Handlera do Prawokliku
  const handleRightClickClearFilters = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setSearchQueries([{ id: Math.random().toString(), text: '', logic: 'AND', radius: 30 }]);
    setStatusFilter('ACTIVE');
    setSlaFilter('ALL');
  }, []);

  // Auto-scroll mechanizm (60 FPS)
  const stopAutoScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
      scrollDirectionRef.current = null;
    }
  }, []);

  const startAutoScroll = useCallback((direction: 'left' | 'right', speed: number = 20) => {
    if (scrollDirectionRef.current === direction) return;
    stopAutoScroll();
    scrollDirectionRef.current = direction;
    scrollIntervalRef.current = setInterval(() => {
      if (kanbanScrollRef.current) {
        kanbanScrollRef.current.scrollLeft += direction === 'left' ? -speed : speed;
      }
    }, 16);
  }, [stopAutoScroll]);

  // Implementacja Smart Wheel Scroll dla paska zakładek
  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const isScrollable = el.scrollWidth > el.clientWidth;
      if (!isScrollable || e.deltaY === 0) return;

      const atLeftEdge = el.scrollLeft === 0 && e.deltaY < 0;
      const atRightEdge = Math.ceil(el.scrollLeft + el.clientWidth) >= el.scrollWidth && e.deltaY > 0;

      if (!atLeftEdge && !atRightEdge) {
        e.preventDefault();
        el.scrollLeft += e.deltaY;
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  useEffect(() => {
    setSheetUrl(localStorage.getItem('ekoen_tickets_sheet_url') || '');
    const savedTabs = localStorage.getItem('ekoen_custom_tabs');
    if (savedTabs) {
      try { 
        const parsed = JSON.parse(savedTabs);
        const migrated = parsed.map((t: any) => {
          let queries: SearchQuery[] = [];
          if (t.filterQueries && typeof t.filterQueries[0] === 'string') {
            queries = t.filterQueries.map((q: string) => ({ id: Math.random().toString(), text: q, logic: 'AND', radius: 30 }));
          } else if (t.filterQueries && typeof t.filterQueries[0] === 'object') {
            queries = t.filterQueries;
          } else {
            queries = [{ id: Math.random().toString(), text: '', logic: 'AND', radius: 30 }];
          }
          return {
            id: t.id,
            name: t.name,
            filterStatus: t.filterStatus || 'ALL',
            filterQueries: queries
          };
        });
        setCustomTabs(migrated);
      } catch (e) {}
    }
    
    // Cleanup interwałów scrolla przy odmontowaniu
    return () => stopAutoScroll();
  }, [stopAutoScroll]);

  const loadSupabaseData = async () => {
    const [tRes, sRes, techRes, pRes, cRes] = await Promise.all([
      supabase.from('tickets').select('*'),
      supabase.from('stations').select('id, name, city, technician, client, lat, lng').order('name'),
      supabase.from('technicians').select('id, name, car_plate, color').order('name'),
      supabase.from('parts').select('id, sku, name, unit'),
      supabase.from('clients').select('id, name, sla_hours')
    ]);

    if (tRes.data) setTickets(tRes.data);
    if (sRes.data) setStations(sRes.data);
    if (techRes.data) setTechnicians(techRes.data as Technician[]);
    if (pRes.data) setParts(pRes.data);
    if (cRes.data) setClients(cRes.data);
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadSupabaseData();
      const savedUrl = localStorage.getItem('ekoen_tickets_sheet_url');
      if (savedUrl) {
        setSheetUrl(savedUrl);
        await handleScanSheet(savedUrl);
      }
      setIsLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScanSheet = async (forcedUrl?: string) => {
    const urlToUse = forcedUrl || sheetUrl;
    if (!urlToUse) return;

    const matches = urlToUse.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = matches ? matches[1] : null;
    if (!spreadsheetId) return;

    setIsSyncing(true);
    const candidates = ['zgloszenia', 'tickets', 'zadania', 'arkusz1', 'sheet1', 'Arkusz1', 'Sheet1'];
    let csvText = '';

    for (const tab of candidates) {
      try {
        const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`);
        if (res.ok) {
          const text = await res.text();
          if (text && !text.includes('<html') && text.includes(',')) { csvText = text; break; }
        }
      } catch (err) {}
    }

    if (!csvText) {
      try {
        const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`);
        if (res.ok) { const text = await res.text(); if (text && !text.includes('<html')) csvText = text; }
      } catch (err) {}
    }

    if (!csvText) { setIsSyncing(false); return; }

    const delimiter = csvText.split('\n')[0].includes(';') ? ';' : ',';
    const parsedData = parseCSV(csvText, delimiter);
    if (parsedData.length < 2) { setIsSyncing(false); return; }

    const headers = parsedData[0].map(h => h.toLowerCase());
    const getColIndex = (names: string[]) => headers.findIndex(h => names.some(n => h === n || h.includes(n)));

    const idxCode = getColIndex(['kod', 'id_zgloszenia', 'ticket_code', 'numer', 'id']);
    const idxStation = getColIndex(['stacja', 'station', 'ladowarka', 'nazwa stacji']);
    const idxType = getColIndex(['typ', 'type', 'rodzaj', 'akcja']);
    const idxPriority = getColIndex(['priorytet', 'priority', 'sla']);
    const idxDesc = getColIndex(['opis', 'description', 'uwagi']);
    const idxStatus = getColIndex(['status', 'etap']);

    if (idxCode === -1 || idxStation === -1) { setIsSyncing(false); return; }

    const rows = parsedData.slice(1);
    
    for (const row of rows) {
      if (!row[idxCode] || !row[idxStation]) continue;

      const tCode = row[idxCode].toUpperCase();
      const sheetStationName = row[idxStation];

      const matchedStation = stations.find(s => s.name.toLowerCase() === sheetStationName.toLowerCase());
      if (!matchedStation) continue;

      let autoTechId: string | null = null;
      if (matchedStation.technician) {
        const tech = technicians.find(t => t.name === matchedStation.technician);
        if (tech) autoTechId = tech.id;
      }

      const payload = {
        ticket_code: tCode,
        station_id: matchedStation.id,
        technician_id: autoTechId,
        ticket_type: idxType !== -1 && row[idxType] ? row[idxType] : 'Awaria',
        priority: idxPriority !== -1 && row[idxPriority] ? row[idxPriority] : 'Normalny',
        description: idxDesc !== -1 && row[idxDesc] ? row[idxDesc] : null,
        status: idxStatus !== -1 && row[idxStatus] ? row[idxStatus] : 'Nowe'
      };

      await supabase.from('tickets').upsert(payload, { onConflict: 'ticket_code' });
    }

    localStorage.setItem('ekoen_tickets_sheet_url', urlToUse);
    await loadSupabaseData();
    setIsSyncing(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNewModalOpen(false);
        setActiveTicket(null);
        setIsCustomTabModalOpen(false);
        setIsColumnSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleStationChange = (stationId: string) => {
    const station = stations.find(s => s.id === stationId);
    let autoTechId = '';
    if (station && station.technician) {
      const tech = technicians.find(t => t.name === station.technician);
      if (tech) autoTechId = tech.id;
    }
    setNewTicket(prev => ({ ...prev, station_id: stationId, technician_id: autoTechId }));
  };

  const isAutoAssignedFromZone = useMemo(() => {
    if (!newTicket.station_id || !newTicket.technician_id) return false;
    const s = stations.find(st => st.id === newTicket.station_id);
    const t = technicians.find(tech => tech.id === newTicket.technician_id);
    return s?.technician === t?.name;
  }, [newTicket.station_id, newTicket.technician_id, stations, technicians]);

  const handleCreateManualTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.station_id) { alert('Proszę wybrać stację docelową'); return; }

    const generatedCode = `SYS-${Math.floor(Math.random() * 100000)}`;

    const payload = {
      ticket_code: generatedCode,
      station_id: newTicket.station_id,
      technician_id: newTicket.technician_id || null,
      ticket_type: newTicket.ticket_type,
      priority: newTicket.priority,
      description: newTicket.description || null,
      status: 'Nowe'
    };

    const { error } = await supabase.from('tickets').insert([payload]);
    if (error) alert(`Błąd tworzenia zadania: ${error.message}`);
    else {
      setIsNewModalOpen(false);
      setNewTicket({ station_id: '', ticket_type: 'Awaria', priority: 'Normalny', description: '', technician_id: '' });
      loadSupabaseData();
    }
  };

  const handleSaveCustomTab = (e: React.FormEvent) => {
    e.preventDefault();
    const newTab: CustomTab = {
      id: Math.random().toString(36).substring(7),
      name: newCustomTab.name,
      filterStatus: newCustomTab.filterStatus,
      filterQueries: newCustomTab.filterQueries.filter(q => q.text.trim() !== '')
    };
    const updatedTabs = [...customTabs, newTab];
    setCustomTabs(updatedTabs);
    localStorage.setItem('ekoen_custom_tabs', JSON.stringify(updatedTabs));
    setIsCustomTabModalOpen(false);
    setNewCustomTab({ name: '', filterStatus: 'ALL', filterQueries: [{ id: Math.random().toString(), text: '', logic: 'AND', radius: 30 }] });
  };

  const handleDeleteCustomTab = (id: string) => {
    const updatedTabs = customTabs.filter(t => t.id !== id);
    setCustomTabs(updatedTabs);
    localStorage.setItem('ekoen_custom_tabs', JSON.stringify(updatedTabs));
    if (slaFilter === `CUSTOM_${id}`) setSlaFilter('ALL');
  };

  const getClosestTechnicianSuggestion = useCallback((targetStationId: string) => {
    const targetStation = stations.find(s => s.id === targetStationId);
    if (!targetStation || !targetStation.lat || !targetStation.lng) return null;

    const activeTechTickets = tickets.filter(t => t.status !== 'Zakończone' && t.technician_id && t.station_id !== targetStationId);
    
    let closestTechId: string | null = null;
    let minDistance = Infinity;
    let refStationName = '';

    activeTechTickets.forEach(ticket => {
      const s = stations.find(st => st.id === ticket.station_id);
      if (s && s.lat && s.lng) {
        const dist = calculateDistance(targetStation.lat!, targetStation.lng!, s.lat, s.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestTechId = ticket.technician_id;
          refStationName = s.name;
        }
      }
    });

    if (closestTechId && minDistance < 100) {
      const tech = technicians.find(t => t.id === closestTechId);
      return { technician: tech?.name, technicianId: tech?.id, distance: Math.round(minDistance), stationName: refStationName };
    }
    return null;
  }, [stations, tickets, technicians]);

  const getSlaInfo = useCallback((createdAt: string, stationId: string, status: string) => {
    if (status === 'Zakończone') return { label: 'Zakończone', hoursLeft: 9999, style: 'bg-slate-100 text-slate-500 border-slate-200' };

    const station = stations.find(s => s.id === stationId);
    const client = clients.find(c => c.name === station?.client);
    const slaHours = client?.sla_hours || 48;

    const createdTime = new Date(createdAt).getTime();
    const deadline = createdTime + (slaHours * 3600000);
    const timeLeft = (deadline - Date.now()) / 3600000;

    if (timeLeft < 0) {
      return { label: `Po terminie! (${Math.abs(Math.round(timeLeft))}h)`, hoursLeft: timeLeft, style: 'bg-red-50 text-red-600 border-red-200' };
    }
    if (timeLeft < 12) {
      return { label: `Pilne! ${Math.floor(timeLeft)}h`, hoursLeft: timeLeft, style: 'bg-orange-50 text-orange-600 border-orange-200' };
    }
    return { label: `Zostało ${Math.floor(timeLeft)}h`, hoursLeft: timeLeft, style: 'bg-[#58b347]/10 text-[#499b3a] border-[#58b347]/20' };
  }, [stations, clients]);

  const ticketMatchesQuery = useCallback((t: Ticket, qText: string) => {
    const lowerQ = qText.toLowerCase().trim();
    if (!lowerQ) return true;
    const s = stations.find(st => st.id === t.station_id);
    const tech = technicians.find(te => te.id === t.technician_id);

    return t.ticket_code.toLowerCase().includes(lowerQ) ||
           t.ticket_type.toLowerCase().includes(lowerQ) ||
           (t.description || '').toLowerCase().includes(lowerQ) ||
           (s?.name || '').toLowerCase().includes(lowerQ) ||
           (s?.client || '').toLowerCase().includes(lowerQ) ||
           (s?.city || '').toLowerCase().includes(lowerQ) ||
           (tech?.name || '').toLowerCase().includes(lowerQ);
  }, [stations, technicians]);

  const uniqueCitiesWithCoordsArr = useMemo(() => {
    const citiesMap = new Map<string, { lat: number, lng: number }>();
    stations.forEach(s => {
      if (s.city && s.lat && s.lng && !citiesMap.has(s.city.toLowerCase())) {
        citiesMap.set(s.city.toLowerCase(), { lat: s.lat, lng: s.lng });
      }
    });
    return Array.from(citiesMap.entries()).map(([city, coords]) => ({ city, ...coords })).sort((a, b) => a.city.localeCompare(b.city));
  }, [stations]);

  const evaluateCondition = useCallback((t: Ticket, q: SearchQuery) => {
    const qText = q.text.trim().toLowerCase();
    if (!qText) return true;

    const cityMatch = uniqueCitiesWithCoordsArr.find(c => c.city.toLowerCase() === qText);
    if (cityMatch) {
      const s = stations.find(st => st.id === t.station_id);
      if (!s || !s.lat || !s.lng) return false;
      const dist = calculateDistance(cityMatch.lat, cityMatch.lng, s.lat, s.lng);
      return dist <= q.radius;
    }

    return ticketMatchesQuery(t, qText);
  }, [uniqueCitiesWithCoordsArr, stations, ticketMatchesQuery]);

  const sortedAndFilteredTickets = useMemo(() => {
    let result = tickets;

    if (!slaFilter.startsWith('CUSTOM_')) {
      result = result.filter(t => {
        if (statusFilter === 'ACTIVE') return t.status !== 'Zakończone';
        if (statusFilter === 'CLOSED') return t.status === 'Zakończone';
        return true;
      });
    }

    if (slaFilter === 'URGENT') {
      result = result.filter(t => {
        if (t.status === 'Zakończone') return false;
        const sla = getSlaInfo(t.created_at, t.station_id, t.status);
        return sla.hoursLeft >= 0 && sla.hoursLeft < 12;
      });
    } else if (slaFilter === 'OVERDUE') {
      result = result.filter(t => {
        if (t.status === 'Zakończone') return false;
        const sla = getSlaInfo(t.created_at, t.station_id, t.status);
        return sla.hoursLeft < 0;
      });
    } else if (slaFilter.startsWith('CUSTOM_')) {
      const tabId = slaFilter.split('_')[1];
      const tabInfo = customTabs.find(c => c.id === tabId);
      if (tabInfo) {
        result = result.filter(t => {
          if (tabInfo.filterStatus && tabInfo.filterStatus !== 'ALL') {
            if (tabInfo.filterStatus === 'ACTIVE' && t.status === 'Zakończone') return false;
            if (tabInfo.filterStatus === 'CLOSED' && t.status !== 'Zakończone') return false;
          }
          const validQ = tabInfo.filterQueries.filter(q => q.text.trim() !== '');
          if (validQ.length > 0) {
            let match = evaluateCondition(t, validQ[0]);
            if (validQ[0].logic === 'NOT') match = !match;
            
            for (let i = 1; i < validQ.length; i++) {
              const conditionMet = evaluateCondition(t, validQ[i]);
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
        let match = evaluateCondition(t, validSearchQueries[0]);
        if (validSearchQueries[0].logic === 'NOT') match = !match;
        
        for (let i = 1; i < validSearchQueries.length; i++) {
          const conditionMet = evaluateCondition(t, validSearchQueries[i]);
          if (validSearchQueries[i].logic === 'AND') match = match && conditionMet;
          else if (validSearchQueries[i].logic === 'OR') match = match || conditionMet;
          else if (validSearchQueries[i].logic === 'NOT') match = match && !conditionMet;
        }
        return match;
      });
    }

    const finalResult = result.map(t => {
      const station = stations.find(s => s.id === t.station_id);
      return {
        ...t,
        station_name: station?.name || '',
        client_name: station?.client || '',
        sla_left: getSlaInfo(t.created_at, t.station_id, t.status).hoursLeft
      }
    });

    if (sortConfig) {
      return finalResult.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return finalResult.sort((a, b) => {
      return a.sla_left - b.sla_left;
    });
  }, [tickets, statusFilter, slaFilter, customTabs, searchQueries, getSlaInfo, evaluateCondition, stations, sortConfig]);

  const getCustomTabCount = useCallback((tabInfo: CustomTab) => {
    let res = tickets;
    res = res.filter(t => {
      if (tabInfo.filterStatus && tabInfo.filterStatus !== 'ALL') {
        if (tabInfo.filterStatus === 'ACTIVE' && t.status === 'Zakończone') return false;
        if (tabInfo.filterStatus === 'CLOSED' && t.status !== 'Zakończone') return false;
      }
      const validQ = tabInfo.filterQueries.filter(q => q.text.trim() !== '');
      if (validQ.length > 0) {
        let match = evaluateCondition(t, validQ[0]);
        if (validQ[0].logic === 'NOT') match = !match;
        
        for (let i = 1; i < validQ.length; i++) {
          const conditionMet = evaluateCondition(t, validQ[i]);
          if (validQ[i].logic === 'AND') match = match && conditionMet;
          else if (validQ[i].logic === 'OR') match = match || conditionMet;
          else if (validQ[i].logic === 'NOT') match = match && !conditionMet;
        }
        if (!match) return false;
      }
      return true;
    });
    return res.length;
  }, [tickets, evaluateCondition]);

  const baseActiveTickets = tickets.filter(t => t.status !== 'Zakończone');
  const overdueTicketsCount = baseActiveTickets.filter(t => getSlaInfo(t.created_at, t.station_id, t.status).hoursLeft < 0).length;
  const urgentTicketsCount = baseActiveTickets.filter(t => {
    const hours = getSlaInfo(t.created_at, t.station_id, t.status).hoursLeft;
    return hours >= 0 && hours < 12;
  }).length;

  const stationTicketCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    baseActiveTickets.forEach(t => {
      counts[t.station_id] = (counts[t.station_id] || 0) + 1;
    });
    return counts;
  }, [baseActiveTickets]);

  const stationTicketsForNewModal = useMemo(() => {
    if (!newTicket.station_id) return [];
    return tickets.filter(t => t.station_id === newTicket.station_id).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [newTicket.station_id, tickets]);

  const activeTks = stationTicketsForNewModal.filter(t => t.status !== 'Zakończone');
  const historyTks = stationTicketsForNewModal.filter(t => t.status === 'Zakończone');

  useEffect(() => {
    if (activeTicket && activeTicket.technician_id) {
      supabase.from('technician_inventory').select('*').eq('technician_id', activeTicket.technician_id).gt('quantity', 0)
        .then(({ data }) => { if (data) setTechInventory(data); });
    }
  }, [activeTicket]);

  const handleUpdateTicketStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;

    if (closingForm.status === 'Zakończone' && closingForm.consumePart && closingForm.part_id) {
      const stockItem = techInventory.find(i => i.part_id === closingForm.part_id);
      if (!stockItem || stockItem.quantity < closingForm.part_qty) { alert("Błąd: Technik nie ma tylu części na aucie!"); return; }
      await supabase.from('technician_inventory').update({ quantity: stockItem.quantity - closingForm.part_qty }).eq('id', stockItem.id);
      await supabase.from('inventory_logs').insert([{ part_id: closingForm.part_id, technician_id: activeTicket.technician_id, operation_type: 'WYDANIE', quantity: closingForm.part_qty, notes: `Zużyto przy zamknięciu zgłoszenia` }]);
    }

    const updatePayload: any = { status: closingForm.status, resolution_notes: closingForm.resolution_notes || null };
    if (closingForm.status === 'Zakończone') updatePayload.closed_at = new Date().toISOString();

    const { error } = await supabase.from('tickets').update(updatePayload).eq('id', activeTicket.id);
    if (error) alert(error.message);
    else { setActiveTicket(null); loadSupabaseData(); }
  };

  const handleReopenTicketDirect = async (ticketId: string) => {
    const { error } = await supabase.from('tickets').update({ status: 'W toku', closed_at: null }).eq('id', ticketId);
    if (error) alert('Błąd: ' + error.message);
    else { 
      setToastMessage('Zgłoszenie zostało ponownie otwarte!');
      setTimeout(() => setToastMessage(null), 3000);
      
      const reopenedTicket = tickets.find(t => t.id === ticketId);
      loadSupabaseData().then(() => {
        setIsNewModalOpen(false);
        if (reopenedTicket) {
          setActiveTicket(reopenedTicket);
          setClosingForm({ status: 'W toku', resolution_notes: reopenedTicket.resolution_notes || '', part_id: '', part_qty: 1, consumePart: false });
        }
      });
    }
  };

  const handleReopenTicket = async () => {
    if (!activeTicket) return;
    const { error } = await supabase.from('tickets').update({ status: 'W toku', closed_at: null }).eq('id', activeTicket.id);
    if (error) alert('Błąd: ' + error.message);
    else { setActiveTicket(null); loadSupabaseData(); }
  };

  // --- HTML5 DRAG & DROP + AUTO-SCROLL (Z OPÓŹNIENIEM STANU) ---
  const onDragStart = (e: React.DragEvent, ticketId: string) => { 
    e.dataTransfer.setData('ticketId', ticketId);
    e.dataTransfer.effectAllowed = "move"; 
    
    draggedTicketRef.current = ticketId;
    
    // Asynchroniczne wymuszenie stylu, aby przeglądarka zdążyła poprawnie zainicjować Drag event
    setTimeout(() => {
      setDraggedTicketId(ticketId);
    }, 0);
  };
  
  const onDragEnd = () => {
    stopAutoScroll();
    draggedTicketRef.current = null;
    setDraggedTicketId(null);
  };

  const onDragOver = (e: React.DragEvent) => { 
    e.preventDefault(); 
    e.dataTransfer.dropEffect = "move";

    if (kanbanScrollRef.current) {
      const container = kanbanScrollRef.current;
      const rect = container.getBoundingClientRect();
      const threshold = 120; 

      if (e.clientX < rect.left + threshold) {
        startAutoScroll('left', 20);
      } else if (e.clientX > rect.right - threshold) {
        startAutoScroll('right', 20);
      } else {
        stopAutoScroll();
      }
    }
  };

  const handleKanbanMouseMove = (e: React.MouseEvent) => {
    if (draggedTicketId || viewMode !== 'kanban' || !kanbanScrollRef.current) return;
    
    const container = kanbanScrollRef.current;
    const rect = container.getBoundingClientRect();
    const threshold = 80;

    if (e.clientY < rect.top || e.clientY > rect.bottom) {
      stopAutoScroll();
      return;
    }

    if (e.clientX >= rect.left && e.clientX < rect.left + threshold) {
      startAutoScroll('left', 12);
    } else if (e.clientX <= rect.right && e.clientX > rect.right - threshold) {
      startAutoScroll('right', 12);
    } else {
      stopAutoScroll();
    }
  };

  const onDrop = async (e: React.DragEvent, targetTechnicianId: string | null) => {
    e.preventDefault(); 
    stopAutoScroll();

    const tId = e.dataTransfer.getData('ticketId') || draggedTicketRef.current;
    
    draggedTicketRef.current = null;
    setDraggedTicketId(null);

    if (!tId) return;

    setTickets(prev => prev.map(t => t.id === tId ? { ...t, technician_id: targetTechnicianId } : t));
    const { error } = await supabase.from('tickets').update({ technician_id: targetTechnicianId }).eq('id', tId);
    if (error) { alert("Błąd zapisu przypisania."); loadSupabaseData(); }
  };

  const getStationName = (id: string) => stations.find(s => s.id === id)?.name || 'Nieznana';
  const getTechName = (id: string | null) => id ? technicians.find(t => t.id === id)?.name || 'Nieprzypisany' : 'Nieprzypisany';
  const getPartDetails = (id: string) => parts.find(p => p.id === id);

  const handleCopyCode = (e: React.MouseEvent, code: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setToastMessage(`Skopiowano: ${code}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    const newCols = [...columns];
    const target = index + direction;
    if (target >= 0 && target < newCols.length) {
      [newCols[index], newCols[target]] = [newCols[target], newCols[index]];
      setColumns(newCols);
    }
  };

  const toggleColumnVisibility = (index: number) => {
    const newCols = [...columns];
    newCols[index].visible = !newCols[index].visible;
    setColumns(newCols);
  };

  const handleSort = (key: keyof Ticket | 'station_name' | 'client_name' | 'sla_left') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const renderSearchQueries = (queries: SearchQuery[], setQueries: (q: SearchQuery[]) => void) => {
    const addQuery = () => setQueries([...queries, { id: Math.random().toString(), text: '', logic: 'AND', radius: 30 }]);
    const updateQuery = (id: string, updates: Partial<SearchQuery>) => {
      setQueries(queries.map(q => q.id === id ? { ...q, ...updates } : q));
    };
    const removeQuery = (id: string) => {
      setQueries(queries.filter(q => q.id !== id));
    };

    return (
      <div className="flex flex-col gap-2 w-full max-w-2xl animate-fadeIn">
        {queries.map((q, idx) => {
          const isCity = uniqueCitiesWithCoordsArr.some(c => c.city.toLowerCase() === q.text.trim().toLowerCase());
          return (
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
                <div className="flex items-center justify-center w-8 h-full shrink-0 text-slate-400">
                  <IconSearch />
                </div>
                <input
                  value={q.text}
                  onChange={e => updateQuery(q.id, { text: e.target.value })}
                  placeholder="Szukaj (miasto, technik, kod)..."
                  className="w-full pl-2 pr-3 py-2 text-xs font-semibold focus:outline-none bg-transparent h-full border-none"
                />
                
                {isCity && (
                  <div className="flex items-center gap-1 bg-[#58b347]/10 pl-2 pr-1 py-1 border-l border-[#58b347]/20 shrink-0 h-full">
                    <IconMapPin />
                    <select
                      value={q.radius}
                      onChange={e => updateQuery(q.id, { radius: Number(e.target.value) })}
                      className="bg-transparent text-[10px] font-bold text-[#58b347] focus:outline-none cursor-pointer border-none p-0 pr-5"
                    >
                      <option value={10}>+ 10 km</option>
                      <option value={30}>+ 30 km</option>
                      <option value={50}>+ 50 km</option>
                      <option value={100}>+ 100 km</option>
                      <option value={200}>+ 200 km</option>
                    </select>
                  </div>
                )}
              </div>

              {queries.length > 1 && (
                <button type="button" onClick={() => removeQuery(q.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors shrink-0 flex items-center justify-center h-[38px]" title="Usuń warunek">
                  <IconTrash />
                </button>
              )}
            </div>
          );
        })}
        
        <button 
          type="button"
          onClick={addQuery}
          className="text-[10px] font-bold text-slate-500 hover:text-[#58b347] bg-white border border-slate-200 hover:border-[#58b347]/50 rounded-xl py-2 px-3 w-max flex items-center gap-1.5 transition-colors shadow-sm mt-1"
        >
          <IconPlus /> Dodaj warunek wyszukiwania
        </button>
      </div>
    );
  };

  const TicketCard = ({ t }: { t: Ticket }) => {
    const sla = getSlaInfo(t.created_at, t.station_id, t.status);
    const station = stations.find(s => s.id === t.station_id);
    const sameStationCount = t.status !== 'Zakończone' ? (stationTicketCounts[t.station_id] || 1) : 1;
    const otherTicketsOnStation = sameStationCount > 1 ? baseActiveTickets.filter(tk => tk.station_id === t.station_id && tk.id !== t.id).map(x => x.ticket_code).join(', ') : '';

    return (
      <div 
        draggable={t.status !== 'Zakończone'}
        onDragStart={(e) => onDragStart(e, t.id)}
        onDragEnd={onDragEnd}
        onClick={() => { setActiveTicket(t); setClosingForm({ status: t.status, resolution_notes: t.resolution_notes || '', part_id: '', part_qty: 1, consumePart: false }); }}
        className={`bg-white border p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group ${t.status === 'Zakończone' ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:border-[#58b347]/50'} ${t.id === draggedTicketId ? 'opacity-40 scale-95 shadow-none ring-2 ring-[#58b347]/30' : ''}`}
      >
        {t.status !== 'Zakończone' && (
           <div className={`absolute left-0 top-0 bottom-0 w-1 ${sla.hoursLeft < 0 ? 'bg-red-500 animate-pulse' : sla.hoursLeft < 12 ? 'bg-orange-500' : 'bg-[#58b347]'}`} />
        )}

        <div className="flex justify-between items-start mb-2.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${sla.style}`}>
            <IconClock /> {sla.label}
          </span>
          <div className="flex items-center gap-1.5">
            {sameStationCount > 1 && (
              <span 
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchQueries([{ id: Math.random().toString(), text: station?.name || '', logic: 'AND', radius: 30 }]);
                  setStatusFilter('ACTIVE');
                  setSlaFilter('ALL');
                }}
                className="text-[9px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded border border-red-200 font-bold hover:bg-red-100 hover:border-red-300 transition-colors z-10" 
                title={`Inne otwarte zgłoszenia tutaj: ${otherTicketsOnStation}`}
              >
                +{sameStationCount - 1} zgł.
              </span>
            )}
            <span 
              onClick={(e) => handleCopyCode(e, t.ticket_code)}
              title="Kliknij, aby skopiować numer zgłoszenia"
              className="text-[9px] font-mono font-bold text-slate-400 hover:text-[#58b347] bg-slate-50 hover:bg-[#58b347]/10 px-1.5 py-0.5 rounded border border-slate-200 hover:border-[#58b347]/30 transition-colors cursor-pointer z-10"
            >
              {t.ticket_code}
            </span>
          </div>
        </div>
        
        <h4 
          onClick={(e) => {
            e.stopPropagation();
            setViewMode('list');
            setStatusFilter('ALL');
            setSlaFilter('ALL');
            setSearchQueries([{ id: Math.random().toString(), text: station?.name || '', logic: 'AND', radius: 30 }]);
          }}
          title="Filtruj całą historię dla tej stacji"
          className="font-bold text-slate-800 text-sm leading-tight mb-1 truncate hover:text-[#58b347] cursor-pointer transition-colors w-max max-w-full"
        >
          {station?.name || 'Stacja'}
        </h4>
        <p className="text-[10px] text-slate-500 font-medium truncate mb-3">{t.ticket_type} • {station?.client} {station?.city ? `(${station.city})` : ''}</p>
        
        <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
          <span className={`text-[9px] font-bold uppercase ${t.status === 'Zakończone' ? 'text-slate-400' : 'text-[#58b347]'}`}>{t.status}</span>
          <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${t.priority === 'Krytyczny' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>{t.priority}</span>
        </div>
      </div>
    );
  };

  const kanbanColumns = [null, ...technicians];

  return (
    <div className={`absolute inset-0 bg-slate-100/60 backdrop-blur-2xl border-l border-white/20 z-40 flex flex-col font-sans transition-all duration-300 ease-out shadow-[-10px_0_30px_rgba(0,0,0,0.05)] overflow-hidden ${isSidebarHovered ? 'left-[256px]' : 'left-[72px]'}`}>
      
      {/* Pasek nawigacji górnej */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/40 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            Centrum Zgłoszeń (Helpdesk)
            {isSyncing && <span className="text-[10px] bg-[#58b347]/10 text-[#58b347] border border-[#58b347]/20 px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider font-bold">Synchronizacja...</span>}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Dyspozytornia i obsługa SLA.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <button 
            onClick={() => handleScanSheet()} 
            disabled={isSyncing || !sheetUrl}
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 shadow-sm disabled:opacity-40 transition-colors h-[38px]"
          >
            <IconSync /> Skanuj
          </button>

          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`bg-white border border-slate-200 text-slate-400 hover:text-slate-600 w-[38px] h-[38px] flex items-center justify-center rounded-xl shadow-sm transition-colors shrink-0 ${isSettingsOpen ? 'bg-slate-50 border-slate-300' : ''}`}>
            <IconSettings />
          </button>

          <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/60 shadow-inner backdrop-blur-md ml-2 shrink-0">
            <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm border border-slate-200 text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}><IconKanban /> Tablica</button>
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow-sm border border-slate-200 text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}><IconList /> Lista</button>
          </div>

          <button onClick={() => setIsNewModalOpen(true)} className="bg-[#58b347] text-white border border-[#499b3a] px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#499b3a] flex items-center gap-1.5 shadow-sm transition-all ml-2 shrink-0 h-[38px]">
            <IconPlus /> Ręczne
          </button>
        </div>
      </div>

      {/* Kontener Główny z możliwością przewijania */}
      <div className="flex-1 relative flex flex-col overflow-hidden">
        {isLoading ? (
          <div className="flex w-full h-full items-center justify-center text-sm font-bold text-slate-400">Ładowanie bazy danych...</div>
        ) : (
          <div className="h-full w-full max-w-[1600px] mx-auto p-6 flex flex-col gap-6" onContextMenu={handleRightClickClearFilters}>
            
            {/* Panel Ustawień */}
            {isSettingsOpen && (
              <div className="w-full bg-white/95 backdrop-blur-sm border border-slate-200 p-5 rounded-2xl shadow-sm flex items-end gap-4 animate-fadeIn shrink-0 z-30">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Link Arkusza Google ze zleceniami:</label>
                  <input type="url" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all bg-slate-50" placeholder="https://docs.google.com/spreadsheets/d/..." />
                </div>
                <button onClick={() => { setIsSettingsOpen(false); handleScanSheet(); }} className="bg-[#58b347] text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-[#499b3a] transition-colors shadow-sm shrink-0 h-[42px]">Zapisz konfigurację</button>
              </div>
            )}

            {/* KARTY KPI + CUSTOMOWE ZAKŁADKI */}
            <div ref={tabsScrollRef} className={`flex overflow-x-auto gap-6 pb-2 snap-x items-stretch shrink-0 select-none z-20 ${customScrollbarClasses}`}>
              <div 
                onClick={() => setSlaFilter('ALL')}
                className={`min-w-[280px] shrink-0 snap-start bg-white/80 backdrop-blur-md border ${slaFilter === 'ALL' ? 'border-[#58b347] ring-2 ring-[#58b347]/20 bg-[#58b347]/5' : 'border-white/60 hover:bg-white'} rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between cursor-pointer transition-all`}
              >
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Zgłoszenia w toku</p>
                  <p className="text-3xl font-bold text-slate-700">{baseActiveTickets.length}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${slaFilter === 'ALL' ? 'bg-[#58b347] text-white' : 'bg-[#58b347]/10 text-[#58b347]'}`}>
                  <IconList />
                </div>
              </div>
              
              <div 
                onClick={() => setSlaFilter(prev => prev === 'URGENT' ? 'ALL' : 'URGENT')}
                className={`min-w-[280px] shrink-0 snap-start bg-white/80 backdrop-blur-md border ${slaFilter === 'URGENT' ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/50' : urgentTicketsCount > 0 ? 'border-orange-200 hover:bg-orange-50/30' : 'border-white/60'} rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between cursor-pointer transition-all`}
              >
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Zagrożone SLA (&lt; 12h)</p>
                  <p className={`text-3xl font-bold ${urgentTicketsCount > 0 ? 'text-orange-600' : 'text-slate-700'}`}>{urgentTicketsCount}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${urgentTicketsCount > 0 ? 'bg-orange-100 text-orange-500' : 'bg-slate-50 text-slate-400'}`}>
                  <IconClock />
                </div>
              </div>

              <div 
                onClick={() => setSlaFilter(prev => prev === 'OVERDUE' ? 'ALL' : 'OVERDUE')}
                className={`min-w-[280px] shrink-0 snap-start bg-white/80 backdrop-blur-md border ${slaFilter === 'OVERDUE' ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50' : overdueTicketsCount > 0 ? 'border-red-200 hover:bg-red-50/30' : 'border-white/60'} rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between cursor-pointer transition-all`}
              >
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Po terminie (Krytyczne)</p>
                  <p className={`text-3xl font-bold ${overdueTicketsCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>{overdueTicketsCount}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${overdueTicketsCount > 0 ? 'bg-red-100 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                  <IconAlert />
                </div>
              </div>

              {/* RENDER CUSTOMOWYCH ZAKŁADEK */}
              {customTabs.map(tab => (
                <div 
                  key={tab.id}
                  onClick={() => setSlaFilter(prev => prev === `CUSTOM_${tab.id}` ? 'ALL' : `CUSTOM_${tab.id}`)}
                  className={`min-w-[280px] shrink-0 snap-start bg-white/80 backdrop-blur-md border ${slaFilter === `CUSTOM_${tab.id}` ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'} rounded-2xl p-5 shadow-sm flex items-center justify-between cursor-pointer transition-all relative group`}
                >
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteCustomTab(tab.id); }} 
                    className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Usuń zakładkę"
                  >
                    <IconTrash />
                  </button>
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{tab.name}</p>
                    <p className="text-3xl font-bold text-slate-700">{getCustomTabCount(tab)}</p>
                  </div>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center ${slaFilter === `CUSTOM_${tab.id}` ? 'bg-blue-100 text-blue-500' : 'bg-slate-50 text-slate-400'}`}>
                    <IconFilter />
                  </div>
                </div>
              ))}

              <div 
                onClick={() => setIsCustomTabModalOpen(true)}
                className="min-w-[150px] shrink-0 snap-start bg-slate-50/50 border-2 border-dashed border-slate-300 hover:border-[#58b347] hover:bg-[#58b347]/5 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-[#58b347] cursor-pointer transition-all group p-5"
              >
                <div className="bg-white rounded-full p-2 mb-2 shadow-sm group-hover:scale-110 transition-transform"><IconPlus /></div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-center">Nowy Filtr</span>
              </div>
            </div>

            {/* ZAAWANSOWANY PASEK FILTROWANIA */}
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-5 shrink-0 items-start z-10">
              
              <div className="flex-1 w-full relative z-20">
                {renderSearchQueries(searchQueries, setSearchQueries)}
              </div>

              <div className="flex gap-3 items-center shrink-0 w-full md:w-auto mt-auto flex-wrap z-10">
                <div>
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full border border-slate-200 bg-white shadow-sm rounded-xl px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-600 cursor-pointer focus:outline-none focus:border-[#58b347] disabled:opacity-50 h-[38px]" disabled={slaFilter.startsWith('CUSTOM_')}>
                    <option value="ACTIVE">Tylko Aktywne</option>
                    <option value="CLOSED">Tylko Zakończone</option>
                    <option value="ALL">Wszystkie Statusy</option>
                  </select>
                </div>

                {viewMode === 'list' && (
                  <div className="relative">
                    <button onClick={() => setIsColumnSettingsOpen(!isColumnSettingsOpen)} className={`bg-white border text-slate-700 px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors ${isColumnSettingsOpen ? 'border-[#58b347] text-[#58b347]' : 'border-slate-200'} h-[38px]`}>
                      <IconColumns /> Kolumny
                    </button>
                    
                    {isColumnSettingsOpen && (
                      <div className="absolute right-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                        <div className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center tracking-widest">
                          Konfiguracja widoku
                          <button onClick={() => setIsColumnSettingsOpen(false)} className="hover:text-slate-700 transition-colors">✕</button>
                        </div>
                        <div className={`p-2 max-h-[60vh] overflow-y-auto ${customScrollbarClasses}`}>
                          {columns.map((c, i) => (
                            <div key={c.key} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl group transition-colors cursor-pointer" onClick={() => toggleColumnVisibility(i)}>
                              <div className="flex items-center gap-3">
                                <CustomCheckbox checked={c.visible} onChange={() => {}} />
                                <span className={`text-xs font-bold select-none ${c.visible ? 'text-slate-700' : 'text-slate-400'}`}>{c.label}</span>
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => moveColumn(i, -1)} disabled={i === 0} className="p-1 text-slate-400 hover:text-[#58b347] hover:bg-green-50 rounded-md disabled:opacity-20 transition-colors"><IconArrowUp /></button>
                                <button onClick={() => moveColumn(i, 1)} disabled={i === columns.length - 1} className="p-1 text-slate-400 hover:text-[#58b347] hover:bg-green-50 rounded-md disabled:opacity-20 transition-colors"><IconArrowDown /></button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(searchQueries.some(q => q.text.trim() !== '') || statusFilter !== 'ACTIVE' || slaFilter !== 'ALL') && (
                  <>
                    <div className="w-px h-6 bg-slate-200 mx-1 hidden md:block"></div>
                    <button 
                      onClick={() => { setSearchQueries([{ id: Math.random().toString(), text: '', logic: 'AND', radius: 30 }]); setStatusFilter('ACTIVE'); setSlaFilter('ALL'); }} 
                      className="bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest px-3 py-2.5 rounded-xl transition-colors shadow-sm h-[38px]"
                    >
                      Wyczyść Filtry
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Obszar roboczy */}
            <div className="flex-1 overflow-hidden flex flex-col relative z-0">
              
              {/* WIDOK: KANBAN */}
              {viewMode === 'kanban' && (
                <div 
                  ref={kanbanScrollRef}
                  className={`flex gap-5 h-full overflow-x-auto overflow-y-hidden pb-4 px-1 items-start ${customScrollbarClasses}`}
                  onDragOver={onDragOver}
                  onMouseMove={handleKanbanMouseMove}
                  onMouseLeave={stopAutoScroll}
                >
                  {kanbanColumns.map((tech) => {
                    const techTickets = sortedAndFilteredTickets.filter(t => tech ? t.technician_id === tech.id : t.technician_id === null);
                    return (
                      <div 
                        key={tech ? tech.id : 'unassigned'} 
                        className={`min-w-[320px] max-w-[320px] h-full flex flex-col bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden ${!tech ? 'ring-1 ring-orange-200/50 bg-orange-50/30' : ''}`}
                        onDragOver={onDragOver}
                        onDrop={(e) => onDrop(e, tech ? tech.id : null)}
                      >
                        <div className={`p-4 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur-xl shrink-0`}>
                          <div className="flex items-center gap-3">
                            {tech ? (
                              <div 
                                className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white font-bold text-xs shadow-sm border border-black/5"
                                style={{ backgroundColor: tech.color || '#58b347' }}
                              >
                                {getInitials(tech.name)}
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-[10px] bg-orange-100 flex items-center justify-center text-orange-500 font-bold text-xs shadow-sm border border-orange-200/50">
                                !
                              </div>
                            )}
                            <div>
                              <h3 className="font-bold text-slate-800 text-sm truncate leading-tight">{tech ? tech.name : 'Nieprzypisane'}</h3>
                            </div>
                          </div>
                          <span className="bg-white border border-slate-200 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-lg shadow-sm">{techTickets.length}</span>
                        </div>
                        
                        <div className={`p-4 flex-1 overflow-y-auto space-y-3 ${customScrollbarClasses}`}>
                          {techTickets.map(t => <TicketCard key={t.id} t={t} />)}
                          
                          {/* Zawsze widoczne puste pole do upuszczania na końcu listy */}
                          <div className="min-h-[100px] border-2 border-dashed border-slate-300/60 rounded-xl bg-slate-50/50 flex items-center justify-center opacity-60 pointer-events-none mt-2">
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Upuść tu</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* WIDOK: LISTA */}
              {viewMode === 'list' && (
                <div className="w-full h-full bg-white/95 backdrop-blur-sm border border-white/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden">
                  <div className={`flex-1 overflow-auto ${customScrollbarClasses}`}>
                    <table className="w-full text-left text-sm border-collapse min-w-[1200px]">
                      <thead className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-0 z-10 shadow-sm">
                        <tr>
                          {columns.filter(c => c.visible).map(c => (
                            <th 
                              key={c.key} 
                              className={`py-4 px-6 ${c.thClass} ${c.sortableKey ? 'cursor-pointer hover:text-slate-800 transition-colors' : ''}`}
                              onClick={() => c.sortableKey && handleSort(c.sortableKey)}
                            >
                              <div className={`flex items-center gap-1.5 ${c.thClass.includes('text-center') ? 'justify-center' : ''}`}>
                                {c.label} {c.sortableKey && <IconSort />}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100/60 text-xs">
                        {sortedAndFilteredTickets.map(t => {
                          const sla = getSlaInfo(t.created_at, t.station_id, t.status);
                          const station = stations.find(s => s.id === t.station_id);
                          return (
                            <tr key={t.id} className="hover:bg-slate-50/80 transition-colors cursor-pointer group" onClick={() => { setActiveTicket(t); setClosingForm({ status: t.status, resolution_notes: t.resolution_notes || '', part_id: '', part_qty: 1, consumePart: false }); }}>
                              {columns.filter(c => c.visible).map((c) => {
                                if (c.key === 'code') return (
                                  <td key={c.key} className={`py-4 px-6 align-middle ${c.tdClass}`}>
                                    <span onClick={(e) => handleCopyCode(e, t.ticket_code)} className="cursor-pointer hover:text-[#58b347]" title="Kopiuj do schowka">{t.ticket_code}</span>
                                  </td>
                                );
                                if (c.key === 'type') return <td key={c.key} className={`py-4 px-6 align-middle ${c.tdClass}`}>{t.ticket_type}</td>;
                                if (c.key === 'station') return (
                                  <td key={c.key} className={`py-4 px-6 align-middle ${c.tdClass}`}>
                                    <div className="font-bold text-slate-800 leading-tight">{station?.name}</div>
                                    <div className="text-[10px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">{station?.client} {station?.city ? `(${station.city})` : ''}</div>
                                  </td>
                                );
                                if (c.key === 'tech') return <td key={c.key} className={`py-4 px-6 align-middle ${c.tdClass}`}>{getTechName(t.technician_id)}</td>;
                                if (c.key === 'sla') return (
                                  <td key={c.key} className={`py-4 px-6 align-middle ${c.tdClass}`}>
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${sla.style}`}>
                                      {sla.label}
                                    </span>
                                  </td>
                                );
                                if (c.key === 'status') return (
                                  <td key={c.key} className={`py-4 px-6 align-middle ${c.tdClass}`}>
                                    <span className={`text-[10px] font-bold uppercase tracking-widest ${t.status === 'Zakończone' ? 'text-slate-400' : 'text-[#58b347]'}`}>
                                      {t.status}
                                    </span>
                                  </td>
                                );
                                if (c.key === 'actions') return (
                                  <td key={c.key} className={`py-4 px-6 align-middle ${c.tdClass}`}>
                                    <button className="bg-white border border-slate-200 text-slate-600 hover:text-[#58b347] hover:border-[#58b347] px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors opacity-0 group-hover:opacity-100">
                                      Zarządzaj
                                    </button>
                                  </td>
                                );
                                return null;
                              })}
                            </tr>
                          )
                        })}
                        {sortedAndFilteredTickets.length === 0 && (
                          <tr><td colSpan={columns.filter(c => c.visible).length} className="text-center p-12 text-slate-400 font-bold">Brak zgłoszeń spełniających wybrane kryteria wyszukiwania.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>

      {/* --- WODOTRYSK TOAST --- */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-slideUp border border-slate-700 pointer-events-none">
          <IconCheckCircle />
          <span className="text-xs font-bold uppercase tracking-widest">{toastMessage}</span>
        </div>
      )}

      {/* --- MODALE --- */}

      {/* MODAL: TWORZENIE ZAKŁADKI CUSTOMOWEJ (WIELOKROTNE TAGI) */}
      {isCustomTabModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setIsCustomTabModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">Stwórz nową zakładkę (Filtr)</h3>
              <button onClick={() => setIsCustomTabModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleSaveCustomTab} className="p-6 space-y-5 bg-slate-50/30">
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nazwa zakładki na pasku *</label>
                  <input required type="text" value={newCustomTab.name} onChange={e => setNewCustomTab({...newCustomTab, name: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" placeholder="Np. Wrocław - Tylko Orlen" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Status wyświetlanych zleceń</label>
                  <select value={newCustomTab.filterStatus} onChange={e => setNewCustomTab({...newCustomTab, filterStatus: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer">
                    <option value="ALL">Wszystkie w systemie</option>
                    <option value="ACTIVE">Tylko Otwarte (W toku)</option>
                    <option value="CLOSED">Tylko Zakończone</option>
                  </select>
                </div>
              </div>

              <div className="bg-white p-5 border border-slate-200 rounded-xl space-y-3 shadow-sm">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#58b347]">Warunki Filtrowania (Szukajka)</label>
                <p className="text-[10px] text-slate-400 mb-3 leading-relaxed border-b border-slate-100 pb-3">
                  Każde pole to osobny warunek. Możesz używać wykluczeń lub łączyć wiele miast. System wyciągnie listę stacji idealnie pasującą do Twojego zapytania.
                </p>
                {renderSearchQueries(newCustomTab.filterQueries, (q) => setNewCustomTab({...newCustomTab, filterQueries: q}))}
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200 mt-4">
                <button type="button" onClick={() => setIsCustomTabModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-xs">Anuluj</button>
                <button type="submit" disabled={!newCustomTab.name} className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl hover:bg-[#499b3a] disabled:opacity-50 shadow-sm transition-all text-xs">Zapisz zakładkę na stałe</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TWORZENIE RĘCZNEGO ZGŁOSZENIA (Panel Boczny, Autocomplete) */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setIsNewModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden border border-slate-200 animate-slideUp flex flex-col md:flex-row max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            
            {/* LEWA STRONA - FORMULARZ */}
            <div className={`w-full md:w-3/5 flex flex-col h-full border-r border-slate-100 relative ${customScrollbarClasses}`}>
              <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">Nowe zgłoszenie operacyjne</h3>
                <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors md:hidden">✕</button>
              </div>
              
              <div className="flex-1 overflow-y-auto">
                <form id="new-ticket-form" onSubmit={handleCreateManualTicket} className="p-6 space-y-5 bg-slate-50/30">
                  <div className="relative z-50">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Wyszukaj i wybierz stację ładowania *</label>
                    <StationAutocomplete 
                      stations={stations} 
                      value={newTicket.station_id} 
                      onChange={handleStationChange} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-5 relative z-40">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Typ akcji</label>
                      <select value={newTicket.ticket_type} onChange={e => setNewTicket({...newTicket, ticket_type: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer">
                        <option>Awaria</option>
                        <option>Przegląd</option>
                        <option>Uruchomienie</option>
                        <option>Zlecenie jakościowe</option>
                        <option>Naprawa odpłatna</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Priorytet SLA</label>
                      <select value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer">
                        <option>Niski</option>
                        <option>Normalny</option>
                        <option>Wysoki</option>
                        <option className="text-red-600 font-black">Krytyczny</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 shadow-inner relative z-30">
                    <label className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                      Przypisanie (Dispatch)
                      {isAutoAssignedFromZone && (
                        <span className="text-[#58b347] bg-[#58b347]/10 text-[9px] px-2 py-0.5 rounded-md font-black tracking-widest border border-[#58b347]/20">✓ AUTO-PRZYPISANIE Z REJONU</span>
                      )}
                    </label>
                    
                    {newTicket.station_id && getClosestTechnicianSuggestion(newTicket.station_id) && (
                      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex gap-3 items-start animate-fadeIn shadow-sm">
                        <div className="text-lg mt-0.5"><IconInfo /></div>
                        <div>
                          <strong className="block mb-1 text-[10px] uppercase tracking-widest text-blue-600">Sztuczna Inteligencja podpowiada:</strong>
                          Zaraz obok jest <strong>{getClosestTechnicianSuggestion(newTicket.station_id)?.technician}</strong>. 
                          Aktualnie obsługuje stację <em>{getClosestTechnicianSuggestion(newTicket.station_id)?.stationName}</em> (ok. {getClosestTechnicianSuggestion(newTicket.station_id)?.distance} km stąd).
                          <button type="button" onClick={() => setNewTicket({...newTicket, technician_id: getClosestTechnicianSuggestion(newTicket.station_id)!.technicianId!})} className="block mt-2 font-bold text-blue-600 hover:text-blue-800 underline transition-colors">Przypisz zadanie do tego technika</button>
                        </div>
                      </div>
                    )}

                    <select value={newTicket.technician_id} onChange={e => setNewTicket({...newTicket, technician_id: e.target.value})} className={`w-full border rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none transition-all cursor-pointer shadow-sm ${isAutoAssignedFromZone ? 'border-[#58b347] bg-[#58b347]/5 focus:ring-1 focus:ring-[#58b347]/30' : 'border-slate-200 bg-white focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30'}`}>
                      <option value="">-- Pozostaw w puli nieprzypisanych --</option>
                      {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>

                  <div className="relative z-20">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Opis / Uwagi od Klienta</label>
                    <textarea rows={3} value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm resize-none" placeholder="Co się stało? Jakie części mogą być potrzebne?" />
                  </div>
                </form>
              </div>

              <div className="p-6 border-t border-slate-100 shrink-0 flex gap-3 bg-white">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-xs">Anuluj</button>
                <button form="new-ticket-form" type="submit" className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl hover:bg-[#499b3a] shadow-sm transition-all text-xs">Utwórz zadanie</button>
              </div>
            </div>

            {/* PRAWA STRONA - AKTYWNE ZGŁOSZENIA + HISTORIA */}
            <div className="hidden md:flex w-2/5 flex-col bg-slate-50 h-full overflow-hidden relative">
              <button onClick={() => setIsNewModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 p-2 rounded-xl transition-colors shadow-sm border border-slate-200 z-10">✕</button>
              <div className="p-6 border-b border-slate-100 bg-white shrink-0">
                <h4 className="font-bold text-slate-800 text-sm uppercase tracking-widest flex items-center gap-2">
                  <IconList /> Akta Stacji
                </h4>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Wykrywacz dubli i powtórek usterki</p>
              </div>
              <div className={`p-6 flex-1 overflow-y-auto space-y-4 ${customScrollbarClasses}`}>
                {!newTicket.station_id ? (
                  <div className="text-center text-slate-400 font-bold text-xs py-10">Wybierz stację z listy po lewej stronie, aby załadować jej historię.</div>
                ) : (
                  <>
                    {/* AKORDEON: AKTYWNE */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="p-3.5 bg-slate-100/50 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setIsNewModalActiveOpen(!isNewModalActiveOpen)}>
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                          Aktywne zgłoszenia 
                          <span className={`${activeTks.length > 0 ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-500'} px-2 py-0.5 rounded-md`}>{activeTks.length}</span>
                        </span>
                        <span className="text-slate-400">{isNewModalActiveOpen ? <IconChevronUp /> : <IconChevronDown />}</span>
                      </div>
                      
                      {isNewModalActiveOpen && (
                        <div className="p-4 space-y-3 bg-slate-50/50">
                          {activeTks.length === 0 ? (
                            <div className="text-center text-[#58b347] font-bold text-[10px] uppercase tracking-widest py-6 border-2 border-dashed border-[#58b347]/30 rounded-xl bg-white shadow-sm flex flex-col items-center gap-1.5">
                              <IconCheckCircle /> Brak otwartych awarii!
                            </div>
                          ) : (
                            activeTks.map(t => {
                              const sla = getSlaInfo(t.created_at, t.station_id, t.status);
                              return (
                                <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm relative overflow-hidden">
                                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${sla.hoursLeft < 12 ? 'bg-orange-500' : 'bg-[#58b347]'}`} />
                                  <div className="flex justify-between items-start mb-1.5">
                                    <span className="font-mono text-[9px] font-bold text-slate-500">{t.ticket_code}</span>
                                    <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600">{t.status}</span>
                                  </div>
                                  <p className="font-bold text-xs text-slate-800 leading-tight mb-1">{t.ticket_type}</p>
                                  <p className="text-[10px] text-slate-500 italic mb-2 line-clamp-2">{t.description || 'Brak opisu zlecenia'}</p>
                                  <div className="pt-2 border-t border-slate-100 text-[8px] font-bold text-slate-400 uppercase flex justify-between items-center tracking-widest">
                                    <span>Tech: {getTechName(t.technician_id)}</span>
                                  </div>
                                </div>
                              )
                            })
                          )}
                        </div>
                      )}
                    </div>

                    {/* AKORDEON: HISTORIA ZAMKNIĘTYCH */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                      <div className="p-3.5 bg-slate-100/50 flex justify-between items-center cursor-pointer hover:bg-slate-100 transition-colors" onClick={() => setIsNewModalHistoryOpen(!isNewModalHistoryOpen)}>
                        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                          Historia serwisowa 
                          <span className="bg-slate-200 text-slate-500 px-2 py-0.5 rounded-md">{historyTks.length}</span>
                        </span>
                        <span className="text-slate-400">{isNewModalHistoryOpen ? <IconChevronUp /> : <IconChevronDown />}</span>
                      </div>
                      
                      {isNewModalHistoryOpen && (
                        <div className="p-4 space-y-3 bg-slate-50/50">
                          {historyTks.length === 0 ? (
                            <div className="text-center text-slate-400 font-bold text-[10px] uppercase tracking-widest py-6 border-2 border-dashed border-slate-200 rounded-xl bg-white shadow-sm">
                              Czysta karta historyczna.
                            </div>
                          ) : (
                            historyTks.map(t => (
                              <div key={t.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                                <div className="flex justify-between items-start mb-1.5">
                                  <span className="font-mono text-[9px] font-bold text-slate-400 line-through">{t.ticket_code}</span>
                                  <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">Zamknięte</span>
                                </div>
                                <p className="font-bold text-xs text-slate-600 leading-tight mb-1">{t.ticket_type}</p>
                                <p className="text-[9px] text-slate-500 font-medium line-clamp-2">Raport: {t.resolution_notes || 'Brak.'}</p>
                                {/* Przycisk Reaktywacji Zgłoszenia */}
                                <button 
                                  type="button" 
                                  onClick={(e) => { e.stopPropagation(); handleReopenTicketDirect(t.id); }}
                                  className="mt-2 text-[9px] font-bold text-orange-600 bg-orange-50 px-2 py-1.5 rounded border border-orange-200 hover:bg-orange-100 transition-colors w-full text-center flex items-center justify-center gap-1 uppercase tracking-widest"
                                >
                                  <IconRefresh /> Otwórz ponownie
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ZARZĄDZANIE / ZAMYKANIE ZGŁOSZENIA */}
      {activeTicket && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setActiveTicket(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono text-[10px] border border-slate-200">{activeTicket.ticket_code}</span> 
                  {activeTicket.ticket_type}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{getStationName(activeTicket.station_id)}</p>
              </div>
              <button onClick={() => setActiveTicket(null)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleUpdateTicketStatus} className="p-6 space-y-5 bg-slate-50/30">
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-700 text-sm shadow-sm">
                <strong className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-widest">Treść zgłoszenia klienta:</strong>
                <p className="font-medium italic text-slate-600">{activeTicket.description || 'Brak dodatkowego opisu usterki.'}</p>
              </div>

              {activeTicket.status !== 'Zakończone' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Zmień status operacyjny</label>
                    <select value={closingForm.status} onChange={e => setClosingForm({...closingForm, status: e.target.value})} className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm font-bold text-[#58b347] focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer">
                      <option value="Nowe">Nowe (Oczekuje na akcję)</option>
                      <option value="W toku">W toku (Technik w drodze / Działa)</option>
                      <option value="Oczekuje na części">Oczekuje na części (Zdiagnozowano)</option>
                      <option value="Zakończone">Zakończone (Naprawiono)</option>
                    </select>
                  </div>

                  {closingForm.status === 'Zakończone' && activeTicket.technician_id && (
                    <div className="bg-orange-50 border border-orange-200 p-5 rounded-xl space-y-4 shadow-sm animate-fadeIn">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="consumePart" checked={closingForm.consumePart} onChange={e => setClosingForm({...closingForm, consumePart: e.target.checked})} className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer border-orange-300" />
                        <label htmlFor="consumePart" className="text-xs font-bold text-orange-800 cursor-pointer select-none uppercase tracking-widest">Zużyto materiał z auta technika</label>
                      </div>
                      
                      {closingForm.consumePart && (
                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-orange-200/50">
                          <div className="col-span-2">
                            <select required={closingForm.consumePart} value={closingForm.part_id} onChange={e => setClosingForm({...closingForm, part_id: e.target.value})} className="w-full border border-orange-300 bg-white rounded-lg p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-orange-400 shadow-sm cursor-pointer">
                              <option value="">Wybierz sprzęt z bagażnika...</option>
                              {techInventory.map(item => {
                                const p = getPartDetails(item.part_id);
                                return <option key={item.id} value={item.part_id}>{p?.name} (Auto: {item.quantity} szt.)</option>
                              })}
                            </select>
                          </div>
                          <div>
                            <input type="number" min="1" required={closingForm.consumePart} value={closingForm.part_qty} onChange={e => setClosingForm({...closingForm, part_qty: parseInt(e.target.value) || 1})} className="w-full border border-orange-300 bg-white rounded-lg p-2.5 text-center font-black text-sm text-slate-800 outline-none focus:ring-1 focus:ring-orange-400 shadow-sm" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Raport techniczny dla bazy</label>
                    <textarea required={closingForm.status === 'Zakończone'} rows={3} value={closingForm.resolution_notes} onChange={e => setClosingForm({...closingForm, resolution_notes: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm resize-none" placeholder="Co dokładnie zrobiono? Jakie były przyczyny?" />
                  </div>

                  <div className="pt-3 border-t border-slate-200 mt-4">
                    <button type="submit" className="w-full bg-[#58b347] text-white font-bold py-3.5 rounded-xl hover:bg-[#499b3a] shadow-sm transition-colors text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                      <IconCheck /> Zaktualizuj system
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-6 pt-2">
                  <div className="bg-[#58b347]/10 p-5 rounded-xl border border-[#58b347]/20 flex flex-col items-center justify-center text-center">
                    <IconCheckCircle />
                    <span className="text-[#499b3a] block font-black uppercase tracking-widest mt-2 mb-1">Zgłoszenie Zamknięte</span>
                    <span className="text-xs font-bold text-slate-500">Realizacja: {getTechName(activeTicket.technician_id)}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Oficjalny Raport:</label>
                    <div className="bg-white border border-slate-200 text-slate-700 p-4 rounded-xl font-medium whitespace-pre-wrap text-sm leading-relaxed shadow-sm">{activeTicket.resolution_notes || 'Brak uwag serwisowych.'}</div>
                  </div>
                  
                  <div className="pt-3 border-t border-slate-200 flex gap-3">
                    <button type="button" onClick={() => setActiveTicket(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors shadow-sm text-[10px] uppercase tracking-widest">Wróć do listy</button>
                    <button type="button" onClick={handleReopenTicket} className="flex-1 bg-orange-50 border border-orange-200 text-orange-600 font-bold py-3.5 rounded-xl hover:bg-orange-100 transition-colors shadow-sm text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5">
                      <IconRefresh /> Otwórz ponownie
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}