import React, { useState, useEffect, useMemo } from 'react';
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
  { key: 'select', label: '☑', visible: true, thClass: 'w-10 text-left', tdClass: '' },
  { key: 'actions', label: 'Akcje', visible: true, thClass: 'w-20 text-center text-slate-400', tdClass: 'text-center' },
  { key: 'name', label: 'Identyfikator', visible: true, sortableKey: 'name', thClass: 'min-w-[120px]', tdClass: 'font-bold text-slate-800' },
  { key: 'client', label: 'Klient', visible: true, sortableKey: 'client', thClass: 'min-w-[150px]', tdClass: 'text-slate-600 font-medium truncate max-w-[200px]' },
  { key: 'location', label: 'Lokalizacja', visible: true, sortableKey: 'city', thClass: 'min-w-[220px]', tdClass: 'text-slate-600 truncate max-w-[280px]' },
  { key: 'region', label: 'Region', visible: true, sortableKey: 'region', thClass: 'min-w-[110px]', tdClass: '' },
  { key: 'model', label: 'Model', visible: true, sortableKey: 'model', thClass: 'min-w-[120px]', tdClass: 'text-slate-600' },
  { key: 'inspection_date', label: 'Przegląd', visible: true, sortableKey: 'inspection_date', thClass: 'min-w-[100px]', tdClass: 'text-slate-600 font-medium' },
  { key: 'last_ticket_date', label: 'Zgłoszenie', visible: true, sortableKey: 'last_ticket_date', thClass: 'min-w-[110px]', tdClass: 'text-slate-500 font-mono text-[11px]' },
  { key: 'technician', label: 'Opiekun', visible: true, sortableKey: 'technician', thClass: 'min-w-[120px]', tdClass: '' },
  { key: 'status', label: 'Status / Zadanie', visible: true, sortableKey: 'status', thClass: 'min-w-[120px]', tdClass: '' },
  { key: 'additional_info', label: 'Dodatkowe info', visible: false, sortableKey: 'additional_info', thClass: 'min-w-[150px]', tdClass: 'text-slate-500 truncate max-w-[200px]' },
  { key: 'country', label: 'Kraj', visible: false, sortableKey: 'country', thClass: 'min-w-[100px]', tdClass: 'text-slate-600' },
  { key: 'lat', label: 'Szerokość GPS', visible: false, sortableKey: 'lat', thClass: 'min-w-[110px]', tdClass: 'text-slate-400 font-mono text-[11px]' },
  { key: 'lng', label: 'Długość GPS', visible: false, sortableKey: 'lng', thClass: 'min-w-[110px]', tdClass: 'text-slate-400 font-mono text-[11px]' },
  { key: 'created_at', label: 'Data dodania', visible: false, sortableKey: 'created_at', thClass: 'min-w-[120px]', tdClass: 'text-slate-500 text-[11px]' },
];

const IconSort = () => <svg className="w-3 h-3 inline-block ml-1 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>;
const IconTrash = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconEdit = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconImport = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const IconMapPin = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconNoLocation = () => <svg className="w-3.5 h-3.5 text-red-400 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m2 2 20 20"/><path d="M8.36 8.36a6 6 0 0 1 8.28 8.28"/><path d="M19.38 19.38A11.9 11.9 0 0 0 20 10c0-6-8-12-8-12s-3.72 2.79-5.83 6.64"/></svg>;
const IconColumns = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>;
const IconSearch = () => <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconArrowUp = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const IconArrowDown = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const IconRadar = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/><path d="M4 6h.01"/><path d="M2.29 9.62A10 10 0 1 0 21.31 8.35"/><path d="M16.24 7.76A6 6 0 1 0 8.23 16.67"/><path d="M12 18h.01"/><path d="M17.99 11.66A6 6 0 0 1 15.77 16.67"/><circle cx="12" cy="12" r="2"/><path d="m13.41 10.59 5.66-5.66"/></svg>;

