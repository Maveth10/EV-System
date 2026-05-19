import React, { useState, useEffect } from 'react';
import { supabase } from '../app/supabase';
import AddStationModal from './AddStationModal';

export type Station = {
  id: string;
  name: string;
  client: string | null;
  model: string | null;
  inspection_date: string | null;
  last_ticket_date: string | null;
  technicians_in_range: string | null;
  technician: string | null;
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
const IconEdit = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconImport = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;

const getDaysSince = (dateString: string | null) => {
  if (!dateString) return 'Brak zgłoszeń';
  const diffTime = Math.abs(new Date().getTime() - new Date(dateString).getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return diffDays === 0 ? 'Dzisiaj' : `${diffDays} dni`;
};

export default function StationsDatabase({ onFocusStation }: { onFocusStation: (station: Station) => void }) {
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<Station | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const fetchStations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase.from('stations').select('*, lat, lng').order('name', { ascending: true });
    if (!error && data) setStations(data);
    setIsLoading(false);
  };

  useEffect(() => { fetchStations(); }, []);

  // Zamykanie na ESC dla modalu importu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isImportModalOpen && !isImporting) {
        setIsImportModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isImportModalOpen, isImporting]);

  const handleSort = (key: keyof Station) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedStations = React.useMemo(() => {
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
    setImportStatus('Przeszukiwanie zakładek w arkuszu...');

    const candidates = ['stacje', 'stations', 'arkusz1', 'sheet1'];
    let csvText = '';
    let foundTab = '';

    for (const tab of candidates) {
      try {
        const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`);
        if (res.ok) {
          const text = await res.text();
          if (text && !text.includes('<!DOCTYPE html>') && text.includes(',')) {
            csvText = text; foundTab = tab; break;
          }
        }
      } catch (err) {}
    }

    if (!csvText) {
      try {
        const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`);
        if (res.ok) {
          const text = await res.text();
          if (text && !text.includes('<!DOCTYPE html>')) { csvText = text; foundTab = 'Domyślna (Pierwsza)'; }
        }
      } catch (err) {}
    }

    if (!csvText) {
      alert('Nie udało się pobrać danych. Upewnij się, że arkusz jest udostępniony publicznie jako "Każdy mający link może wyświetlać".');
      setIsImporting(false); setImportStatus(''); return;
    }

    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) { alert('Arkusz nie zawiera wierszy z danymi.'); setIsImporting(false); return; }

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

    const getColIndex = (names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));
    const idxName = getColIndex(['identyfikator', 'nazwa', 'name']);
    const idxClient = getColIndex(['klient', 'client']);
    const idxModel = getColIndex(['model']);
    const idxDate = getColIndex(['przegląd', 'data', 'inspection']);
    const idxCountry = getColIndex(['kraj', 'country']);
    const idxCity = getColIndex(['miasto', 'city']);
    const idxStreet = getColIndex(['ulica', 'street']);

    if (idxName === -1) {
      alert('Nie odnaleziono kluczowej kolumny identyfikatora stacji (np. "Identyfikator" lub "Name").');
      setIsImporting(false); return;
    }

    let successCount = 0;
    const rows = lines.slice(1);

    for (let i = 0; i < rows.length; i++) {
      const vals = rows[i].split(delimiter).map(v => v.replace(/^["']|["']$/g, '').trim());
      const nameVal = vals[idxName];
      if (!nameVal) continue;

      const cityVal = idxCity !== -1 ? vals[idxCity] : '';
      const streetVal = idxStreet !== -1 ? vals[idxStreet] : '';
      const countryVal = idxCountry !== -1 ? vals[idxCountry] : 'Polska';

      setImportStatus(`Import wiersza ${i + 1} z ${rows.length}: Lokalizowanie stacji "${nameVal}"...`);

      let lat = null, lng = null;
      if (cityVal && streetVal) {
        try {
          await new Promise(r => setTimeout(r, 1000));
          const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(`${streetVal}, ${cityVal}, ${countryVal}`)}`);
          const geoData = await geoRes.json();
          if (geoData && geoData.length > 0) {
            lat = parseFloat(geoData[0].lat); lng = parseFloat(geoData[0].lon);
          }
        } catch (e) {}
      }

      const payload: any = {
        name: nameVal,
        client: idxClient !== -1 && vals[idxClient] ? vals[idxClient] : null,
        model: idxModel !== -1 && vals[idxModel] ? vals[idxModel] : null,
        inspection_date: idxDate !== -1 && vals[idxDate] ? vals[idxDate] : null,
        status: 'Działa',
        country: countryVal, city: cityVal || null, street: streetVal || null,
        additional_info: null
      };
      if (lat && lng) payload.location = `POINT(${lng} ${lat})`;

      const { error } = await supabase.from('stations').insert([payload]);
      if (!error) successCount++;
    }

    alert(`Zaimportowano pomyślnie ${successCount} z ${rows.length} stacji.`);
    setIsImporting(false); setIsImportModalOpen(false); setSheetUrl(''); setImportStatus('');
    fetchStations();
  };

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-50 z-40 p-8 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Baza stacji</h1>
          <p className="text-sm text-slate-500 mt-1">Zarządzaj flotą punktów ładowania ({stations.length} stacji)</p>
        </div>
        <div className="flex gap-3">
          {selectedIds.length > 0 && (
            <button onClick={deleteSelected} className="bg-white border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-2 shadow-sm transition-colors">
              <IconTrash /> Usuń wybrane ({selectedIds.length})
            </button>
          )}
          <button onClick={() => setIsImportModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors">
            <IconImport /> Importuj
          </button>
          <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Nowa stacja
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 w-24 text-left">
                  <input type="checkbox" checked={selectedIds.length === stations.length && stations.length > 0} onChange={toggleSelectAll} className="rounded" />
                </th>
                <th onClick={() => handleSort('name')} className="p-4 cursor-pointer hover:bg-slate-100">Identyfikator <IconSort /></th>
                <th onClick={() => handleSort('client')} className="p-4 cursor-pointer hover:bg-slate-100">Klient <IconSort /></th>
                <th onClick={() => handleSort('city')} className="p-4 cursor-pointer hover:bg-slate-100">Miasto / Ulica <IconSort /></th>
                <th onClick={() => handleSort('model')} className="p-4 cursor-pointer hover:bg-slate-100">Model <IconSort /></th>
                <th onClick={() => handleSort('inspection_date')} className="p-4 cursor-pointer hover:bg-slate-100">Przegląd <IconSort /></th>
                <th onClick={() => handleSort('last_ticket_date')} className="p-4 cursor-pointer hover:bg-slate-100">Ost. zgłoszenie <IconSort /></th>
                <th className="p-4">W zasięgu</th>
                <th onClick={() => handleSort('status')} className="p-4 cursor-pointer hover:bg-slate-100">Status <IconSort /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400 text-sm">Ładowanie danych...</td></tr>
              ) : sortedStations.length === 0 ? (
                <tr><td colSpan={9} className="p-8 text-center text-slate-400 text-sm">Brak stacji w bazie danych.</td></tr>
              ) : (
                sortedStations.map(station => (
                  <tr key={station.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(station.id) ? 'bg-blue-50/30' : ''}`}>
                    <td className="p-4 flex items-center gap-4">
                      <input type="checkbox" checked={selectedIds.includes(station.id)} onChange={() => toggleSelect(station.id)} className="rounded" />
                      <button onClick={() => setEditingStation(station)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Edytuj stację">
                        <IconEdit />
                      </button>
                    </td>
                    <td className="p-4 font-bold text-blue-600 hover:text-blue-800 text-sm cursor-pointer underline decoration-blue-200 underline-offset-4" onClick={() => onFocusStation(station)}>
                      {station.name}
                    </td>
                    <td className="p-4 text-slate-600 text-sm font-medium">{station.client || '-'}</td>
                    <td className="p-4 text-slate-600 text-sm">{station.city ? `${station.city}, ${station.street}` : '-'}</td>
                    <td className="p-4 text-slate-600 text-sm">{station.model || '-'}</td>
                    <td className="p-4 text-slate-600 text-sm">{station.inspection_date || '-'}</td>
                    <td className="p-4 text-slate-600 text-sm font-mono">{getDaysSince(station.last_ticket_date)}</td>
                    <td className="p-4">
                      {station.technicians_in_range && station.technicians_in_range !== 'Brak w zasięgu' ? (
                        <div className="flex flex-wrap gap-1">
                          {station.technicians_in_range.split(', ').map((tech, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {tech}
                            </span>
                          ))}
                        </div>
                      ) : <span className="text-[10px] text-slate-400 italic">Brak pokrycia</span>}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${station.status === 'Awaria' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${station.status === 'Awaria' ? 'bg-red-500' : 'bg-green-500'}`} />
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

      {isImportModalOpen && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={() => !isImporting && setIsImportModalOpen(false)} // Zamykanie na kliknięcie w tło
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()} // Blokada zamykania wewnątrz okna
          >
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800">Import stacji z Google Sheets</h3>
              <button onClick={() => !isImporting && setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-700">Wymagane nagłówki w 1. wierszu:</p>
                <p className="font-mono bg-white p-1.5 border rounded">Identyfikator, Klient, Model, Miasto, Ulica, Kraj, Przegląd</p>
                <p className="text-[11px] leading-relaxed text-slate-500">Arkusz musi być publiczny. Aplikacja sprawdzi karty: <b>Stacje</b>, <b>Stations</b>, <b>Arkusz1</b>.</p>
              </div>
              <form onSubmit={handleImportStations} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Link do Arkusza Google</label>
                  <input required type="url" disabled={isImporting} value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} placeholder="https://docs.google.com/spreadsheets/d/..." className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500" />
                </div>
                {importStatus && <p className="text-[11px] text-blue-600 font-medium bg-blue-50 p-2.5 rounded border border-blue-100 animate-pulse">{importStatus}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" disabled={isImporting} onClick={() => setIsImportModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded text-sm hover:bg-slate-200">Anuluj</button>
                  <button type="submit" disabled={isImporting} className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded text-sm hover:bg-blue-700 disabled:bg-slate-400">{isImporting ? 'Importowanie...' : 'Uruchom import'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}