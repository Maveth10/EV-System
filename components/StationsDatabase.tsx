import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../app/supabase';
import AddStationModal from './AddStationModal';
import StationAnalytics from './StationAnalytics';

export type Station = {
  id: string;
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

const IconSort = () => <svg className="w-3 h-3 inline-block ml-1 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>;
const IconTrash = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconEdit = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconImport = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const IconMapPin = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;

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
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [advancedDetailsStation, setAdvancedDetailsStation] = useState<Station | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

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
      if (e.key === 'Escape' && isImportModalOpen && !isImporting) setIsImportModalOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImportModalOpen, isImporting]);

  const handleSort = (key: keyof Station) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedStations = useMemo(() => {
    if (!sortConfig) return stations;
    return [...stations].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [stations, sortConfig]);

  const toggleSelectAll = () => {
    if (selectedIds.length === stations.length) setSelectedIds([]);
    else setSelectedIds(stations.map(s => s.id));
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(selId => selId !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const deleteSelected = async () => {
    if (!confirm(`Na pewno usunąć wybrane stacje (${selectedIds.length})?`)) return;
    const { error } = await supabase.from('stations').delete().in('id', selectedIds);
    if (error) alert('Błąd usuwania: ' + error.message);
    else { setSelectedIds([]); fetchStations(); }
  };

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

    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) { alert('Arkusz nie zawiera wierszy z danymi.'); setIsImporting(false); return; }

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = parseCSVLine(lines[0], delimiter).map(h => h.toLowerCase());

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

    const rows = lines.slice(1);
    const nominateHeaders = { 'User-Agent': 'EkoenFSMDispatchSystem/4.0 (dispatch@ekoen.pl)' };

    // --- FAZA 1: Budowanie paczki i znajdowanie unikalnych lokalizacji ---
    const recordsToProcess = [];
    const uniqueAddresses = new Set<string>();
    const addressCache = new Map<string, { lat: number, lng: number, found: boolean }>();

    for (let i = 0; i < rows.length; i++) {
      const vals = parseCSVLine(rows[i], delimiter);
      const nameVal = vals[idxName];
      if (!nameVal) continue;

      let cityVal = idxCity !== -1 ? vals[idxCity] : '';
      let streetVal = idxStreet !== -1 ? vals[idxStreet] : '';
      let countryVal = idxCountry !== -1 ? vals[idxCountry] : 'Polska';

      const addressKey = `${streetVal}|${cityVal}|${countryVal}`;
      if (streetVal || cityVal) {
        uniqueAddresses.add(addressKey);
      }

      recordsToProcess.push({ nameVal, vals, addressKey, cityVal, streetVal, countryVal });
    }

    // --- FAZA 2: Błyskawiczne geokodowanie TYLKO unikalnych adresów ---
    let processedAddresses = 0;
    for (const addrKey of uniqueAddresses) {
      processedAddresses++;
      setImportStatus(`Analiza lokalizacji na mapie (${processedAddresses}/${uniqueAddresses.size} MOP-ów)...`);
      
      const [street, city, country] = addrKey.split('|');
      let lat = 52.0691, lng = 19.4804, found = false;

      try {
        await new Promise(r => setTimeout(r, 1100)); // Bezpieczny limit dla API

        // Czyszczenie MOPów dla lepszej wyszukiwalności
        const cleanStreet = (str: string) => str.replace(/\b(MOP|Mop|mop|A2|A1|A4|S3|S5|Mop Chociszewo|MOP Rogoziniec)\b/g, '').replace(/\s+/g, ' ').trim();
        const sClean = cleanStreet(street);
        const cClean = city ? city.trim() : '';

        // Próba 1: Pełny adres
        if (sClean && cClean) {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${sClean}, ${cClean}, ${country}`)}`, { headers: nominateHeaders });
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0 && !isNaN(parseFloat(data[0].lat))) { 
              lat = parseFloat(data[0].lat); lng = parseFloat(data[0].lon); found = true; 
            }
          }
        }

        // Próba 2: Samo miasto
        if (!found && cClean) {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${cClean}, ${country}`)}`, { headers: nominateHeaders });
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0 && !isNaN(parseFloat(data[0].lat))) { 
              lat = parseFloat(data[0].lat); lng = parseFloat(data[0].lon); found = true; 
            }
          }
        }
      } catch (e) {
        console.warn("Serwer odrzucił zapytanie:", e);
      }

      addressCache.set(addrKey, { lat, lng, found });
    }

    // --- FAZA 3: Składanie gotowych obiektów (Payloads) ---
    setImportStatus(`Generowanie geometrii dla bazy danych...`);
    const finalPayloads = recordsToProcess.map(rec => {
      const cached = addressCache.get(rec.addressKey) || { lat: 52.0691, lng: 19.4804, found: false };
      
      let finalLat = cached.lat;
      let finalLng = cached.lng;

      // Zabezpieczenie przed nałożeniem się wtyczek w jeden punkt (dajemy losowy offset 5 metrów)
      if (cached.found) {
        finalLat += (Math.random() - 0.5) * 0.0001;
        finalLng += (Math.random() - 0.5) * 0.0001;
      } else {
        // Jeśli nie znaleziono na GPS, zrzucamy losowo wokół centrum Polski z dużym rozstrzałem, żeby uniknąć błędu WKT
        finalLat += (Math.random() - 0.5) * 2.5;
        finalLng += (Math.random() - 0.5) * 3.5;
      }

      return {
        name: rec.nameVal,
        client: idxClient !== -1 && rec.vals[idxClient] ? rec.vals[idxClient] : null,
        model: idxModel !== -1 && rec.vals[idxModel] ? rec.vals[idxModel] : null,
        inspection_date: idxDate !== -1 && rec.vals[idxDate] ? rec.vals[idxDate] : null,
        status: 'Brak akcji',
        country: rec.countryVal,
        city: rec.cityVal,
        street: rec.streetVal,
        lat: finalLat,
        lng: finalLng,
        location: `POINT(${finalLng} ${finalLat})` // Baza z automatu sama to sparsuje na GEOMETRY
      };
    });

    // --- FAZA 4: Batch Insert do Supabase (Błyskawiczny zapis w paczkach) ---
    let successCount = 0;
    let lastError = '';

    for (let i = 0; i < finalPayloads.length; i += 100) {
      const chunk = finalPayloads.slice(i, i + 100);
      setImportStatus(`Zapisywanie w bazie (${i + chunk.length}/${finalPayloads.length})...`);
      
      const { error } = await supabase.from('stations').insert(chunk);
      if (error) {
        console.error("Błąd zapisu Supabase:", error);
        lastError = error.message;
      } else {
        successCount += chunk.length;
      }
    }

    if (lastError) {
      alert(`Wystąpił błąd w trakcie zapisu! Zapisano ${successCount} stacji. Błąd bazy: ${lastError}`);
    } else {
      alert(`Super! Zaimportowano wszystkie ${successCount} stacji w trybie Turbo.`);
    }

    setIsImporting(false); setIsImportModalOpen(false); setSheetUrl(''); setImportStatus('');
    fetchStations();
  };

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-50 z-40 p-6 overflow-y-auto">
      <div className="max-w-[1600px] mx-auto flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Baza stacji i regionów</h1>
          <p className="text-xs text-slate-500 mt-0.5">Pełna lista infrastruktury Ekoen ({stations.length} punktów)</p>
        </div>
        <div className="flex gap-2">
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
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-slate-200">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-10 text-left">
                  <input type="checkbox" checked={selectedIds.length === stations.length && stations.length > 0} onChange={toggleSelectAll} className="rounded text-[#58b347] focus:ring-[#58b347] w-3.5 h-3.5" />
                </th>
                <th className="py-3 px-2 w-20 text-center text-slate-400">Akcje</th>
                <th onClick={() => handleSort('name')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 min-w-[120px]">Identyfikator <IconSort /></th>
                <th onClick={() => handleSort('client')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 min-w-[150px]">Klient <IconSort /></th>
                <th onClick={() => handleSort('city')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 min-w-[220px]">Lokalizacja <IconSort /></th>
                <th onClick={() => handleSort('region')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 min-w-[110px]">Region <IconSort /></th>
                <th onClick={() => handleSort('model')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 min-w-[120px]">Model <IconSort /></th>
                <th onClick={() => handleSort('inspection_date')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 min-w-[100px]">Przegląd <IconSort /></th>
                <th onClick={() => handleSort('last_ticket_date')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 min-w-[110px]">Zgłoszenie <IconSort /></th>
                <th onClick={() => handleSort('technician')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 min-w-[120px]">Opiekun <IconSort /></th>
                <th onClick={() => handleSort('status')} className="py-3 px-3 cursor-pointer hover:bg-slate-100 min-w-[120px]">Status / Zadanie <IconSort /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {isLoading ? (
                <tr><td colSpan={11} className="p-8 text-center text-slate-400">Ładowanie bazy stacji...</td></tr>
              ) : stations.length === 0 ? (
                <tr><td colSpan={11} className="p-8 text-center text-slate-400">Brak stacji w bazie danych.</td></tr>
              ) : (
                sortedStations.map(station => (
                  <tr key={station.id} className={`hover:bg-slate-50/40 transition-colors ${selectedIds.includes(station.id) ? 'bg-green-50/10' : ''}`}>
                    <td className="py-2.5 px-4">
                      <input type="checkbox" checked={selectedIds.includes(station.id)} onChange={() => toggleSelect(station.id)} className="rounded text-[#58b347] focus:ring-[#58b347] w-3.5 h-3.5" />
                    </td>
                    <td className="py-2.5 px-2 text-center">
                      <div className="flex justify-center gap-1">
                        <button onClick={() => onFocusStation(station)} className="text-slate-400 hover:text-blue-500 hover:bg-blue-50 p-1 rounded transition-colors" title="Zlokalizuj na mapie"><IconMapPin /></button>
                        <button onClick={() => setEditingStation(station)} className="text-slate-400 hover:text-[#58b347] hover:bg-green-50 p-1 rounded transition-colors" title="Edytuj sprzęt"><IconEdit /></button>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-slate-800">
                      <span className="cursor-pointer hover:text-[#58b347] transition-colors" onClick={() => setAdvancedDetailsStation(station)} title="Analityka stacji">
                        {station.name}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium truncate max-w-[200px]">{station.client || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-600 truncate max-w-[280px]">{station.city ? `${station.city}, ${station.street}` : '-'}</td>
                    
                    <td className="py-2.5 px-3">
                      {station.region ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold border border-slate-200">{station.region}</span>
                      ) : <span className="text-[10px] text-slate-400 italic">Brak</span>}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600">{station.model || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-600 font-medium">{station.inspection_date || '-'}</td>
                    <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{getDaysSince(station.last_ticket_date)}</td>
                    
                    <td className="py-2.5 px-3">
                      {station.technician ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          {station.technician}
                        </span>
                      ) : <span className="text-[10px] text-slate-400 italic">Brak pokrycia</span>}
                    </td>

                    <td className="py-2.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(station.status)}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${getStatusDot(station.status)}`} />
                        {station.status}
                      </span>
                    </td>
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

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => !isImporting && setIsImportModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800">Import stacji z Google Sheets</h3>
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