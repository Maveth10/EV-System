'use client';
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../app/supabase';
import AddStationModal from './AddStationModal';
import StationAnalytics from './StationAnalytics';

export type Station = {
  id: string;
  created_at?: string;
  name: string;
  client: string | null;
  model: string | null;
  inspection_date: string | null;
  last_ticket_date: string | null;
  technician: string | null;
  region?: string | null;
  status: string;
  country: string | null;
  city: string | null;
  street: string | null;
  additional_info: string | null;
  lat?: number;
  lng?: number;
};

type SortConfig = { key: keyof Station; direction: 'asc' | 'desc' } | null;
type ColumnKey = 'select' | 'actions' | 'name' | 'client' | 'location' | 'region' | 'model' | 'inspection_date' | 'last_ticket_date' | 'technician' | 'status' | 'additional_info' | 'country' | 'lat' | 'lng' | 'created_at';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  visible: boolean;
  sortableKey?: keyof Station;
  thClass: string;
  tdClass: string;
}

const defaultColumns: ColumnDef[] = [
  { key: 'select', label: '☑', visible: true, thClass: 'w-10 text-center', tdClass: 'text-center' },
  { key: 'actions', label: 'Akcje', visible: true, thClass: 'w-20 text-center text-slate-400', tdClass: 'text-center' },
  { key: 'name', label: 'Identyfikator', visible: true, sortableKey: 'name', thClass: 'w-[11%] min-w-[100px]', tdClass: 'font-bold text-slate-800 truncate' },
  { key: 'client', label: 'Klient', visible: true, sortableKey: 'client', thClass: 'w-[13%] min-w-[110px]', tdClass: 'text-slate-700 font-semibold truncate' },
  { key: 'location', label: 'Lokalizacja', visible: true, sortableKey: 'city', thClass: 'w-[18%] min-w-[150px]', tdClass: 'text-slate-600' },
  { key: 'region', label: 'Region', visible: true, sortableKey: 'region', thClass: 'w-[12%] min-w-[110px]', tdClass: '' },
  { key: 'model', label: 'Model', visible: true, sortableKey: 'model', thClass: 'w-[10%] min-w-[90px]', tdClass: 'text-slate-600 font-medium truncate' },
  { key: 'inspection_date', label: 'UDT', visible: true, sortableKey: 'inspection_date', thClass: 'w-[7%] min-w-[70px]', tdClass: 'text-slate-600 font-medium tabular-nums' },
  { key: 'last_ticket_date', label: 'Zgłoszenie', visible: true, sortableKey: 'last_ticket_date', thClass: 'w-[7%] min-w-[70px]', tdClass: 'text-slate-500 font-mono text-[10px]' },
  { key: 'technician', label: 'Opiekun', visible: true, sortableKey: 'technician', thClass: 'w-[14%] min-w-[130px]', tdClass: '' },
  { key: 'status', label: 'Status', visible: true, sortableKey: 'status', thClass: 'w-[10%] min-w-[110px]', tdClass: '' },
  { key: 'additional_info', label: 'Dodatkowe info', visible: false, sortableKey: 'additional_info', thClass: 'w-[10%] min-w-[150px]', tdClass: 'text-slate-500 truncate' },
  { key: 'country', label: 'Kraj', visible: false, sortableKey: 'country', thClass: 'w-[8%] min-w-[100px]', tdClass: 'text-slate-600 truncate' },
  { key: 'lat', label: 'Szer. GPS', visible: false, sortableKey: 'lat', thClass: 'w-[8%] min-w-[100px]', tdClass: 'text-slate-400 font-mono text-[10px]' },
  { key: 'lng', label: 'Dł. GPS', visible: false, sortableKey: 'lng', thClass: 'w-[8%] min-w-[100px]', tdClass: 'text-slate-400 font-mono text-[10px]' },
  { key: 'created_at', label: 'Data', visible: false, sortableKey: 'created_at', thClass: 'w-[8%] min-w-[100px]', tdClass: 'text-slate-500 text-[10px]' },
];

