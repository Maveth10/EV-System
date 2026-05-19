import React, { useState, useEffect } from 'react';
import { supabase } from '../app/supabase';

export type Technician = {
  id: string;
  name: string;
  color: string;
  phone: string | null;
  car_plate: string | null;
  sep_expiry: string | null;
};

type SortConfig = { key: keyof Technician | 'stationCount'; direction: 'asc' | 'desc' } | null;

const IconSort = () => <svg className="w-3 h-3 inline-block ml-1 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>;
const IconTrash = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconEdit = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconImport = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;

const getSepStatus = (dateString: string | null) => {
  if (!dateString) return { text: 'Brak danych', color: 'text-slate-400', bg: 'bg-slate-100' };
  const expiryDate = new Date(dateString);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `Wygasły (${Math.abs(diffDays)} dni temu)`, color: 'text-red-700', bg: 'bg-red-50 border-red-200' };
  if (diffDays <= 30) return { text: `Wygasa za ${diffDays} dni`, color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' };
  return { text: dateString, color: 'text-green-700', bg: 'bg-green-50 border-green-200' };
};

export default function TechniciansDatabase() {
  const [technicians, setTechnicians] = useState<(Technician & { stationCount: number })[]>([]);
  const [allStations, setAllStations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeTechDetails, setActiveTechDetails] = useState<any | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [newTech, setNewTech] = useState({ name: '', phone: '', car_plate: '', sep_expiry: '', color: '#3b82f6' });

  const fetchData = async () => {
    setIsLoading(true);
    const [techRes, statRes] = await Promise.all([
      supabase.from('technicians').select('id, name, color, phone, car_plate, sep_expiry'),
      supabase.from('stations').select('name, city, street, technician, status')
    ]);

    if (techRes.data && statRes.data) {
      setAllStations(statRes.data);
      const enrichedTechs = techRes.data.map(tech => {
        const count = statRes.data.filter(s => s.technician === tech.name).length;
        return { ...tech, stationCount: count };
      });
      setTechnicians(enrichedTechs);
      if (activeTechDetails) {
        const updated = enrichedTechs.find(t => t.id === activeTechDetails.id);
        if (updated) setActiveTechDetails(updated);
      }
    }
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Obsługa ESC dla wszystkich trzech okien
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) setIsAddModalOpen(false);
        if (activeTechDetails) setActiveTechDetails(null);
        if (isImportModalOpen && !isImporting) setIsImportModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, activeTechDetails, isImportModalOpen, isImporting]);

  const handleSort = (key: keyof Technician | 'stationCount') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedTechs = React.useMemo(() => {
    if (!sortConfig) return technicians;
    return [...technicians].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [technicians, sortConfig]);

  const toggleSelectAll = () => {
    if (selectedIds.length === technicians.length) setSelectedIds([]);
    else setSelectedIds(technicians.map(t => t.id));
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(selId => selId !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const deleteSelected = async () => {
    if (!confirm(`Na pewno usunąć wybranych techników (${selectedIds.length})?`)) return;
    const { error } = await supabase.from('technicians').delete().in('id', selectedIds);
    if (error) alert('Błąd usuwania: ' + error.message);
    else { setSelectedIds([]); fetchData(); }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTechDetails) return;
    const { error } = await supabase.from('technicians')
      .update({ phone: activeTechDetails.phone || null, car_plate: activeTechDetails.car_plate || null, sep_expiry: activeTechDetails.sep_expiry || null })
      .eq('id', activeTechDetails.id);
    
    if (error) alert('Błąd aktualizacji: ' + error.message);
    else { setActiveTechDetails(null); fetchData(); }
  };

  const handleAddTech = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('technicians').insert([{
      name: newTech.name, 
      phone: newTech.phone || null, 
      car_plate: newTech.car_plate || null, 
      sep_expiry: newTech.sep_expiry || null, 
      color: newTech.color
    }]);
    
    if (error) alert('Błąd dodawania: ' + error.message);
    else { setIsAddModalOpen(false); setNewTech({ name: '', phone: '', car_plate: '', sep_expiry: '', color: '#3b82f6' }); fetchData(); }
  };

  const handleImportTechs = async (e: React.FormEvent) => {
    e.preventDefault();
    const matches = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = matches ? matches[1] : null;

    if (!spreadsheetId) { alert('Nieprawidłowy link do Arkusza Google.'); return; }

    setIsImporting(true);
    setImportStatus('Przeszukiwanie zakładek w arkuszu...');

    const candidates = ['technicy', 'technicians', 'arkusz1', 'sheet1'];
    let csvText = '';
    let foundTab = '';

    for (const tab of candidates) {
      try {
        const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`);
        if (res.ok) {
          const text = await res.text();
          if (text && !text.includes('<!DOCTYPE html>') && text.includes(',')) { csvText = text; foundTab = tab; break; }
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
      alert('Nie udało się pobrać danych. Upewnij się, że arkusz jest udostępniony publicznie.');
      setIsImporting(false); setImportStatus(''); return;
    }

    const lines = csvText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) { alert('Arkusz nie zawiera wierszy z danymi.'); setIsImporting(false); return; }

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const headers = lines[0].split(delimiter).map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());

    const getColIndex = (names: string[]) => headers.findIndex(h => names.some(n => h.includes(n)));
    const idxName = getColIndex(['imię', 'nazwisko', 'name', 'technik']);
    const idxPhone = getColIndex(['telefon', 'phone', 'kontakt']);
    const idxPlate = getColIndex(['pojazd', 'rejestracja', 'car_plate', 'nr']);
    const idxSep = getColIndex(['sep', 'ważność', 'expiry']);

    if (idxName === -1) {
      alert('Nie odnaleziono kolumny z imieniem i nazwiskiem (np. "Imię i nazwisko" lub "Name").');
      setIsImporting(false); return;
    }

    let successCount = 0;
    const rows = lines.slice(1);
    const colorsPool = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

    for (let i = 0; i < rows.length; i++) {
      const vals = rows[i].split(delimiter).map(v => v.replace(/^["']|["']$/g, '').trim());
      const nameVal = vals[idxName];
      if (!nameVal) continue;

      setImportStatus(`Import wiersza ${i + 1} z ${rows.length}: Rejestrowanie "${nameVal}"...`);

      const payload = {
        name: nameVal,
        phone: idxPhone !== -1 && vals[idxPhone] ? vals[idxPhone] : null,
        car_plate: idxPlate !== -1 && vals[idxPlate] ? vals[idxPlate].toUpperCase() : null,
        sep_expiry: idxSep !== -1 && vals[idxSep] ? vals[idxSep] : null,
        color: colorsPool[i % colorsPool.length]
      };

      const { error } = await supabase.from('technicians').insert([payload]);
      if (!error) successCount++;
    }

    alert(`Zaimportowano pomyślnie ${successCount} z ${rows.length} techników.`);
    setIsImporting(false); setIsImportModalOpen(false); setSheetUrl(''); setImportStatus('');
    fetchData();
  };

  const assignedStations = activeTechDetails ? allStations.filter(s => s.technician === activeTechDetails.name) : [];

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-50 z-40 p-8 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Zasoby techniczne</h1>
          <p className="text-sm text-slate-500 mt-1">Zarządzaj flotą i uprawnieniami zespołu ({technicians.length} techników)</p>
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
            Nowy technik
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 w-24 text-left"><input type="checkbox" checked={selectedIds.length === technicians.length && technicians.length > 0} onChange={toggleSelectAll} className="rounded" /></th>
                <th className="p-4 text-center w-16">Kolor</th>
                <th onClick={() => handleSort('name')} className="p-4 cursor-pointer hover:bg-slate-100">Imię i nazwisko <IconSort /></th>
                <th onClick={() => handleSort('phone')} className="p-4 cursor-pointer hover:bg-slate-100">Telefon kontaktowy <IconSort /></th>
                <th onClick={() => handleSort('car_plate')} className="p-4 cursor-pointer hover:bg-slate-100">Pojazd (Nr rej.) <IconSort /></th>
                <th onClick={() => handleSort('stationCount')} className="p-4 cursor-pointer hover:bg-slate-100 text-center">Przydzielone stacje <IconSort /></th>
                <th onClick={() => handleSort('sep_expiry')} className="p-4 cursor-pointer hover:bg-slate-100">Ważność SEP <IconSort /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400 text-sm">Ładowanie danych zespołu...</td></tr>
              ) : sortedTechs.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-slate-400 text-sm">Brak wprowadzonych techników.</td></tr>
              ) : (
                sortedTechs.map(tech => {
                  const sep = getSepStatus(tech.sep_expiry);
                  return (
                    <tr key={tech.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(tech.id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="p-4 flex items-center gap-4">
                        <input type="checkbox" checked={selectedIds.includes(tech.id)} onChange={() => toggleSelect(tech.id)} className="rounded" />
                        <button onClick={() => setActiveTechDetails(tech)} className="text-slate-400 hover:text-blue-600 transition-colors" title="Zarządzaj technikiem"><IconEdit /></button>
                      </td>
                      <td className="p-4 text-center"><div className="w-4 h-4 rounded-full mx-auto shadow-sm" style={{ backgroundColor: tech.color }} /></td>
                      <td className="p-4 font-bold text-blue-600 hover:text-blue-800 text-sm cursor-pointer underline decoration-blue-200 underline-offset-4" onClick={() => setActiveTechDetails(tech)}>{tech.name}</td>
                      <td className="p-4 text-slate-600 text-sm font-mono">{tech.phone || '-'}</td>
                      <td className="p-4 text-slate-600 text-sm font-mono uppercase">{tech.car_plate || '-'}</td>
                      <td className="p-4 text-center"><span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">{tech.stationCount}</span></td>
                      <td className="p-4"><span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${sep.bg} ${sep.color}`}>{sep.text}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DODAWANIA */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-sm overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800">Nowy pracownik techniczny</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddTech} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Imię i nazwisko *</label>
                <input required type="text" value={newTech.name} onChange={(e) => setNewTech({...newTech, name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Kolor operacyjny</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={newTech.color} onChange={(e) => setNewTech({...newTech, color: e.target.value})} className="w-10 h-10 p-0.5 border border-slate-200 rounded cursor-pointer" />
                  <span className="text-xs text-slate-500 font-mono uppercase">{newTech.color}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Numer telefonu</label>
                <input type="tel" value={newTech.phone} onChange={(e) => setNewTech({...newTech, phone: e.target.value})} placeholder="+48..." className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Pojazd (Nr rejestracyjny)</label>
                <input type="text" value={newTech.car_plate} onChange={(e) => setNewTech({...newTech, car_plate: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500 uppercase" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ważność uprawnień SEP</label>
                <input type="date" value={newTech.sep_expiry} onChange={(e) => setNewTech({...newTech, sep_expiry: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-blue-500" />
              </div>
              <div className="pt-3 flex gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded text-sm hover:bg-slate-200 transition-colors">Anuluj</button>
                <button type="submit" className="flex-1 bg-blue-600 text-white font-medium py-2.5 rounded text-sm hover:bg-blue-700 transition-colors">Dodaj technika</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SZCZEGÓŁÓW / EDYCJI */}
      {activeTechDetails && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={() => setActiveTechDetails(null)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: activeTechDetails.color }} /><h3 className="text-sm font-semibold text-slate-800">Karta zasobu: {activeTechDetails.name}</h3></div>
              <button onClick={() => setActiveTechDetails(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="overflow-y-auto p-5 space-y-6 shrink">
              <form id="tech-edit-form" onSubmit={handleEditSave} className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium text-slate-600 mb-1">Numer telefonu</label><input type="tel" value={activeTechDetails.phone || ''} onChange={(e) => setActiveTechDetails({...activeTechDetails, phone: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm" /></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium text-slate-600 mb-1">Pojazd (Nr rejestracyjny)</label><input type="text" value={activeTechDetails.car_plate || ''} onChange={(e) => setActiveTechDetails({...activeTechDetails, car_plate: e.target.value.toUpperCase()})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm uppercase" /></div>
                <div className="col-span-2 sm:col-span-1"><label className="block text-xs font-medium text-slate-600 mb-1">Ważność uprawnień SEP</label><input type="date" value={activeTechDetails.sep_expiry || ''} onChange={(e) => setActiveTechDetails({...activeTechDetails, sep_expiry: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm" /></div>
              </form>
              <hr className="border-slate-100" />
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Podległe stacje ładowania ({assignedStations.length})</h4>
                {assignedStations.length === 0 ? <p className="text-xs text-slate-500 italic bg-slate-50 p-4 rounded-lg border border-slate-100">Brak stacji pod opieką.</p> : (
                  <div className="border border-slate-200 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead><tr className="bg-slate-50 font-semibold text-slate-500 border-b border-slate-200"><th className="p-2.5">Identyfikator</th><th className="p-2.5">Lokalizacja</th><th className="p-2.5 text-right">Status</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">{assignedStations.map((station, i) => (<tr key={i} className="hover:bg-slate-50/60"><td className="p-2.5 font-semibold text-slate-700">{station.name}</td><td className="p-2.5 text-slate-500">{station.city || 'Brak danych'}</td><td className="p-2.5 text-right"><span className={`inline-block px-2 py-0.5 rounded text-[10px] font-medium ${station.status === 'Awaria' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{station.status}</span></td></tr>))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            <div className="p-5 border-t border-slate-200 bg-slate-50 shrink-0 flex gap-3 justify-end"><button type="button" onClick={() => setActiveTechDetails(null)} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-medium rounded-lg text-sm hover:bg-slate-50 transition-colors shadow-sm">Zamknij</button><button form="tech-edit-form" type="submit" className="px-5 py-2 bg-blue-600 text-white font-medium rounded-lg text-sm hover:bg-blue-700 transition-colors shadow-sm">Zapisz</button></div>
          </div>
        </div>
      )}

      {/* MODAL IMPORTU TECHNIKÓW */}
      {isImportModalOpen && (
        <div 
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          onClick={() => !isImporting && setIsImportModalOpen(false)}
        >
          <div 
            className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800">Import techników z Google Sheets</h3>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 text-xs text-slate-600 space-y-2">
                <p className="font-bold text-slate-700">Wymagane nagłówki w 1. wierszu:</p>
                <p className="font-mono bg-white p-1.5 border rounded">Imię i nazwisko, Telefon, Pojazd, Ważność SEP</p>
                <p className="text-[11px] leading-relaxed text-slate-500">Arkusz musi być publiczny. System sprawdzi karty: <b>Technicy</b>, <b>Technicians</b>, <b>Arkusz1</b>.</p>
              </div>
              <form onSubmit={handleImportTechs} className="space-y-4">
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