const parseCSVLine = (line: string, delimiter: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result.map(v => v.replace(/^["']|["']$/g, '').trim());
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
  if (!dateString) return 'Brak';
  const diffTime = Math.abs(new Date().getTime() - new Date(dateString).getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? 'Dzisiaj' : `${diffDays} dni`;
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Awaria': return 'bg-red-50 text-red-700 border-red-200';
    case 'Uruchomienie': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Przegląd': return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'Zlecenie jakościowe': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Naprawa odpłatna': return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Brak akcji': default: return 'bg-green-50 text-[#58b347] border-green-200';
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

export default function StationsDatabase({ onFocusStation }: { onFocusStation: (station: Station) => void }) {
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

  // Nowe stany dla Geokodowania w tle
  const [isGeocodeModalOpen, setIsGeocodeModalOpen] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState('');

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isImportModalOpen && !isImporting) setIsImportModalOpen(false);
        if (isGeocodeModalOpen && !isGeocoding) setIsGeocodeModalOpen(false);
        if (isColumnSettingsOpen) setIsColumnSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImportModalOpen, isImporting, isColumnSettingsOpen, isGeocodeModalOpen, isGeocoding]);

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
    if (!confirm(`Na pewno usunąć wybrane stacje (${selectedIds.length})?`)) return;
    const { error } = await supabase.from('stations').delete().in('id', selectedIds);
    if (error) alert('Błąd usuwania. Użyj SQL Editora by usunąć wielkie zbiory danych naraz.');
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

  const handleGeocodeMissing = async () => {
    const missing = stations.filter(s => !s.lat || !s.lng);
    if (missing.length === 0) return;

    setIsGeocoding(true);
    
    // Grupowanie stacji po adresie (Oszczędność API)
    const addressGroups = new Map<string, typeof missing>();
    missing.forEach(s => {
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
    let failedUpdates = 0;

    const nominateHeaders = { 'User-Agent': 'EkoenFSMDispatchSystem/5.0 (dispatch@ekoen.pl)' };

    for (const [key, stList] of addressGroups.entries()) {
      processed++;
      setGeocodeStatus(`Szukanie adresu na mapie (${processed} z ${totalGroups} lokalizacji)...`);

      const [street, city, country] = key.split('|');
      let lat = null, lng = null;

      const cleanStreet = (str: string) => str.replace(/\b(MOP|Mop|mop|A2|A1|A4|S3|S5|Mop Chociszewo|MOP Rogoziniec)\b/g, '').replace(/\s+/g, ' ').trim();
      const sClean = cleanStreet(street);
      const cClean = city.trim();

      if (sClean || cClean) {
        try {
          await new Promise(r => setTimeout(r, 1200)); // Rate limit map
          let url = '';
          if (sClean && cClean) {
            url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${sClean}, ${cClean}, ${country}`)}`;
          } else if (cClean) {
            url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${cClean}, ${country}`)}`;
          }

          if (url) {
            const res = await fetch(url, { headers: nominateHeaders });
            if (res.ok) {
              const data = await res.json();
              if (data && data.length > 0 && !isNaN(parseFloat(data[0].lat))) {
                lat = parseFloat(data[0].lat);
                lng = parseFloat(data[0].lon);
              }
            }
          }
        } catch (e) {
          console.warn("Geocode error", e);
        }
      }

      if (lat && lng) {
        setGeocodeStatus(`Zapisywanie współrzędnych do bazy danych...`);
        for (const s of stList) {
          // Mikro-offset żeby stacje w tej samej lokalizacji (MOP) nie zlały się w jeden piksel
          const offsetLat = lat + (Math.random() - 0.5) * 0.0001;
          const offsetLng = lng + (Math.random() - 0.5) * 0.0001;
          const locationVal = `POINT(${offsetLng} ${offsetLat})`;
          
          await supabase.from('stations').update({ lat: offsetLat, lng: offsetLng, location: locationVal }).eq('id', s.id);
        }
        successUpdates += stList.length;
      } else {
        failedUpdates += stList.length;
      }
    }

    setGeocodeStatus(`Zakończono! Odnaleziono i przypisano: ${successUpdates}. Brakujące: ${failedUpdates} (Wymagają poprawy ręcznej).`);
    setIsGeocoding(false);
    fetchStations();
  };

  const renderCellContent = (station: Station, key: ColumnKey) => {
    switch (key) {
      case 'select':
        return <input type="checkbox" checked={selectedIds.includes(station.id)} onChange={() => toggleSelect(station.id)} className="rounded text-[#58b347] focus:ring-[#58b347] w-3.5 h-3.5" />;
      case 'actions':
        return (
          <div className="flex justify-center gap-1">
            <button onClick={() => onFocusStation(station)} disabled={!station.lat} className={`${station.lat ? 'text-slate-400 hover:text-blue-500 hover:bg-blue-50 cursor-pointer' : 'text-slate-200 cursor-not-allowed'} p-1 rounded transition-colors`} title={station.lat ? "Zlokalizuj na mapie" : "Brak współrzędnych"}><IconMapPin /></button>
            <button onClick={() => setEditingStation(station)} className="text-slate-400 hover:text-[#58b347] hover:bg-green-50 p-1 rounded transition-colors" title="Edytuj sprzęt"><IconEdit /></button>
          </div>
        );
      case 'name':
        return (
          <span className="cursor-pointer hover:text-[#58b347] transition-colors" onClick={() => setAdvancedDetailsStation(station)} title="Analityka stacji">
            {station.name}
          </span>
        );
      case 'client': return station.client || '-';
      case 'location':
        return (
          <div className="flex items-center gap-1.5">
            {(!station.lat || !station.lng) && <span title="Brak koordynatów GPS - uzupełnij ręcznie w edycji lub geokoduj"><IconNoLocation /></span>}
            {station.city ? `${station.city}, ${station.street}` : '-'}
          </div>
        );
      case 'region':
        return station.region ? <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200">{station.region}</span> : <span className="text-[10px] text-slate-400 italic">Brak</span>;
      case 'model': return station.model || '-';
      case 'inspection_date': return station.inspection_date || '-';
      case 'last_ticket_date': return getDaysSince(station.last_ticket_date);
      case 'technician':
        return station.technician ? <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">{station.technician}</span> : <span className="text-[10px] text-slate-400 italic">Brak pokrycia</span>;
      case 'status':
        return (
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(station.status)}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(station.status)}`} />
            {station.status}
          </span>
        );
      case 'additional_info': return station.additional_info || '-';
      case 'country': return station.country || '-';
      case 'lat': return station.lat ? station.lat.toFixed(6) : '-';
      case 'lng': return station.lng ? station.lng.toFixed(6) : '-';
      case 'created_at': return station.created_at ? new Date(station.created_at).toLocaleDateString() : '-';
      default: return null;
    }
  };

  // Import pomijający GPS (Surowy)
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
      alert("UWAGA: Twój arkusz jest zablokowany (Prywatny)!\n\nMusisz wejść w arkusz, kliknąć zielony przycisk 'Udostępnij' i zmienić dostęp na 'Każdy, kto ma link'.");
      setIsImporting(false); setImportStatus(''); return;
    }

    if (!csvText) {
      alert('Nie udało się pobrać danych z arkusza. Upewnij się, że ma poprawne uprawnienia (Każdy, kto ma link).');
      setIsImporting(false); setImportStatus(''); return;
    }

    const delimiter = csvText.split('\n')[0].includes(';') ? ';' : ',';
    
    const parsedData = parseCSV(csvText, delimiter);
    if (parsedData.length < 2) { alert('Arkusz nie zawiera wierszy z danymi.'); setIsImporting(false); return; }

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
      alert('Błąd: Nie odnaleziono nagłówka "Identyfikator" w arkuszu.');
      setIsImporting(false); return;
    }

    const rows = parsedData.slice(1);
    
    setImportStatus(`Mapowanie ${rows.length} rekordów...`);
    
    const finalPayloads = [];
    let emptyIdCount = 0; 

    for (let i = 0; i < rows.length; i++) {
      const vals = rows[i];
      const nameVal = vals[idxName];
      
      if (!nameVal) {
        emptyIdCount++;
        continue;
      }

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
    let failedChunks = 0; 
    let lastError = '';

    for (let i = 0; i < finalPayloads.length; i += 100) {
      const chunk = finalPayloads.slice(i, i + 100);
      setImportStatus(`Zapisywanie w bazie (${i + chunk.length}/${finalPayloads.length})...`);
      
      const { error } = await supabase.from('stations').insert(chunk);
      if (error) {
        console.error("Błąd zapisu Supabase paczki:", error);
        lastError = error.message;
        failedChunks++;
      } else {
        successCount += chunk.length;
      }
    }

    let alertMessage = `Gotowe! Zapisano w bazie: ${successCount} stacji.\n`;
    if (emptyIdCount > 0) alertMessage += `\n⚠️ Zignorowano ${emptyIdCount} wierszy, ponieważ miały pustą komórkę "Identyfikator" (np. puste wiersze na dole arkusza).`;
    if (failedChunks > 0) alertMessage += `\n❌ Baza danych odrzuciła ${failedChunks} paczek danych. Ostatni błąd: ${lastError}`;
    
    alert(alertMessage);

    setIsImporting(false); setIsImportModalOpen(false); setSheetUrl(''); setImportStatus('');
    fetchStations();
  };

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-50 z-40 p-6 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Baza stacji i regionów</h1>
          <p className="text-xs text-slate-500 mt-0.5">Wyświetlam {processedStations.length} z {stations.length} punktów</p>
        </div>
        
        <div className="flex gap-2 items-center">
          <div className="relative">
            <IconSearch />
            <input 
              type="text" 
              placeholder="Szukaj (klient, model, miasto...)" 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:border-[#58b347] w-[260px] shadow-sm"
            />
          </div>

          <div className="relative">
            <button onClick={() => setIsColumnSettingsOpen(!isColumnSettingsOpen)} className={`bg-white border text-slate-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors ${isColumnSettingsOpen ? 'border-[#58b347] text-[#58b347]' : 'border-slate-200'}`}>
              <IconColumns /> Widok
            </button>
            
            {isColumnSettingsOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                <div className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-3 py-2 border-b border-slate-100 flex justify-between items-center">
                  Zarządzaj kolumnami
                  <button onClick={() => setIsColumnSettingsOpen(false)} className="hover:text-slate-700">✕</button>
                </div>
                <div className="p-1 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200">
                  {columns.map((c, i) => (
                    <div key={c.key} className="flex items-center justify-between p-2 hover:bg-slate-50 rounded group">
                      <div className="flex items-center gap-2.5">
                        <input type="checkbox" checked={c.visible} onChange={() => toggleColumnVisibility(i)} className="rounded text-[#58b347] focus:ring-[#58b347] w-3.5 h-3.5 cursor-pointer" />
                        <span className={`text-xs font-medium ${c.visible ? 'text-slate-700' : 'text-slate-400'}`}>{c.label === '☑' ? 'Zaznaczanie' : c.label}</span>
                      </div>
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => moveColumn(i, -1)} disabled={i === 0} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded disabled:opacity-20"><IconArrowUp /></button>
                        <button onClick={() => moveColumn(i, 1)} disabled={i === columns.length - 1} className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded disabled:opacity-20"><IconArrowDown /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="w-px h-6 bg-slate-200 mx-1"></div>

          {missingGpsCount > 0 && (
            <button onClick={() => setIsGeocodeModalOpen(true)} className="bg-white border border-orange-300 text-orange-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-orange-50 flex items-center gap-2 shadow-sm transition-colors animate-pulse">
              <IconRadar /> Brak GPS ({missingGpsCount})
            </button>
          )}

          {selectedIds.length > 0 && (
            <button onClick={deleteSelected} className="bg-white border border-red-200 text-red-600 px-3 py-2 rounded-lg text-xs font-medium hover:bg-red-50 flex items-center gap-2 shadow-sm transition-colors">
              <IconTrash /> Usuń ({selectedIds.length})
            </button>
          )}
          <button onClick={() => setIsImportModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors">
            <IconImport /> Importuj
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-[#58b347] text-white px-4 py-2 rounded-lg text-xs font-medium hover:bg-[#499b3a] flex items-center gap-2 shadow-sm transition-colors">
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Nowy punkt
          </button>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200 min-h-[500px]">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                {columns.filter(c => c.visible).map(c => (
                  <th 
                    key={c.key} 
                    className={`py-3 px-3 ${c.thClass} ${c.sortableKey ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''}`}
                    onClick={() => c.sortableKey && handleSort(c.sortableKey)}
                  >
                    {c.key === 'select' ? (
                      <input type="checkbox" checked={selectedIds.length === processedStations.length && processedStations.length > 0} onChange={toggleSelectAll} className="rounded text-[#58b347] focus:ring-[#58b347] w-3.5 h-3.5" />
                    ) : (
                      <div className={`flex items-center gap-1 ${c.thClass.includes('text-center') ? 'justify-center' : ''}`}>
                        {c.label} {c.sortableKey && <IconSort />}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr><td colSpan={columns.filter(c => c.visible).length} className="p-8 text-center text-slate-400">Ładowanie bazy stacji...</td></tr>
              ) : processedStations.length === 0 ? (
                <tr><td colSpan={columns.filter(c => c.visible).length} className="p-8 text-center text-slate-400">Brak wyników do wyświetlenia.</td></tr>
              ) : (
                processedStations.map(station => (
                  <tr key={station.id} className={`hover:bg-slate-50/40 transition-colors ${selectedIds.includes(station.id) ? 'bg-green-50/10' : ''}`}>
                    {columns.filter(c => c.visible).map(c => (
                      <td key={c.key} className={`py-2.5 px-3 ${c.tdClass}`}>
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

      <AddStationModal isOpen={isAddModalOpen || !!editingStation} onClose={() => { setIsAddModalOpen(false); setEditingStation(null); }} initialLatLng={null} onSuccess={fetchStations} editingStation={editingStation} />

      {advancedDetailsStation && (
        <StationAnalytics station={advancedDetailsStation} onClose={() => setAdvancedDetailsStation(null)} />
      )}

      {/* Modal Geokodowania */}
      {isGeocodeModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => !isGeocoding && setIsGeocodeModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800">Lokalizowanie na mapie</h3>
              <button onClick={() => !isGeocoding && setIsGeocodeModalOpen(false)} disabled={isGeocoding} className="text-slate-400 hover:text-slate-600 disabled:opacity-50">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 space-y-2">
                <p>System spróbuje automatycznie odnaleźć koordynaty GPS dla <strong>{missingGpsCount} stacji</strong>.</p>
                <p className="text-slate-500 mt-1">Dzięki grupowaniu po adresach proces ten będzie znacznie szybszy i bezpieczniejszy dla darmowych serwerów map.</p>
              </div>
              
              {isGeocoding || geocodeStatus ? (
                <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 flex items-center gap-3">
                  {isGeocoding && <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>}
                  <p className="text-xs font-medium text-orange-700">{geocodeStatus}</p>
                </div>
              ) : null}

              <div className="flex gap-2 pt-2">
                <button type="button" disabled={isGeocoding} onClick={() => setIsGeocodeModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded text-sm hover:bg-slate-200 disabled:opacity-50">Zamknij</button>
                <button type="button" disabled={isGeocoding} onClick={handleGeocodeMissing} className="flex-1 bg-orange-500 text-white font-medium py-2.5 rounded text-sm hover:bg-orange-600 disabled:opacity-50">
                  {isGeocoding ? 'Przetwarzanie...' : 'Uruchom wyszukiwanie'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Szybkiego Importu */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => !isImporting && setIsImportModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800">Szybki Import Danych</h3>
              <button onClick={() => !isImporting && setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-700">Wymagane kolumny w arkuszu:</p>
                <p className="font-mono bg-white p-1.5 border rounded">Identyfikator, Model, Kraj, Miasto, Ulica, Klient</p>
                <p className="text-red-500 font-medium pt-1">Pamiętaj o ustawieniu udostępniania arkusza na &quot;Każdy, kto ma link&quot;!</p>
              </div>
              <form onSubmit={handleImportStations} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Link do Arkusza Google</label>
                  <input required type="url" disabled={isImporting} value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347]" />
                </div>
                {importStatus && <p className="text-[11px] text-[#58b347] font-medium bg-green-50 p-2.5 rounded border border-green-100 animate-pulse">{importStatus}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" disabled={isImporting} onClick={() => setIsImportModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded text-sm hover:bg-slate-200">Anuluj</button>
                  <button type="submit" disabled={isImporting} className="flex-1 bg-[#58b347] text-white font-medium py-2.5 rounded text-sm hover:bg-[#499b3a] disabled:bg-slate-400">{isImporting ? 'Import...' : 'Uruchom'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}