const IconSort = () => <svg className="w-3.5 h-3.5 inline-block ml-1 opacity-40 hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>;
const IconTrash = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconEdit = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconImport = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const IconMapPin = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconNoLocation = () => <svg className="w-3.5 h-3.5 text-orange-400 inline-block mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m2 2 20 20"/><path d="M8.36 8.36a6 6 0 0 1 8.28 8.28"/><path d="M19.38 19.38A11.9 11.9 0 0 0 20 10c0-6-8-12-8-12s-3.72 2.79-5.83 6.64"/></svg>;
const IconColumns = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>;
const IconSearch = () => <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconArrowUp = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const IconArrowDown = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const IconRadar = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/><circle cx="12" cy="12" r="2"/><path d="m13.41 10.59 5.66-5.66"/></svg>;
const IconPlus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const IconCheck = () => <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

const CustomCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-4 h-4 rounded-[4px] flex items-center justify-center cursor-pointer transition-colors duration-200 ${checked ? 'bg-[#58b347] border-[#58b347]' : 'border border-slate-300 bg-white hover:border-[#58b347]/50'}`}
  >
    {checked && <IconCheck />}
  </div>
);

// --- ZAAWANSOWANY PARSER DANYCH Z BAZY ---
const parseMultipleValues = (val: string | null) => {
  if (!val || val.trim() === '') return [];
  
  let cleaned = val.trim();
  if (cleaned.startsWith('{') && cleaned.endsWith('}')) {
    cleaned = cleaned.slice(1, -1);
  }
  
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map(String);
  } catch (e) {
  }
  return cleaned.split(/[,;]+/).map(s => s.trim()).filter(Boolean);
};

// --- KOMPONENT WYSKAKUJĄCEJ LISTY ---
const MultiItemBadge = ({ mainText, allItems, type }: { mainText: string, allItems: string[], type: 'tech' | 'region' }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const mainBadgeColors = type === 'tech' 
    ? 'bg-[#58b347]/10 text-[#499b3a] border-[#58b347]/20' 
    : 'bg-slate-100 text-slate-600 border-slate-200';

  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest whitespace-nowrap ${mainBadgeColors}`}>
        {mainText}
      </span>
      
      <div 
        className="relative flex items-center" 
        ref={dropdownRef}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
      >
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-[#58b347]/15 hover:bg-[#58b347]/25 text-[#499b3a] border border-[#58b347]/30 uppercase tracking-wider cursor-help transition-colors">
          +{allItems.length - 1}
        </span>

        {isOpen && (
          <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 min-w-[180px] bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-xl shadow-2xl z-50 overflow-hidden animate-fadeIn p-2 flex flex-col gap-1">
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1.5 border-b border-slate-100 mb-1 whitespace-nowrap">
              {type === 'tech' ? 'Przypisani technicy' : 'Przypisane regiony'}
            </div>
            {allItems.map((item, idx) => (
              <div key={idx} className="text-[11px] font-semibold text-slate-700 px-2 py-1.5 hover:bg-[#58b347]/10 hover:text-[#499b3a] rounded-lg transition-colors whitespace-nowrap cursor-default">
                • {item}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const parseCSV = (text: string, delimiter: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'; 
        i++; 
      } else {
        inQuotes = !inQuotes; 
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentCell.trim());
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++; 
      currentRow.push(currentCell.trim());
      if (currentRow.some(cell => cell !== '')) rows.push(currentRow);
      currentRow = [];
      currentCell = '';
    } else {
      currentCell += char;
    }
  }
  
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some(cell => cell !== '')) rows.push(currentRow);
  }
  
  return rows.map(row => row.map(cell => cell.replace(/^["']|["']$/g, '').trim()));
};

const getDaysSince = (dateString: string | null) => {
  if (!dateString) return 'Brak zgłoszeń';
  const diffTime = Math.abs(new Date().getTime() - new Date(dateString).getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? 'Dzisiaj' : `${diffDays} dni temu`;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Awaria': return 'bg-red-50 text-red-700 border-red-200';
    case 'Uruchomienie': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Przegląd': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Zlecenie jakościowe': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Naprawa odpłatna': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Brak akcji': default: return 'bg-[#58b347]/10 text-[#499b3a] border-[#58b347]/20';
  }
};

const getStatusDot = (status: string) => {
  switch (status) {
    case 'Awaria': return 'bg-red-500';
    case 'Uruchomienie': return 'bg-purple-500';
    case 'Przegląd': return 'bg-blue-500';
    case 'Zlecenie jakościowe': return 'bg-orange-500';
    case 'Naprawa odpłatna': return 'bg-amber-500';
    case 'Brak akcji': default: return 'bg-[#58b347]';
  }
};

interface StationsDatabaseProps {
  onFocusStation: (station: Station) => void;
  isSidebarHovered?: boolean;
  refreshTrigger?: number; // DODANE: Odbieranie sygnału do odświeżenia tabeli
}

export default function StationsDatabase({ onFocusStation, isSidebarHovered = false, refreshTrigger = 0 }: StationsDatabaseProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [columns, setColumns] = useState<ColumnDef[]>(defaultColumns);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [advancedDetailsStation, setAdvancedDetailsStation] = useState<Station | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [isGeocodeModalOpen, setIsGeocodeModalOpen] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState('');
  const [singleGeocodingId, setSingleGeocodingId] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const nominateHeaders = { 'User-Agent': 'EkoenFSMDispatchSystem/6.0 (dispatch@ekoen.pl)' };

  const fetchStations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('stations')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) {
      alert(`Błąd pobierania danych z bazy: ${error.message}`);
    } else if (data) {
      setStations(data as Station[]);
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchStations(); }, []);

  // DODANE: Nasłuchujemy na zapalnik z ChargeMap, aby przeładować tabelę w locie
  useEffect(() => {
    if (refreshTrigger > 0) {
      fetchStations();
    }
  }, [refreshTrigger]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isImportModalOpen && !isImporting) setIsImportModalOpen(false);
        if (isGeocodeModalOpen && !isGeocoding) handleCancelGeocode();
        if (isColumnSettingsOpen) setIsColumnSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImportModalOpen, isImporting, isColumnSettingsOpen, isGeocodeModalOpen, isGeocoding]);

  const handleCancelGeocode = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsGeocoding(false);
    setSingleGeocodingId(null);
    setIsGeocodeModalOpen(false);
    setGeocodeStatus('');
    fetchStations();
  };

  const handleSort = (key: keyof Station) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const processedStations = useMemo(() => {
    let result = stations;

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      result = result.filter(s => 
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.client && s.client.toLowerCase().includes(q)) ||
        (s.city && s.city.toLowerCase().includes(q)) ||
        (s.street && s.street.toLowerCase().includes(q)) ||
        (s.technician && s.technician.toLowerCase().includes(q)) ||
        (s.model && s.model.toLowerCase().includes(q)) ||
        (s.region && s.region.toLowerCase().includes(q)) ||
        (s.additional_info && s.additional_info.toLowerCase().includes(q))
      );
    }

    if (sortConfig) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [stations, sortConfig, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.length === processedStations.length && processedStations.length > 0) setSelectedIds([]);
    else setSelectedIds(processedStations.map(s => s.id));
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(selId => selId !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const deleteSelected = async () => {
    if (!confirm(`Na pewno chcesz bezpowrotnie usunąć wybrane stacje (${selectedIds.length})?`)) return;
    const { error } = await supabase.from('stations').delete().in('id', selectedIds);
    if (error) alert('Błąd usuwania. Upewnij się, że stacje nie mają przypisanych otwartych zgłoszeń.');
    else { setSelectedIds([]); fetchStations(); }
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

  const missingGpsCount = stations.filter(s => !s.lat || !s.lng).length;

  const handleGeocodeSingle = async (station: Station) => {
    if (isGeocoding || singleGeocodingId) return;
    setSingleGeocodingId(station.id);
    const cleanStreet = station.street ? station.street.replace(/\b(MOP|Mop|mop|A2|A1|A4|S3|S5|Mop Chociszewo|MOP Rogoziniec)\b/g, '').replace(/\s+/g, ' ').trim() : '';
    const fullAddress = `${cleanStreet}, ${station.city || ''}, ${station.country || 'Polska'}`;

    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`, { headers: nominateHeaders });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0 && !isNaN(parseFloat(data[0].lat))) {
          const lat = parseFloat(data[0].lat);
          const lng = parseFloat(data[0].lon);
          const { error } = await supabase.from('stations').update({ lat, lng }).eq('id', station.id);
          if (error) alert(`Błąd zapisu współrzędnych: ${error.message}`);
        } else {
          alert('Adres nie został odnaleziony przez bazę map Nominatim.');
        }
      }
    } catch (e) {
      alert('Błąd sieci podczas geokodowania stacji.');
    } finally {
      setSingleGeocodingId(null);
      fetchStations();
    }
  };

  const handleGeocodeBatch = async (mode: 'selected' | 'all') => {
    let targets = stations.filter(s => !s.lat || !s.lng);
    if (mode === 'selected') {
      targets = targets.filter(s => selectedIds.includes(s.id));
    }
    if (targets.length === 0) {
      alert('Brak punktów spełniających kryteria geokodowania.');
      return;
    }

    setIsGeocoding(true);
    abortControllerRef.current = new AbortController();

    const addressGroups = new Map<string, typeof targets>();
    targets.forEach(s => {
      const c = s.city || '';
      const str = s.street || '';
      const ctry = s.country || 'Polska';
      const key = `${str}|${c}|${ctry}`;
      if (!addressGroups.has(key)) addressGroups.set(key, []);
      addressGroups.get(key)!.push(s);
    });

    let processed = 0;
    const totalGroups = addressGroups.size;
    let successUpdates = 0;
    const groupsArray = Array.from(addressGroups.entries());

    for (const [key, stList] of groupsArray) {
      if (abortControllerRef.current?.signal.aborted) break;
      processed++;
      setGeocodeStatus(`Szukanie lokalizacji (${processed} z ${totalGroups})...`);

      const [street, city, country] = key.split('|');
      let lat = null, lng = null;
      const cleanStreet = street.replace(/\b(MOP|Mop|mop|A2|A1|A4|S3|S5|Mop Chociszewo|MOP Rogoziniec)\b/g, '').replace(/\s+/g, ' ').trim();

      if (cleanStreet || city) {
        try {
          await new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, 1200);
            abortControllerRef.current?.signal.addEventListener('abort', () => {
              clearTimeout(timeout);
              reject(new Error('aborted'));
            });
          });

          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${cleanStreet}, ${city}, ${country}`)}`;
          const res = await fetch(url, { headers: nominateHeaders, signal: abortControllerRef.current?.signal });
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0 && !isNaN(parseFloat(data[0].lat))) {
              lat = parseFloat(data[0].lat);
              lng = parseFloat(data[0].lon);
            }
          }
        } catch (e) {
          console.log("Przerwano zapytanie");
        }
      }

      if (lat && lng && !abortControllerRef.current?.signal.aborted) {
        for (const s of stList) {
          const offsetLat = lat + (Math.random() - 0.5) * 0.0001;
          const offsetLng = lng + (Math.random() - 0.5) * 0.0001;
          await supabase.from('stations').update({ lat: offsetLat, lng: offsetLng }).eq('id', s.id);
          successUpdates++;
        }
      }
    }

    setIsGeocoding(false);
    setIsGeocodeModalOpen(false);
    setGeocodeStatus('');
    setSelectedIds([]);
    fetchStations();
  };

  const renderCellContent = (station: Station, key: ColumnKey) => {
    switch (key) {
      case 'select':
        return (
          <div className="flex justify-center">
            <CustomCheckbox checked={selectedIds.includes(station.id)} onChange={() => toggleSelect(station.id)} />
          </div>
        );
      case 'actions':
        return (
          <div className="flex justify-center gap-2">
            <button onClick={() => onFocusStation(station)} disabled={!station.lat} className={`${station.lat ? 'text-slate-400 hover:text-blue-500 hover:bg-blue-50 cursor-pointer' : 'text-slate-200 cursor-not-allowed'} p-1.5 rounded-lg transition-colors`} title={station.lat ? "Pokaż lokalizację na mapie" : "Brak współrzędnych"}><IconMapPin /></button>
            <button onClick={() => setEditingStation(station)} className="text-slate-400 hover:text-[#58b347] hover:bg-[#58b347]/10 p-1.5 rounded-lg transition-colors" title="Edytuj dane stacji"><IconEdit /></button>
          </div>
        );
      case 'name':
        return (
          <span className="cursor-pointer font-bold text-slate-800 hover:text-[#58b347] transition-colors border-b border-transparent hover:border-[#58b347]/30 pb-0.5" onClick={() => setAdvancedDetailsStation(station)} title={`Szczegóły: ${station.name}`}>
            {station.name}
          </span>
        );
      case 'client': return <span title={station.client || ''}>{station.client || '-'}</span>;
      case 'location':
        return (
          <div className="flex items-center justify-between w-full h-full pr-1">
            <span className="truncate" title={station.city ? `${station.city}, ${station.street}` : ''}>
              {station.city ? `${station.city}, ${station.street}` : '-'}
            </span>
            {(!station.lat || !station.lng) && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleGeocodeSingle(station); }}
                disabled={singleGeocodingId !== null || isGeocoding}
                className="p-1 rounded-md hover:bg-orange-50 text-orange-500 hover:text-orange-600 transition-colors disabled:opacity-30 cursor-pointer shrink-0"
                title="Geokoduj ten adres punktowo"
              >
                {singleGeocodingId === station.id ? (
                  <div className="w-3.5 h-3.5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <IconNoLocation />
                )}
              </button>
            )}
          </div>
        );
      case 'region': {
        const regions = parseMultipleValues(station.region);
        if (regions.length === 0) {
          return <span className="inline-flex px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-bold border border-red-200 uppercase tracking-widest whitespace-nowrap">Poza regionem</span>;
        }
        if (regions.length > 1) {
          return <MultiItemBadge mainText={regions[0]} allItems={regions} type="region" />;
        }
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold border border-slate-200 uppercase tracking-widest whitespace-nowrap block truncate" title={regions[0]}>
            {regions[0]}
          </span>
        );
      }
      case 'model': return <span title={station.model || ''}>{station.model || '-'}</span>;
      case 'inspection_date': return station.inspection_date || '-';
      case 'last_ticket_date': return getDaysSince(station.last_ticket_date);
      case 'technician': {
        const techs = parseMultipleValues(station.technician);
        if (techs.length === 0) {
          return <span className="inline-flex px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-bold border border-red-200 uppercase tracking-widest whitespace-nowrap">Brak opiekuna</span>;
        }
        if (techs.length > 1) {
          return <MultiItemBadge mainText={techs[0]} allItems={techs} type="tech" />;
        }
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold bg-[#58b347]/10 text-[#499b3a] border border-[#58b347]/20 uppercase tracking-widest whitespace-nowrap block truncate" title={techs[0]}>
            {techs[0]}
          </span>
        );
      }
      case 'status':
        return (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-bold border uppercase tracking-wider ${getStatusBadge(station.status)}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(station.status)}`} />
            {station.status}
          </span>
        );
      case 'additional_info': return <span className="truncate block" title={station.additional_info || ''}>{station.additional_info || '-'}</span>;
      case 'country': return station.country || '-';
      case 'lat': return station.lat ? station.lat.toFixed(6) : '-';
      case 'lng': return station.lng ? station.lng.toFixed(6) : '-';
      case 'created_at': return station.created_at ? new Date(station.created_at).toLocaleDateString() : '-';
      default: return null;
    }
  };

  const selectedMissingGpsCount = useMemo(() => {
    return stations.filter(s => (!s.lat || !s.lng) && selectedIds.includes(s.id)).length;
  }, [stations, selectedIds]);

  const handleImportStations = async (e: React.FormEvent) => {
    e.preventDefault();
    const matches = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = matches ? matches[1] : null;

    if (!spreadsheetId) { alert('Nieprawidłowy link do Arkusza Google.'); return; }

    setIsImporting(true);
    setImportStatus('Nawiązywanie połączenia z plikiem...');

    const candidates = ['stacje', 'stations', 'arkusz1', 'sheet1', 'Arkusz1', 'Sheet1'];
    let csvText = '';
    let isPrivate = false;

    for (const tab of candidates) {
      try {
        const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`);
        if (res.ok) {
          const text = await res.text();
          if (text && text.includes('<html')) isPrivate = true;
          else if (text && text.includes(',')) { csvText = text; break; }
        }
      } catch (err) {}
    }

    if (!csvText && !isPrivate) {
      try {
        const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`);
        if (res.ok) {
          const text = await res.text();
          if (text && text.includes('<html')) isPrivate = true;
          else if (text) csvText = text;
        }
      } catch (err) {}
    }

    if (isPrivate) {
      alert("UWAGA: Arkusz jest prywatny. Zmień uprawnienia na 'Każdy, kto ma link'.");
      setIsImporting(false); setImportStatus(''); return;
    }

    if (!csvText) {
      alert('Nie udało się pobrać danych z arkusza.');
      setIsImporting(false); setImportStatus(''); return;
    }

    const delimiter = csvText.split('\n')[0].includes(';') ? ';' : ',';
    const parsedData = parseCSV(csvText, delimiter);
    if (parsedData.length < 2) { alert('Arkusz nie zawiera danych.'); setIsImporting(false); return; }

    const headers = parsedData[0].map(h => h.toLowerCase());
    const getColIndex = (names: string[]) => headers.findIndex(h => names.some(n => h === n || h.includes(n)));
    
    const idxName = getColIndex(['identyfikator', 'nazwa', 'name']);
    const idxClient = getColIndex(['klient', 'client']);
    const idxModel = getColIndex(['model']);
    const idxCountry = getColIndex(['kraj', 'country']);
    const idxCity = getColIndex(['miasto', 'city']);
    const idxStreet = getColIndex(['ulica', 'street']);
    const idxDate = getColIndex(['przegląd', 'data', 'inspection']);

    if (idxName === -1) {
      alert('Błąd: Nie odnaleziono nagłówka "Identyfikator".');
      setIsImporting(false); return;
    }

    const rows = parsedData.slice(1);
    setImportStatus(`Mapowanie ${rows.length} rekordów...`);
    const finalPayloads = [];

    for (let i = 0; i < rows.length; i++) {
      const vals = rows[i];
      const nameVal = vals[idxName];
      if (!nameVal) continue;

      let cityVal = idxCity !== -1 ? vals[idxCity] : '';
      let streetVal = idxStreet !== -1 ? vals[idxStreet] : '';
      let countryVal = idxCountry !== -1 ? vals[idxCountry] : 'Polska';

      finalPayloads.push({
        name: nameVal,
        client: idxClient !== -1 && vals[idxClient] ? vals[idxClient] : null,
        model: idxModel !== -1 && vals[idxModel] ? vals[idxModel] : null,
        inspection_date: idxDate !== -1 && vals[idxDate] ? vals[idxDate] : null,
        status: 'Brak akcji',
        country: countryVal,
        city: cityVal,
        street: streetVal
      });
    }

    let successCount = 0;
    for (let i = 0; i < finalPayloads.length; i += 100) {
      const chunk = finalPayloads.slice(i, i + 100);
      setImportStatus(`Zapisywanie (${i + chunk.length}/${finalPayloads.length})...`);
      const { error } = await supabase.from('stations').insert(chunk);
      if (!error) successCount += chunk.length;
    }

    alert(`Gotowe! Zaimportowano ${successCount} stacji.`);
    setIsImporting(false); setIsImportModalOpen(false); setSheetUrl(''); setImportStatus('');
    fetchStations();
  };

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-100/60 backdrop-blur-2xl border-l border-white/20 z-40 overflow-hidden flex flex-col font-sans transition-all duration-300 ease-out shadow-[-10px_0_30px_rgba(0,0,0,0.05)]">
      
      {/* Pasek Nawigacji */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/40 px-6 py-4 flex justify-between items-center shrink-0">
        <div className={`transition-all duration-300 ease-in-out ${isSidebarHovered ? 'ml-[184px]' : 'ml-0'}`}>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Katalog Stacji i Regionów</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Zarządzanie infrastrukturą ładowania i jej lokalizacją.</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/50 border border-slate-200/50 px-3 py-1.5 rounded-lg shadow-sm">
            Widocznych: <strong className="text-slate-800">{processedStations.length} / {stations.length}</strong>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide flex justify-center">
        <div className="w-full max-w-[1600px] flex flex-col h-full bg-white/95 backdrop-blur-sm border border-white/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          
          {/* PASEK NARZĘDZI */}
          <div className="p-5 border-b border-slate-100/60 flex justify-between items-center bg-slate-50/50 shrink-0">
            <div className="flex gap-3 items-center">
              <div className="relative">
                <IconSearch />
                <input 
                  type="text" 
                  placeholder="Filtruj (ID, klient, miasto)..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 w-[280px] shadow-sm transition-all"
                />
              </div>

              <div className="relative">
                <button onClick={() => setIsColumnSettingsOpen(!isColumnSettingsOpen)} className={`bg-white border text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors ${isColumnSettingsOpen ? 'border-[#58b347] text-[#58b347]' : 'border-slate-200'}`}>
                  <IconColumns /> Kolumny
                </button>
                
                {isColumnSettingsOpen && (
                  <div className="absolute left-0 top-full mt-2 w-64 bg-white/95 backdrop-blur-2xl border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-fadeIn">
                    <div className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-4 py-3 border-b border-slate-100 flex justify-between items-center tracking-widest">
                      Konfiguracja widoku
                      <button onClick={() => setIsColumnSettingsOpen(false)} className="hover:text-slate-700 transition-colors">✕</button>
                    </div>
                    <div className="p-2 max-h-[60vh] overflow-y-auto scrollbar-hide">
                      {columns.map((c, i) => (
                        <div key={c.key} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl group transition-colors cursor-pointer" onClick={() => toggleColumnVisibility(i)}>
                          <div className="flex items-center gap-3">
                            <CustomCheckbox checked={c.visible} onChange={() => {}} />
                            <span className={`text-xs font-bold select-none ${c.visible ? 'text-slate-700' : 'text-slate-400'}`}>{c.label === '☑' ? 'Zaznaczanie' : c.label}</span>
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
            </div>
            
            <div className="flex gap-3 items-center">
              {missingGpsCount > 0 && (
                <button onClick={() => setIsGeocodeModalOpen(true)} className="bg-white border border-orange-200 text-orange-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-orange-50 hover:border-orange-300 flex items-center gap-2 shadow-sm transition-all animate-pulse">
                  <IconRadar /> Brak GPS ({missingGpsCount})
                </button>
              )}

              {selectedIds.length > 0 && (
                <button onClick={deleteSelected} className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 flex items-center gap-2 shadow-sm transition-all">
                  <IconTrash /> Usuń wybrane ({selectedIds.length})
                </button>
              )}
              
              <div className="w-px h-6 bg-slate-200 mx-1"></div>

              <button onClick={() => setIsImportModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors">
                <IconImport /> Import CSV
              </button>
              <button onClick={() => setIsAddModalOpen(true)} className="bg-[#58b347] text-white border border-[#499b3a] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#499b3a] flex items-center gap-2 shadow-sm transition-colors">
                <IconPlus /> Nowa stacja
              </button>
            </div>
          </div>

          {/* TABELA DANYCH */}
          <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide">
            <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
              <thead>
                <tr className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-0 z-10 shadow-sm shadow-slate-100/50">
                  {columns.filter(c => c.visible).map(c => (
                    <th 
                      key={c.key} 
                      className={`py-4 px-3 ${c.thClass} ${c.sortableKey ? 'cursor-pointer hover:text-slate-800 hover:bg-slate-100/80 transition-colors' : ''}`}
                      onClick={() => c.sortableKey && handleSort(c.sortableKey)}
                    >
                      {c.key === 'select' ? (
                        <div className="flex justify-center">
                          <CustomCheckbox 
                            checked={selectedIds.length === processedStations.length && processedStations.length > 0} 
                            onChange={toggleSelectAll} 
                          />
                        </div>
                      ) : (
                        <div className={`flex items-center gap-1.5 ${c.thClass.includes('text-center') ? 'justify-center' : ''}`}>
                          {c.label} {c.sortableKey && <IconSort />}
                        </div>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/60 text-xs">
                {isLoading ? (
                  <tr><td colSpan={columns.filter(c => c.visible).length} className="p-12 text-center text-slate-400 font-bold">Ładowanie bazy stacji...</td></tr>
                ) : processedStations.length === 0 ? (
                  <tr><td colSpan={columns.filter(c => c.visible).length} className="p-12 text-center text-slate-400 font-bold">Brak wyników w bazie.</td></tr>
                ) : (
                  processedStations.map(station => (
                    <tr key={station.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.includes(station.id) ? 'bg-[#58b347]/5 hover:bg-[#58b347]/10' : ''}`}>
                      {columns.filter(c => c.visible).map(c => (
                        <td key={c.key} className={`py-3 px-3 ${c.tdClass}`}>
                          {renderCellContent(station, c.key)}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* --- MODALE --- */}
      <AddStationModal isOpen={isAddModalOpen || !!editingStation} onClose={() => { setIsAddModalOpen(false); setEditingStation(null); }} initialLatLng={null} onSuccess={fetchStations} editingStation={editingStation} />

      {advancedDetailsStation && (
        <StationAnalytics station={advancedDetailsStation} onClose={() => setAdvancedDetailsStation(null)} />
      )}

      {/* MODAL GEOLOKALIZACJI */}
      {isGeocodeModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => !isGeocoding && handleCancelGeocode()}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-800 px-6 py-5 border-b border-slate-700 flex justify-between items-center text-white">
              <h3 className="text-sm font-extrabold uppercase tracking-widest flex items-center gap-2"><IconRadar /> Moduł Geokodowania</h3>
              <button onClick={handleCancelGeocode} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
                <p>Wskaż zakres automatycznego odnajdywania koordynatów GPS za pomocą serwera OpenStreetMap.</p>
                <div className="text-[11px] text-slate-500 pt-1 space-y-1">
                  <p>• Wszystkie braki w systemie: <strong className="text-slate-700">{missingGpsCount} stacji</strong></p>
                  <p>• Tylko zaznaczone z ptaszkiem: <strong className="text-slate-700">{selectedMissingGpsCount} stacji</strong></p>
                </div>
              </div>
              
              {isGeocoding && (
                <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin shrink-0" />
                  <p className="text-xs font-bold text-orange-700">{geocodeStatus}</p>
                </div>
              )}

              <div className="flex flex-col gap-2 pt-2">
                <div className="flex gap-2">
                  <button type="button" onClick={handleCancelGeocode} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-200 transition-colors">
                    {isGeocoding ? 'Przerwij i zamknij' : 'Zamknij'}
                  </button>
                  <button 
                    type="button" 
                    disabled={isGeocoding || selectedMissingGpsCount === 0} 
                    onClick={() => handleGeocodeBatch('selected')} 
                    className="flex-1 bg-blue-600 text-white font-bold py-2.5 rounded-xl text-xs hover:bg-blue-700 transition-colors disabled:opacity-40"
                  >
                    Skanuj zaznaczone
                  </button>
                </div>
                <button 
                  type="button" 
                  disabled={isGeocoding || missingGpsCount === 0} 
                  onClick={() => handleGeocodeBatch('all')} 
                  className="w-full bg-orange-500 text-white font-bold py-2.5 rounded-xl text-sm hover:bg-orange-600 transition-colors disabled:opacity-40 shadow-sm"
                >
                  Skanuj wszystkie braki
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTU */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => !isImporting && setIsImportModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-800 px-6 py-5 border-b border-slate-700 flex justify-between items-center text-white">
              <h3 className="text-sm font-extrabold uppercase tracking-widest flex items-center gap-2"><IconImport /> Import Bazy Danych</h3>
              <button onClick={() => !isImporting && setIsImportModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-5">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">Wymagane kolumny w arkuszu:</p>
                <p className="font-mono bg-white p-2 border rounded-lg text-slate-500 font-semibold shadow-inner leading-tight">Identyfikator, Model, Kraj, Miasto, Ulica, Klient, Przegląd</p>
                <p className="text-red-500 font-bold pt-1">Pamiętaj o odblokowaniu udostępniania arkusza!</p>
              </div>
              <form onSubmit={handleImportStations} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Link z Google Sheets</label>
                  <input required type="url" disabled={isImporting} value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} className="w-full px-4 py-2.5 border border-slate-300 rounded-xl text-sm focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all" placeholder="https://docs.google.com/..." />
                </div>
                {importStatus && <p className="text-[11px] text-[#58b347] font-bold bg-green-50 py-3 rounded-xl border border-green-100 text-center animate-pulse">{importStatus}</p>}
                <div className="flex gap-3 pt-3">
                  <button type="button" disabled={isImporting} onClick={() => setIsImportModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-2.5 rounded-xl text-sm hover:bg-slate-200 transition-colors">Anuluj</button>
                  <button type="submit" disabled={isImporting} className="flex-1 bg-[#58b347] text-white font-bold py-2.5 rounded-xl text-sm hover:bg-[#499b3a] disabled:bg-slate-400 transition-colors shadow-sm shadow-[#58b347]/20">{isImporting ? 'Przetwarzanie...' : 'Uruchom Import'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}