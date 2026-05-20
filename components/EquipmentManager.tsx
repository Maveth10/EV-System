import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../app/supabase';

type Part = { id: string; sku: string; name: string; category: string; unit: string; main_stock: number; };
type Technician = { id: string; name: string; car_plate?: string | null; };
type TechInventory = { id: string; technician_id: string; part_id: string; quantity: number; };
type Log = { id: string; part_id: string; technician_id: string; operation_type: string; quantity: number; created_at: string; notes?: string; };

const IconPackage = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
const IconTruck = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;
const IconHistory = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
const IconImport = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;

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

export default function EquipmentManager() {
  const [activeTab, setActiveTab] = useState<'central' | 'mobile' | 'logs'>('central');
  const [isLoading, setIsLoading] = useState(true);

  // Dane
  const [parts, setParts] = useState<Part[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [techInventory, setTechInventory] = useState<TechInventory[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);

  // Filtrowanie mobilne
  const [selectedVehicleFilter, setSelectedVehicleFilter] = useState<string>('ALL');

  // Modale
  const [isNewPartModalOpen, setIsNewPartModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [issueModalPart, setIssueModalPart] = useState<Part | null>(null);

  // Formularze
  const [newPart, setNewPart] = useState({ sku: '', name: '', category: 'Część zamienna', unit: 'szt.', main_stock: 0 });
  const [issueForm, setIssueForm] = useState({ technician_id: '', quantity: 1, type: 'WYDANIE' as 'WYDANIE' | 'DOSTAWA' });
  const [sheetUrl, setSheetUrl] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const fetchData = async () => {
    setIsLoading(true);
    const [partsRes, techRes, invRes, logsRes] = await Promise.all([
      supabase.from('parts').select('*').order('name'),
      supabase.from('technicians').select('id, name, car_plate').order('name'),
      supabase.from('technician_inventory').select('*'),
      supabase.from('inventory_logs').select('*').order('created_at', { ascending: false }).limit(100)
    ]);

    if (partsRes.data) setParts(partsRes.data);
    if (techRes.data) setTechnicians(techRes.data as Technician[]);
    if (invRes.data) setTechInventory(invRes.data);
    if (logsRes.data) setLogs(logsRes.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('parts').insert([newPart]);
    if (error) alert(`Błąd: ${error.message}`);
    else { setIsNewPartModalOpen(false); setNewPart({ sku: '', name: '', category: 'Część zamienna', unit: 'szt.', main_stock: 0 }); fetchData(); }
  };

  const handleIssuePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueModalPart) return;

    if (issueForm.type === 'WYDANIE') {
      if (!issueForm.technician_id) { alert("Wybierz technika!"); return; }
      if (issueForm.quantity > issueModalPart.main_stock) { alert("Brak wystarczającej ilości w magazynie centralnym!"); return; }

      await supabase.from('parts').update({ main_stock: issueModalPart.main_stock - issueForm.quantity }).eq('id', issueModalPart.id);
      
      const existing = techInventory.find(i => i.technician_id === issueForm.technician_id && i.part_id === issueModalPart.id);
      if (existing) {
        await supabase.from('technician_inventory').update({ quantity: existing.quantity + issueForm.quantity }).eq('id', existing.id);
      } else {
        await supabase.from('technician_inventory').insert([{ technician_id: issueForm.technician_id, part_id: issueModalPart.id, quantity: issueForm.quantity }]);
      }

      await supabase.from('inventory_logs').insert([{ part_id: issueModalPart.id, technician_id: issueForm.technician_id, operation_type: 'WYDANIE', quantity: issueForm.quantity, notes: 'Wydanie na auto' }]);
    
    } else if (issueForm.type === 'DOSTAWA') {
      await supabase.from('parts').update({ main_stock: issueModalPart.main_stock + issueForm.quantity }).eq('id', issueModalPart.id);
      await supabase.from('inventory_logs').insert([{ part_id: issueModalPart.id, operation_type: 'DOSTAWA', quantity: issueForm.quantity, notes: 'Dostawa zewnętrzna' }]);
    }

    setIssueModalPart(null);
    fetchData();
  };

  const handleImportParts = async (e: React.FormEvent) => {
    e.preventDefault();
    const matches = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = matches ? matches[1] : null;

    if (!spreadsheetId) { alert('Nieprawidłowy link do Arkusza Google.'); return; }

    setIsImporting(true);
    setImportStatus('Nawiązywanie połączenia z arkuszem...');

    const candidates = ['magazyn', 'czesci', 'parts', 'arkusz1', 'sheet1', 'Arkusz1', 'Sheet1'];
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
      alert("UWAGA: Arkusz jest prywatny! Kliknij zielone 'Udostępnij' i ustaw 'Każdy, kto ma link może przeglądać'.");
      setIsImporting(false); setImportStatus(''); return;
    }

    if (!csvText) {
      alert('Nie udało się pobrać danych. Upewnij się, że nazwa zakładki to np. "czesci", "parts" lub "Arkusz1".');
      setIsImporting(false); setImportStatus(''); return;
    }

    const delimiter = csvText.split('\n')[0].includes(';') ? ';' : ',';
    const parsedData = parseCSV(csvText, delimiter);
    if (parsedData.length < 2) { alert('Arkusz nie zawiera danych.'); setIsImporting(false); return; }

    const headers = parsedData[0].map(h => h.toLowerCase());
    const getColIndex = (names: string[]) => headers.findIndex(h => names.some(n => h === n || h.includes(n)));

    const idxSku = getColIndex(['sku', 'kod', 'indeks', 'index']);
    const idxName = getColIndex(['nazwa', 'name', 'artykul']);
    const idxCategory = getColIndex(['kategoria', 'category']);
    const idxUnit = getColIndex(['jednostka', 'unit', 'j.m.']);
    const idxStock = getColIndex(['stan', 'ilosc', 'stock', 'magazyn']);

    if (idxSku === -1 || idxName === -1) {
      alert('Błąd: Arkusz musi posiadać nagłówki "SKU" oraz "Nazwa".');
      setIsImporting(false); return;
    }

    const rows = parsedData.slice(1);
    setImportStatus(`Mapowanie ${rows.length} artykułów...`);

    const finalPayloads = [];
    for (let i = 0; i < rows.length; i++) {
      const vals = rows[i];
      if (!vals[idxSku] || !vals[idxName]) continue;

      finalPayloads.push({
        sku: vals[idxSku].toUpperCase(),
        name: vals[idxName],
        category: idxCategory !== -1 && vals[idxCategory] ? vals[idxCategory] : 'Część zamienna',
        unit: idxUnit !== -1 && vals[idxUnit] ? vals[idxUnit] : 'szt.',
        main_stock: idxStock !== -1 && !isNaN(parseInt(vals[idxStock])) ? parseInt(vals[idxStock]) : 0
      });
    }

    let successCount = 0;
    for (const item of finalPayloads) {
      const { error } = await supabase.from('parts').upsert(item, { onConflict: 'sku' });
      if (!error) successCount++;
    }

    alert(`Pomyślnie zaimportowano/zaktualizowano ${successCount} części zamiennych!`);
    setIsImporting(false); setIsImportModalOpen(false); setSheetUrl(''); setImportStatus('');
    fetchData();
  };

  const getTechName = (id: string) => technicians.find(t => t.id === id)?.name || 'Nieznany';
  const getPart = (id: string) => parts.find(p => p.id === id);

  const filteredTechnicians = useMemo(() => {
    if (selectedVehicleFilter === 'ALL') return technicians;
    return technicians.filter(t => t.id === selectedVehicleFilter);
  }, [technicians, selectedVehicleFilter]);

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-50 z-40 p-6 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto">
        
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Magazyn i Części</h1>
            <p className="text-sm text-slate-500 mt-1">Zarządzaj stanami głównymi i wyposażeniem aut serwisowych.</p>
          </div>
          <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
            <button onClick={() => setActiveTab('central')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'central' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}><IconPackage /> Magazyn Centralny</button>
            <button onClick={() => setActiveTab('mobile')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'mobile' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}><IconTruck /> Stany na autach</button>
            <button onClick={() => setActiveTab('logs')} className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === 'logs' ? 'bg-slate-100 text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}><IconHistory /> Historia operacji</button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-slate-400">Ładowanie danych magazynowych...</div>
        ) : (
          <>
            {activeTab === 'central' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                  <h2 className="font-semibold text-slate-700">Katalog Części ({parts.length})</h2>
                  <div className="flex gap-2">
                    <button onClick={() => setIsImportModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm"><IconImport /> Importuj z arkusza</button>
                    <button onClick={() => setIsNewPartModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-medium hover:bg-slate-50 transition-colors flex items-center gap-1.5 shadow-sm">+ Nowy wpis</button>
                  </div>
                </div>
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">SKU</th>
                      <th className="px-4 py-3">Nazwa</th>
                      <th className="px-4 py-3">Kategoria</th>
                      <th className="px-4 py-3 text-right">Stan (Centralny)</th>
                      <th className="px-4 py-3 text-center">Akcje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parts.length === 0 ? <tr><td colSpan={5} className="text-center p-8 text-slate-400">Brak części w katalogu</td></tr> : null}
                    {parts.map(p => (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{p.sku}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{p.name}</td>
                        <td className="px-4 py-3"><span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-xs">{p.category}</span></td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700">
                          <span className={p.main_stock === 0 ? 'text-red-500' : p.main_stock < 5 ? 'text-orange-500' : ''}>{p.main_stock} {p.unit}</span>
                        </td>
                        <td className="px-4 py-3 text-center space-x-2">
                          <button onClick={() => { setIssueForm({ ...issueForm, type: 'DOSTAWA' }); setIssueModalPart(p); }} className="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100 font-medium">+ Przyjmij</button>
                          <button onClick={() => { setIssueForm({ ...issueForm, type: 'WYDANIE' }); setIssueModalPart(p); }} disabled={p.main_stock === 0} className="text-xs bg-orange-50 text-orange-600 px-3 py-1.5 rounded hover:bg-orange-100 font-medium disabled:opacity-30 disabled:cursor-not-allowed">Wydaj na auto</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === 'mobile' && (
              <div className="space-y-4">
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-50 text-[#58b347] rounded-lg"><IconTruck /></div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-800">Filtrowanie Floty Mobilnej</h3>
                      <p className="text-xs text-slate-400">Wybierz pojazd, aby sprawdzić jego dedykowany car-stock.</p>
                    </div>
                  </div>
                  <select 
                    value={selectedVehicleFilter} 
                    onChange={e => setSelectedVehicleFilter(e.target.value)}
                    className="border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold focus:outline-none focus:border-[#58b347] bg-slate-50 cursor-pointer min-w-[280px]"
                  >
                    <option value="ALL">🚚 Wszystkie samochody serwisowe ({technicians.length})</option>
                    {technicians.map(t => (
                      <option key={t.id} value={t.id}>
                        {t.name} {t.car_plate ? `[${t.car_plate}]` : '(Brak rejestracji)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredTechnicians.map(tech => {
                    const techItems = techInventory.filter(i => i.technician_id === tech.id && i.quantity > 0);
                    return (
                      <div key={tech.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col justify-between">
                        <div>
                          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-[#58b347]/10 flex items-center justify-center text-[#58b347] font-bold text-xs">{tech.name.charAt(0)}</div>
                              <div>
                                <h3 className="font-bold text-slate-800 text-xs leading-none">{tech.name}</h3>
                                <span className="text-[10px] text-slate-400 font-medium">Serwis mobilny EV</span>
                              </div>
                            </div>
                            {tech.car_plate ? (
                              <span className="bg-slate-800 text-white font-mono text-[10px] font-bold px-2 py-1 rounded tracking-wider border border-slate-900 shadow-sm">{tech.car_plate}</span>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic">Brak przypisanego auta</span>
                            )}
                          </div>
                          <div className="p-0">
                            <table className="w-full text-xs text-left">
                              <tbody className="divide-y divide-slate-100">
                                {techItems.map(item => {
                                  const part = getPart(item.part_id);
                                  return (
                                    <tr key={item.id} className="hover:bg-slate-50/40">
                                      <td className="px-4 py-2.5 font-medium text-slate-700">{part?.name || 'Nieznana część'}</td>
                                      <td className="px-4 py-2.5 font-mono text-[10px] text-slate-400">{part?.sku}</td>
                                      <td className="px-4 py-2.5 text-right font-bold text-slate-700">{item.quantity} {part?.unit}</td>
                                    </tr>
                                  )
                                })}
                                {techItems.length === 0 && (
                                  <tr><td colSpan={3} className="text-center p-8 text-slate-400 italic">Bagażnik jest pusty.</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'logs' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3">Operacja</th>
                      <th className="px-4 py-3">Część</th>
                      <th className="px-4 py-3">Ilość</th>
                      <th className="px-4 py-3">Technik / Auto</th>
                      <th className="px-4 py-3">Notatki</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map(log => {
                      const part = getPart(log.part_id);
                      return (
                        <tr key={log.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 text-xs text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded text-[10px] font-bold ${log.operation_type === 'DOSTAWA' ? 'bg-blue-50 text-blue-600' : 'bg-orange-50 text-orange-600'}`}>{log.operation_type}</span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-700">{part?.name || 'Nieznana'}</td>
                          <td className="px-4 py-3 font-bold">{log.quantity} {part?.unit}</td>
                          <td className="px-4 py-3 text-slate-600">{log.technician_id ? getTechName(log.technician_id) : '-'}</td>
                          <td className="px-4 py-3 text-xs text-slate-400 italic">{log.notes || '-'}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => !isImporting && setIsImportModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm">Import Katalogu Części</h3>
              <button onClick={() => !isImporting && setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 space-y-1.5">
                <p className="font-bold text-slate-700">Wymagane nagłówki w Arkuszu:</p>
                <p className="font-mono bg-white p-1.5 border rounded text-[11px]">SKU, Nazwa, Kategoria, Jednostka, Stan</p>
                <p className="text-orange-600 font-medium pt-1">Nazwa zakładki w pliku musi brzmieć: &quot;czesci&quot; lub &quot;parts&quot;.</p>
              </div>
              <form onSubmit={handleImportParts} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Link do Arkusza Google</label>
                  <input required type="url" disabled={isImporting} value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347]" placeholder="https://docs.google.com/spreadsheets/..." />
                </div>
                {importStatus && <p className="text-[11px] text-[#58b347] font-medium bg-green-50 p-2 rounded border border-green-100 animate-pulse">{importStatus}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" disabled={isImporting} onClick={() => setIsImportModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded text-sm hover:bg-slate-200">Anuluj</button>
                  <button type="submit" disabled={isImporting} className="flex-1 bg-[#58b347] text-white font-medium py-2 rounded text-sm hover:bg-[#499b3a] disabled:bg-slate-400">{isImporting ? 'Przetwarzanie...' : 'Uruchom'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isNewPartModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Dodaj nową pozycję do katalogu</h3>
              <button onClick={() => setIsNewPartModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreatePart} className="p-5 space-y-4">
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Kod SKU / Index</label><input required value={newPart.sku} onChange={e => setNewPart({...newPart, sku: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-[#58b347] focus:outline-none uppercase" placeholder="np. KABEL-CCS-200A" /></div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Nazwa części</label><input required value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-[#58b347] focus:outline-none" placeholder="np. Wtyk ładowania CCS2" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Kategoria</label><select value={newPart.category} onChange={e => setNewPart({...newPart, category: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-[#58b347] focus:outline-none"><option>Część zamienna</option><option>Narzędzie</option><option>Materiał eksploatacyjny</option></select></div>
                <div><label className="block text-xs font-medium text-slate-600 mb-1">Jednostka</label><select value={newPart.unit} onChange={e => setNewPart({...newPart, unit: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-[#58b347] focus:outline-none"><option>szt.</option><option>mb</option><option>kpl.</option></select></div>
              </div>
              <div><label className="block text-xs font-medium text-slate-600 mb-1">Stan początkowy (Magazyn Centralny)</label><input type="number" min="0" required value={newPart.main_stock} onChange={e => setNewPart({...newPart, main_stock: parseInt(e.target.value) || 0})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none" /></div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsNewPartModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 transition-colors text-sm">Anuluj</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-medium py-2 rounded-lg hover:bg-[#499b3a] transition-colors text-sm">Zapisz część</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {issueModalPart && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className={`px-5 py-4 border-b border-slate-200 flex justify-between items-center ${issueForm.type === 'WYDANIE' ? 'bg-orange-50' : 'bg-blue-50'}`}>
              <h3 className={`font-bold ${issueForm.type === 'WYDANIE' ? 'text-orange-800' : 'text-blue-800'}`}>{issueForm.type === 'WYDANIE' ? 'Wydanie na auto' : 'Dostawa do magazynu'}</h3>
              <button onClick={() => setIssueModalPart(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleIssuePart} className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                <p className="text-xs text-slate-500 font-mono">{issueModalPart.sku}</p>
                <p className="text-sm font-bold text-slate-800">{issueModalPart.name}</p>
                <p className="text-xs text-slate-600 mt-1">Stan w magazynie: <strong className={issueModalPart.main_stock > 0 ? 'text-[#58b347]' : 'text-red-500'}>{issueModalPart.main_stock} {issueModalPart.unit}</strong></p>
              </div>

              {issueForm.type === 'WYDANIE' && (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Wybierz technika (odbiorcę / pojazd)</label>
                  <select required value={issueForm.technician_id} onChange={e => setIssueForm({...issueForm, technician_id: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:border-orange-500 focus:outline-none">
                    <option value="">-- Wybierz z listy --</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name} {t.car_plate ? `[${t.car_plate}]` : ''}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Ilość ({issueModalPart.unit})</label>
                <input type="number" min="1" max={issueForm.type === 'WYDANIE' ? issueModalPart.main_stock : 9999} required value={issueForm.quantity} onChange={e => setIssueForm({...issueForm, quantity: parseInt(e.target.value) || 1})} className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIssueModalPart(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2 rounded-lg hover:bg-slate-200 transition-colors text-sm">Anuluj</button>
                <button type="submit" className={`flex-1 text-white font-medium py-2 rounded-lg transition-colors text-sm ${issueForm.type === 'WYDANIE' ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-500 hover:bg-blue-600'}`}>{issueForm.type === 'WYDANIE' ? 'Zatwierdź wydanie' : 'Zatwierdź dostawę'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}