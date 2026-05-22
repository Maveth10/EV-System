'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../app/supabase';

// --- TYPY ---
type Part = { id: string; sku: string; name: string; category: string; unit: string; main_stock: number; };
type Technician = { id: string; name: string; car_plate?: string | null; };
type TechInventory = { id: string; technician_id: string; part_id: string; quantity: number; };
type Log = { id: string; part_id: string; technician_id: string; operation_type: string; quantity: number; created_at: string; notes?: string; };

// --- IKONY ---
const IconPackage = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
const IconTruck = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;
const IconHistory = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
const IconSearch = () => <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconArrowLeft = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const IconArrowRight = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
const IconChevronDown = () => <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const IconChevronUp = () => <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const IconLayers = () => <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IconTool = () => <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
const IconDrop = () => <svg className="w-3.5 h-3.5 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>;
const IconInfo = () => <svg className="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconEdit = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconImport = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;

// --- FUNKCJE POMOCNICZE ---
const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

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
  const [activeTab, setActiveTab] = useState<'central' | 'mobile' | 'logs'>('mobile');
  const [isLoading, setIsLoading] = useState(true);

  const [parts, setParts] = useState<Part[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [techInventory, setTechInventory] = useState<TechInventory[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);

  const [searchQuery, setSearchQuery] = useState('');

  // Stany UI
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [expandedTechIds, setExpandedTechIds] = useState<string[]>([]);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);

  // Modale
  const [isNewPartModalOpen, setIsNewPartModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCarModalOpen, setIsCarModalOpen] = useState(false);
  
  const [issueModalPart, setIssueModalPart] = useState<Part | null>(null);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);

  const [newPart, setNewPart] = useState({ sku: '', name: '', category: 'Część zamienna', unit: 'szt.', main_stock: 0 });
  const [issueForm, setIssueForm] = useState({ technician_id: '', quantity: 1, type: 'WYDANIE' as 'WYDANIE' | 'DOSTAWA' | 'ZWROT' });
  const [sheetUrl, setSheetUrl] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Pobieranie danych
  const fetchData = async () => {
    setIsLoading(true);
    const [partsRes, techRes, invRes, logsRes] = await Promise.all([
      supabase.from('parts').select('*').order('name'),
      supabase.from('technicians').select('id, name, car_plate').order('name'),
      supabase.from('technician_inventory').select('*'),
      supabase.from('inventory_logs').select('*').order('created_at', { ascending: false }).limit(200)
    ]);

    if (partsRes.data) setParts(partsRes.data);
    if (techRes.data) {
      setTechnicians(techRes.data as Technician[]);
      if (techRes.data.length > 0 && expandedTechIds.length === 0) setExpandedTechIds([techRes.data[0].id]);
    }
    if (invRes.data) setTechInventory(invRes.data);
    if (logsRes.data) setLogs(logsRes.data);
    setIsLoading(false);
  };

  useEffect(() => { 
    fetchData(); 

    // Globalna obsługa zamykania modali klawiszem ESC
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNewPartModalOpen(false);
        setIsImportModalOpen(false);
        setIsCarModalOpen(false);
        setIssueModalPart(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Wymuszenie resetowania Hovera przy zmianie zakładki
  useEffect(() => { setHoveredPartId(null); }, [activeTab]);

  // --- LOGIKA BIZNESOWA ---
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
    
    } else if (issueForm.type === 'ZWROT') {
      if (!issueForm.technician_id) return;
      const existing = techInventory.find(i => i.technician_id === issueForm.technician_id && i.part_id === issueModalPart.id);
      
      if (!existing || existing.quantity < issueForm.quantity) { alert("Błąd: Próbujesz zwrócić więcej niż technik posiada na aucie!"); return; }

      await supabase.from('technician_inventory').update({ quantity: existing.quantity - issueForm.quantity }).eq('id', existing.id);
      await supabase.from('parts').update({ main_stock: issueModalPart.main_stock + issueForm.quantity }).eq('id', issueModalPart.id);
      await supabase.from('inventory_logs').insert([{ part_id: issueModalPart.id, technician_id: issueForm.technician_id, operation_type: 'ZWROT', quantity: issueForm.quantity, notes: 'Zwrot z auta na magazyn główny' }]);
    }

    setIssueModalPart(null);
    fetchData();
  };

  const handleUpdateCarPlate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTech) return;
    const newPlate = editingTech.car_plate?.trim() || null;
    const { error } = await supabase.from('technicians').update({ car_plate: newPlate }).eq('id', editingTech.id);
    if (error) alert(`Błąd przypisywania pojazdu: ${error.message}`);
    else { setIsCarModalOpen(false); setEditingTech(null); fetchData(); }
  };

  const handleImportParts = async (e: React.FormEvent) => {
    e.preventDefault();
    const matches = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = matches ? matches[1] : null;
    if (!spreadsheetId) { alert('Nieprawidłowy link do Arkusza Google.'); return; }
    
    setIsImporting(true); setImportStatus('Pobieranie...');
    
    try {
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`);
      const text = await res.text();
      if (!text || text.includes('<html')) throw new Error('Brak dostępu. Sprawdź udostępnianie (Każdy kto ma link).');
      
      const delimiter = text.split('\n')[0].includes(';') ? ';' : ',';
      const parsedData = parseCSV(text, delimiter);
      if (parsedData.length < 2) throw new Error('Arkusz jest pusty lub nie ma danych');

      const headers = parsedData[0].map(h => h.toLowerCase());
      const idxSku = headers.findIndex(h => ['sku', 'kod', 'indeks', 'index'].some(n => h.includes(n)));
      const idxName = headers.findIndex(h => ['nazwa', 'name', 'artykul'].some(n => h.includes(n)));
      const idxCat = headers.findIndex(h => ['kategoria', 'category'].some(n => h.includes(n)));
      const idxUnit = headers.findIndex(h => ['jednostka', 'unit', 'j.m.'].some(n => h.includes(n)));
      const idxStock = headers.findIndex(h => ['stan', 'ilosc', 'stock', 'magazyn'].some(n => h.includes(n)));

      if (idxSku === -1 || idxName === -1) throw new Error('Brak kolumn SKU / Nazwa w arkuszu');

      const payloads = parsedData.slice(1).filter(r => r[idxSku] && r[idxName]).map(r => ({
        sku: r[idxSku].toUpperCase(),
        name: r[idxName],
        category: idxCat !== -1 && r[idxCat] ? r[idxCat] : 'Część zamienna',
        unit: idxUnit !== -1 && r[idxUnit] ? r[idxUnit] : 'szt.',
        main_stock: idxStock !== -1 && !isNaN(parseInt(r[idxStock])) ? parseInt(r[idxStock]) : 0
      }));

      let count = 0;
      for (const item of payloads) {
        const { error } = await supabase.from('parts').upsert(item, { onConflict: 'sku' });
        if (!error) count++;
      }
      alert(`Zaktualizowano pomyślnie ${count} części.`);
      setIsImportModalOpen(false); setSheetUrl('');
    } catch (err: any) {
      alert(err.message || 'Błąd importu. Sprawdź format pliku.');
    }
    setIsImporting(false); setImportStatus(''); fetchData();
  };

  // --- FILTRY I GRUPOWANIE ---
  const filteredTechInventory = useMemo(() => {
    if (!searchQuery) return techInventory;
    const q = searchQuery.toLowerCase();
    return techInventory.filter(item => {
      const p = parts.find(x => x.id === item.part_id);
      return p && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q));
    });
  }, [techInventory, parts, searchQuery]);

  const mobileSummary = useMemo(() => {
    const sum: Record<string, { part: Part, total: number, breakdown: { tech: Technician, qty: number }[] }> = {};
    filteredTechInventory.forEach(item => {
      if (item.quantity <= 0) return;
      const part = parts.find(p => p.id === item.part_id);
      const tech = technicians.find(t => t.id === item.technician_id);
      if (!part || !tech) return;
      if (!sum[part.id]) sum[part.id] = { part, total: 0, breakdown: [] };
      sum[part.id].total += item.quantity;
      sum[part.id].breakdown.push({ tech, qty: item.quantity });
    });

    const groups: Record<string, typeof sum[string][]> = { 'Narzędzie': [], 'Część zamienna': [], 'Materiał eksploatacyjny': [], 'Inne': [] };
    Object.values(sum).forEach(i => {
      const c = i.part.category || 'Inne';
      if (groups[c]) groups[c].push(i); else groups['Inne'].push(i);
    });
    Object.keys(groups).forEach(k => groups[k].sort((a, b) => a.part.name.localeCompare(b.part.name)));
    return groups;
  }, [filteredTechInventory, parts, technicians]);

  const activePartDetails = useMemo(() => {
    if (!hoveredPartId) return null;
    for (const cat of Object.keys(mobileSummary)) {
      const found = mobileSummary[cat].find(i => i.part.id === hoveredPartId);
      if (found) return found;
    }
    return null;
  }, [hoveredPartId, mobileSummary]);

  const getCategoryIcon = (category: string) => {
    if (category === 'Narzędzie') return <IconTool />;
    if (category === 'Materiał eksploatacyjny') return <IconDrop />;
    return <IconPackage />;
  };

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-100 flex flex-col font-sans text-slate-800">
      
      {/* Pasek nawigacji górnej */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Magazyn i Części</h1>
          <p className="text-xs text-slate-500 mt-0.5">Zarządzanie stanami głównymi i wyposażeniem floty.</p>
        </div>
        
        <div className="flex bg-slate-100 p-1 rounded border border-slate-200 shadow-inner">
          <button onClick={() => setActiveTab('central')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-semibold transition-colors ${activeTab === 'central' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}><IconPackage /> Centralny</button>
          <button onClick={() => setActiveTab('mobile')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-semibold transition-colors ${activeTab === 'mobile' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}><IconTruck /> Auta</button>
          <button onClick={() => setActiveTab('logs')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-semibold transition-colors ${activeTab === 'logs' ? 'bg-white shadow-sm border border-slate-200 text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}><IconHistory /> Historia</button>
        </div>
      </div>

      {/* Kontener Główny (Niezależny Scroll dla zakładek) */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="flex w-full h-full items-center justify-center text-sm font-medium text-slate-400">Ładowanie bazy danych...</div>
        ) : (
          <>
            
            {/* WIDOK: MAGAZYN CENTRALNY */}
            {activeTab === 'central' && (
              <div className="h-full overflow-y-auto p-6 flex justify-center">
                <div className="w-full max-w-[1200px] bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col h-fit max-h-full">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0 rounded-t-lg">
                    <h2 className="font-semibold text-sm text-slate-800 tracking-wide uppercase">Katalog Główny ({parts.length})</h2>
                    <div className="flex gap-2.5">
                      <button onClick={() => setIsImportModalOpen(true)} className="border border-slate-300 bg-white text-slate-600 px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-50 shadow-sm flex items-center gap-1.5 transition-colors"><IconImport /> Import CSV</button>
                      <button onClick={() => setIsNewPartModalOpen(true)} className="bg-[#58b347] text-white border border-[#499b3a] px-3 py-1.5 rounded text-xs font-bold hover:bg-[#499b3a] shadow-sm transition-colors">+ Nowa część</button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white border-b border-slate-200 text-xs text-slate-500 uppercase sticky top-0">
                        <tr>
                          <th className="px-5 py-3 font-semibold">SKU</th>
                          <th className="px-5 py-3 font-semibold">Nazwa</th>
                          <th className="px-5 py-3 font-semibold">Kategoria</th>
                          <th className="px-5 py-3 font-semibold text-right">Stan Centralny</th>
                          <th className="px-5 py-3 font-semibold text-center">Akcje</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parts.map(p => (
                          <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3 font-mono text-xs text-slate-500 w-1/6">{p.sku}</td>
                            <td className="px-5 py-3 text-slate-800 font-semibold w-2/5 leading-tight">{p.name}</td>
                            <td className="px-5 py-3 text-xs text-slate-500 w-1/6 flex items-center gap-1.5"><span className="text-slate-400">{getCategoryIcon(p.category)}</span>{p.category}</td>
                            <td className="px-5 py-3 text-right w-1/6">
                              <span className={`font-bold ${p.main_stock === 0 ? 'text-red-500' : 'text-slate-800'}`}>{p.main_stock} <span className="font-normal text-xs text-slate-400 ml-0.5">{p.unit}</span></span>
                            </td>
                            <td className="px-5 py-3 text-center space-x-2 flex justify-center w-1/5">
                              <button onClick={() => { setIssueForm({ ...issueForm, type: 'DOSTAWA' }); setIssueModalPart(p); }} className="text-xs font-bold border border-slate-200 bg-white text-slate-600 px-3 py-1.5 rounded hover:bg-slate-50 shadow-sm transition-colors">+ Dostawa</button>
                              <button onClick={() => { setIssueForm({ ...issueForm, type: 'WYDANIE' }); setIssueModalPart(p); }} disabled={p.main_stock === 0} className="text-xs font-bold border border-[#58b347] bg-[#58b347] text-white px-3 py-1.5 rounded hover:bg-[#499b3a] disabled:opacity-50 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400 shadow-sm transition-colors flex items-center gap-1">Wydaj <IconArrowRight /></button>
                            </td>
                          </tr>
                        ))}
                        {parts.length === 0 && <tr><td colSpan={5} className="text-center p-8 text-slate-400">Brak pozycji w katalogu.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* WIDOK: STANY NA AUTACH (Czyste oddzielenie Sumy od Techników) */}
            {activeTab === 'mobile' && (
              <div className="flex w-full h-full p-6 gap-6 max-w-[1500px] mx-auto">
                
                {/* Lewa kolumna: Lista z wyraźnym odcięciem */}
                <div className="flex-1 h-full overflow-y-auto pr-2 space-y-6 scrollbar-hide">
                  
                  {/* Wyszukiwarka */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400"><IconSearch /></div>
                    <input 
                      type="text" 
                      placeholder="Wyszukaj sprzęt w autach (SKU, Nazwa)..." 
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded shadow-sm text-sm outline-none focus:border-[#58b347]"
                    />
                  </div>

                  {/* KONTENER NADRZĘDNY: SUMA */}
                  <div className="bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
                    <button 
                      onClick={() => setIsSummaryExpanded(!isSummaryExpanded)} 
                      className="w-full px-5 py-3 flex justify-between items-center bg-slate-800 text-white hover:bg-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <IconLayers />
                        <span className="text-sm font-bold uppercase tracking-wider">Suma sprzętu na wszystkich autach</span>
                      </div>
                      <span className="text-slate-300">{isSummaryExpanded ? <IconChevronUp /> : <IconChevronDown />}</span>
                    </button>
                    
                    {isSummaryExpanded && (
                      <div className="divide-y divide-slate-100 max-h-[40vh] overflow-y-auto bg-white">
                        {['Część zamienna', 'Narzędzie', 'Materiał eksploatacyjny', 'Inne'].map(cat => {
                          const items = mobileSummary[cat];
                          if (!items || items.length === 0) return null;
                          return (
                            <div key={cat}>
                              <div className="bg-slate-50 px-5 py-1.5 text-[10px] font-bold text-slate-500 uppercase border-b border-slate-100 flex items-center gap-2 sticky top-0">
                                {getCategoryIcon(cat)} {cat}
                              </div>
                              <div className="divide-y divide-slate-50">
                                {items.map(item => (
                                  <div 
                                    key={item.part.id}
                                    onMouseEnter={() => setHoveredPartId(item.part.id)}
                                    className={`flex items-center justify-between px-5 py-2 cursor-pointer transition-colors border-l-[3px] ${hoveredPartId === item.part.id ? 'bg-[#58b347]/5 border-[#58b347]' : 'border-transparent hover:bg-slate-50'}`}
                                  >
                                    <div className="flex flex-col min-w-0 pr-4">
                                      <span className="text-xs font-bold text-slate-800 leading-tight">{item.part.name}</span>
                                      <span className="text-[10px] text-slate-400 font-mono mt-0.5">{item.part.sku}</span>
                                    </div>
                                    <div className="text-sm font-bold text-slate-800 tabular-nums">
                                      {item.total} <span className="text-[10px] font-medium text-slate-500 uppercase">{item.part.unit}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                        {Object.keys(mobileSummary).every(k => mobileSummary[k].length === 0) && (
                          <div className="text-center p-6 text-sm text-slate-400">Brak wyników.</div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* WIZUALNE ODCIĘCIE: Dział techników */}
                  <div className="flex items-center gap-4 py-2 opacity-60">
                    <div className="h-px bg-slate-300 flex-1"></div>
                    <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2">Bagażniki poszczególnych techników</h2>
                    <div className="h-px bg-slate-300 flex-1"></div>
                  </div>
                  
                  {/* AKORDEONY TECHNIKÓW */}
                  <div className="space-y-3 pb-8">
                    {technicians.map(tech => {
                      const techItems = filteredTechInventory.filter(i => i.technician_id === tech.id && i.quantity > 0);
                      const isOpen = expandedTechIds.includes(tech.id);
                      if (searchQuery && techItems.length === 0) return null;

                      const groups: Record<string, TechInventory[]> = { 'Narzędzie': [], 'Część zamienna': [], 'Materiał eksploatacyjny': [], 'Inne': [] };
                      techItems.forEach(item => {
                        const c = parts.find(p => p.id === item.part_id)?.category || 'Inne';
                        if (groups[c]) groups[c].push(item); else groups['Inne'].push(item);
                      });

                      return (
                        <div key={tech.id} className="bg-white border border-slate-200 rounded shadow-sm">
                          <div 
                            onClick={() => setExpandedTechIds(p => p.includes(tech.id) ? p.filter(id => id !== tech.id) : [...p, tech.id])}
                            className="w-full px-4 py-3 flex justify-between items-center hover:bg-slate-50 cursor-pointer border-b border-slate-100"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-slate-800">{tech.name}</span>
                              {tech.car_plate ? (
                                <span className="text-[10px] font-bold font-mono bg-white border border-slate-300 text-slate-700 px-1.5 py-0.5 rounded shadow-sm uppercase">{tech.car_plate}</span>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Brak auta</span>
                              )}
                              <button onClick={e => { e.stopPropagation(); setEditingTech(tech); setIsCarModalOpen(true); }} className="text-slate-400 hover:text-[#58b347] ml-2 transition-colors" title="Zarządzaj pojazdem"><IconEdit /></button>
                            </div>
                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-500">
                              <span>Pozycji: {techItems.length}</span>
                              <span className="text-slate-400">{isOpen ? <IconChevronUp /> : <IconChevronDown />}</span>
                            </div>
                          </div>

                          {isOpen && (
                            <div className="divide-y divide-slate-100 pb-2">
                              {['Część zamienna', 'Narzędzie', 'Materiał eksploatacyjny', 'Inne'].map(cat => {
                                const items = groups[cat];
                                if (!items || items.length === 0) return null;
                                return (
                                  <div key={cat}>
                                    <div className="bg-slate-50 px-4 py-1 text-[10px] font-semibold text-slate-500 border-b border-slate-100 flex items-center gap-1.5">{getCategoryIcon(cat)} {cat}</div>
                                    <table className="w-full text-left text-xs">
                                      <tbody className="divide-y divide-slate-50">
                                        {items.map(item => {
                                          const p = parts.find(x => x.id === item.part_id);
                                          if (!p) return null;
                                          return (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                              <td className="px-4 py-2.5 w-2/3">
                                                <div className="font-semibold text-slate-800 leading-tight">{p.name}</div>
                                                <div className="text-[9px] font-mono text-slate-400 mt-0.5">{p.sku}</div>
                                              </td>
                                              <td className="px-4 py-2.5 text-center font-bold text-slate-800">
                                                {item.quantity} <span className="text-[9px] font-normal text-slate-500 uppercase">{p.unit}</span>
                                              </td>
                                              <td className="px-4 py-2.5 text-right">
                                                <button onClick={() => { setIssueForm({ type: 'ZWROT', technician_id: tech.id, quantity: 1 }); setIssueModalPart(p); }} className="text-[10px] font-bold text-slate-600 bg-white border border-slate-300 hover:border-slate-400 hover:text-slate-800 px-3 py-1.5 rounded transition-colors shadow-sm inline-flex items-center gap-1">
                                                  <IconArrowLeft /> Zwróć
                                                </button>
                                              </td>
                                            </tr>
                                          )
                                        })}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              })}
                              {techItems.length === 0 && <div className="p-5 text-xs text-center text-slate-400">Pusto.</div>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Prawa kolumna: Czysty Panel Szczegółów (Zależny od Hovera) */}
                <div className="w-[340px] h-[calc(100vh-140px)] border border-slate-200 rounded-lg bg-white flex flex-col shrink-0 shadow-sm sticky top-0 overflow-hidden">
                  {activePartDetails ? (
                    <div className="flex flex-col h-full bg-white">
                      {/* Czysty Nagłówek */}
                      <div className="p-5 border-b border-slate-100 bg-slate-50 shrink-0">
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">{getCategoryIcon(activePartDetails.part.category)} {activePartDetails.part.category}</div>
                        <h2 className="text-sm font-bold text-slate-900 leading-snug">{activePartDetails.part.name}</h2>
                        <div className="text-[10px] font-mono text-slate-500 mt-1">{activePartDetails.part.sku}</div>
                      </div>

                      <div className="p-5 border-b border-slate-100 flex flex-col items-center justify-center shrink-0">
                        <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Suma we wszystkich autach:</div>
                        <div className="text-3xl font-black text-[#58b347]">{activePartDetails.total} <span className="text-xs font-bold text-slate-400 uppercase">{activePartDetails.part.unit}</span></div>
                      </div>

                      {/* Lista techników */}
                      <div className="flex-1 overflow-y-auto">
                        <div className="px-5 py-2.5 bg-slate-50 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100 tracking-wider">Rozdysponowane u techników:</div>
                        <ul className="divide-y divide-slate-100">
                          {activePartDetails.breakdown.map((b, i) => (
                            <li key={i} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors">
                              <div className="flex flex-col">
                                <div className="text-xs font-bold text-slate-800">{b.tech.name}</div>
                                {b.tech.car_plate && (
                                  <span className="font-mono text-[9px] text-slate-500 mt-0.5">{b.tech.car_plate}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-xs font-bold text-slate-800 tabular-nums">{b.qty} <span className="text-[9px] text-slate-400 font-normal">szt.</span></div>
                                <button 
                                  onClick={() => { setIssueForm({ type: 'ZWROT', technician_id: b.tech.id, quantity: 1 }); setIssueModalPart(activePartDetails.part); }}
                                  className="text-[10px] font-bold bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded hover:bg-slate-100 hover:text-slate-800 transition-colors shadow-sm"
                                >
                                  Zwróć
                                </button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full p-8 text-center text-slate-400 bg-slate-50/50">
                      <IconInfo />
                      <p className="mt-3 text-xs font-medium">Najedź myszką na część na liście, aby zobaczyć tutaj jej szczegóły.</p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* --- WIDOK: HISTORIA ZMIAN (Pełny ekran, czysta tabela) --- */}
            {activeTab === 'logs' && (
              <div className="p-6 h-full w-full overflow-hidden flex flex-col bg-slate-50">
                <div className="bg-white border border-slate-200 rounded-lg shadow-sm flex-1 flex flex-col overflow-hidden w-full max-w-[1200px] mx-auto">
                  <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0 rounded-t-lg">
                    <h2 className="font-bold text-sm text-slate-800 uppercase tracking-wide">Historia operacji magazynowych</h2>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-white border-b border-slate-200 text-[11px] text-slate-500 uppercase sticky top-0">
                        <tr>
                          <th className="px-5 py-3 font-semibold w-1/6">Data</th>
                          <th className="px-5 py-3 font-semibold w-1/6">Operacja</th>
                          <th className="px-5 py-3 font-semibold w-1/3">Część</th>
                          <th className="px-5 py-3 font-semibold w-1/12 text-center">Ilość</th>
                          <th className="px-5 py-3 font-semibold w-1/6">Cel / Źródło</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {logs.map(log => {
                          const part = parts.find(p => p.id === log.part_id);
                          return (
                            <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-5 py-3 text-[11px] text-slate-500 font-mono whitespace-nowrap">{new Date(log.created_at).toLocaleString('pl-PL')}</td>
                              <td className="px-5 py-3 whitespace-nowrap">
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${log.operation_type === 'DOSTAWA' ? 'border-slate-300 text-slate-600 bg-white' : log.operation_type === 'WYDANIE' ? 'border-[#58b347] text-[#58b347] bg-[#58b347]/5' : 'border-blue-300 text-blue-600 bg-blue-50'}`}>{log.operation_type}</span>
                              </td>
                              <td className="px-5 py-3">
                                <div className="text-slate-800 font-semibold text-xs leading-tight">{part?.name || 'Usunięta część'}</div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">{part?.sku || 'N/A'}</div>
                              </td>
                              <td className="px-5 py-3 font-bold text-slate-800 text-center text-sm">{log.quantity} <span className="font-normal text-[10px] text-slate-400 uppercase">{part?.unit || ''}</span></td>
                              <td className="px-5 py-3 text-xs font-semibold text-slate-700">{log.technician_id ? getTechName(log.technician_id) : <span className="font-normal italic text-slate-400">Magazyn zewnętrzny</span>}</td>
                            </tr>
                          )
                        })}
                        {logs.length === 0 && <tr><td colSpan={5} className="text-center p-8 text-slate-400">Brak zapisanych operacji w logach.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

          </>
        )}
      </div>

      {/* --- CZYSTE MODALE (ZAMYKANE PRZEZ BACKDROP I ESC) --- */}
      {issueModalPart && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 p-4" onClick={() => setIssueModalPart(null)}>
          <div className="bg-white rounded shadow-xl w-full max-w-sm overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                {issueForm.type === 'WYDANIE' ? 'Wydanie na auto' : issueForm.type === 'ZWROT' ? 'Zwrot do Centrali' : 'Dostawa'}
              </h3>
              <button onClick={() => setIssueModalPart(null)} className="text-slate-400 hover:text-slate-800 transition-colors">✕</button>
            </div>
            <form onSubmit={handleIssuePart} className="p-4 space-y-4">
              <div className="bg-slate-50 p-3 rounded border border-slate-200 text-center">
                <div className="text-[10px] text-slate-400 font-mono font-bold mb-0.5">{issueModalPart.sku}</div>
                <div className="text-sm font-bold text-slate-800 leading-tight">{issueModalPart.name}</div>
              </div>

              {issueForm.type !== 'DOSTAWA' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">{issueForm.type === 'WYDANIE' ? 'Komu wydajesz?' : 'Kto zwraca?'}</label>
                  <select required value={issueForm.technician_id} disabled={issueForm.type === 'ZWROT'} onChange={e => setIssueForm({...issueForm, technician_id: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-sm font-semibold focus:border-[#58b347] focus:outline-none disabled:opacity-50">
                    <option value="">-- Wybierz technika --</option>
                    {technicians.map(t => <option key={t.id} value={t.id}>{t.name} {t.car_plate ? `[${t.car_plate}]` : ''}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Ilość ({issueModalPart.unit})</label>
                <div className="flex items-center gap-1.5">
                  <input 
                    type="number" 
                    min="1" 
                    max={issueForm.type === 'WYDANIE' ? issueModalPart.main_stock : issueForm.type === 'ZWROT' ? (techInventory.find(i => i.technician_id === issueForm.technician_id && i.part_id === issueModalPart.id)?.quantity || 1) : 9999} 
                    required 
                    value={issueForm.quantity} 
                    onChange={e => setIssueForm({...issueForm, quantity: parseInt(e.target.value) || 1})} 
                    className="w-full border border-slate-300 rounded p-2 text-base font-bold focus:border-[#58b347] focus:outline-none text-center" 
                  />
                  {issueForm.type !== 'DOSTAWA' && (
                    <button type="button" onClick={() => setIssueForm({...issueForm, quantity: issueForm.type === 'WYDANIE' ? issueModalPart.main_stock : (techInventory.find(i => i.technician_id === issueForm.technician_id && i.part_id === issueModalPart.id)?.quantity || 1)})} className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold px-3 py-2 rounded text-[10px] transition-colors">MAX</button>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setIssueModalPart(null)} className="flex-1 border border-slate-300 text-slate-700 font-bold py-2 rounded text-xs hover:bg-slate-50 transition-colors">Anuluj</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-bold py-2 rounded text-xs hover:bg-[#499b3a] transition-colors">Zatwierdź</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCarModalOpen && editingTech && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/30 p-4" onClick={() => { setIsCarModalOpen(false); setEditingTech(null); }}>
          <div className="bg-white rounded shadow-xl w-full max-w-sm overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Edycja floty: {editingTech.name}</h3>
              <button onClick={() => { setIsCarModalOpen(false); setEditingTech(null); }} className="text-slate-400 hover:text-slate-800 transition-colors">✕</button>
            </div>
            <form onSubmit={handleUpdateCarPlate} className="p-4 space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1 text-center">Numer rejestracyjny</label>
                <input type="text" value={editingTech.car_plate || ''} onChange={e => setEditingTech({...editingTech, car_plate: e.target.value.toUpperCase()})} className="w-full border border-slate-300 rounded p-2 text-sm font-mono font-bold text-center focus:border-[#58b347] uppercase outline-none" placeholder="Brak" />
                <p className="text-[9px] text-slate-400 mt-1.5 text-center">Zostaw puste aby odpiąć samochód.</p>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => { setIsCarModalOpen(false); setEditingTech(null); }} className="flex-1 border border-slate-300 text-slate-600 font-bold py-2 rounded text-xs hover:bg-slate-50 transition-colors">Anuluj</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-bold py-2 rounded text-xs hover:bg-[#499b3a] transition-colors">Zapisz</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 p-4" onClick={() => !isImporting && setIsImportModalOpen(false)}>
          <div className="bg-white rounded shadow-xl w-full max-w-sm overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Import Katalogu CSV</h3>
              <button onClick={() => !isImporting && setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-[10px] text-slate-500">
                <p className="font-bold text-slate-700 mb-0.5">Wymagane nagłówki w Google Sheets:</p>
                <p className="font-mono">SKU, Nazwa, Kategoria, Jednostka, Stan</p>
              </div>
              <form onSubmit={handleImportParts} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Link do Arkusza</label>
                  <input required type="url" disabled={isImporting} value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} className="w-full px-2.5 py-2 border border-slate-300 rounded text-xs focus:outline-none focus:border-[#58b347]" placeholder="https://docs.google..." />
                </div>
                {importStatus && <p className="text-[10px] text-[#58b347] font-bold text-center">{importStatus}</p>}
                <div className="flex gap-2 pt-2">
                  <button type="button" disabled={isImporting} onClick={() => setIsImportModalOpen(false)} className="flex-1 border border-slate-300 text-slate-600 font-bold py-2 rounded text-xs hover:bg-slate-50 transition-colors">Anuluj</button>
                  <button type="submit" disabled={isImporting} className="flex-1 bg-[#58b347] text-white font-bold py-2 rounded text-xs hover:bg-[#499b3a] disabled:bg-slate-400 transition-colors">{isImporting ? 'Pobieranie...' : 'Uruchom'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {isNewPartModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/30 p-4" onClick={() => setIsNewPartModalOpen(false)}>
          <div className="bg-white rounded shadow-xl w-full max-w-sm overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider">Nowy asortyment</h3>
              <button onClick={() => setIsNewPartModalOpen(false)} className="text-slate-400 hover:text-slate-800 transition-colors">✕</button>
            </div>
            <form onSubmit={handleCreatePart} className="p-4 space-y-3">
              <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">SKU / Index</label><input required value={newPart.sku} onChange={e => setNewPart({...newPart, sku: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-xs font-mono uppercase focus:border-[#58b347] outline-none" /></div>
              <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Nazwa części</label><input required value={newPart.name} onChange={e => setNewPart({...newPart, name: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-xs font-semibold focus:border-[#58b347] outline-none" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Kategoria</label><select value={newPart.category} onChange={e => setNewPart({...newPart, category: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-xs focus:border-[#58b347] outline-none"><option>Część zamienna</option><option>Narzędzie</option><option>Materiał eksploatacyjny</option></select></div>
                <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">J.M.</label><select value={newPart.unit} onChange={e => setNewPart({...newPart, unit: e.target.value})} className="w-full border border-slate-300 rounded p-2 text-xs focus:border-[#58b347] outline-none"><option>szt.</option><option>mb</option><option>kpl.</option></select></div>
              </div>
              <div><label className="block text-[10px] font-bold uppercase text-slate-500 mb-1">Stan Centralny</label><input type="number" min="0" required value={newPart.main_stock} onChange={e => setNewPart({...newPart, main_stock: parseInt(e.target.value) || 0})} className="w-full border border-slate-300 rounded p-2 text-xs font-bold focus:border-[#58b347] outline-none" /></div>
              <div className="flex gap-2 pt-3">
                <button type="button" onClick={() => setIsNewPartModalOpen(false)} className="flex-1 border border-slate-300 text-slate-600 font-bold py-2 rounded text-xs hover:bg-slate-50 transition-colors">Anuluj</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-bold py-2 rounded text-xs hover:bg-[#499b3a] transition-colors">Zapisz</button>
              </div>
            </form>
          </div>
        </div>
      )}
      
    </div>
  );
}