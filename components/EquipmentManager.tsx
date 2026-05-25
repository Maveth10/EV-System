'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../app/supabase';

// --- TYPY ---
type Part = { 
  id: string; 
  sku: string; 
  name: string; 
  category: string; 
  unit: string; 
  main_stock: number; 
  inspection_date?: string | null; 
  vehicle_type?: string | null; 
  vehicle_plate?: string | null; 
  serial_number?: string | null;
  insurance_date?: string | null;
  service_status?: string | null;
  notes?: string | null;
};
type Technician = { id: string; name: string; car_plate?: string | null; car_category?: string | null; sep_expiry?: string | null; contract_expiry?: string | null; color?: string; };
type TechInventory = { id: string; technician_id: string; part_id: string; quantity: number; };
type Log = { id: string; part_id: string; technician_id: string; operation_type: string; quantity: number; created_at: string; notes?: string; };

type SortConfig = { key: keyof Technician | 'stationCount'; direction: 'asc' | 'desc' } | null;

// --- IKONY BAZOWE ---
const IconSort = () => <svg className="w-3.5 h-3.5 inline-block ml-1 opacity-40 hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>;
const IconTrash = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconEdit = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconImport = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const IconMapPin = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconSearch = () => <svg className="w-4 h-4 text-[#58b347]/60 absolute left-3 top-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconArrowLeft = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const IconArrowRight = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
const IconChevronDown = () => <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const IconChevronUp = () => <svg className="w-4 h-4 text-[#58b347]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const IconLayers = () => <svg className="w-5 h-5 text-[#58b347]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IconTool = () => <svg className="w-3.5 h-3.5 text-[#58b347]/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
const IconDrop = () => <svg className="w-3.5 h-3.5 text-[#58b347]/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>;
const IconAlert = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconCar = () => <svg className="w-4 h-4 text-[#58b347]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="10" width="18" height="8" rx="2" ry="2"/><path d="M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>;
const IconPlus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const IconInfo = () => <svg className="w-6 h-6 text-[#58b347]/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconPackage = () => <svg className="w-5 h-5 text-[#58b347]/70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
const IconTruck = () => <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;
const IconHistory = () => <svg className="w-5 h-5 text-indigo-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
const IconCheck = () => <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconCalendar = () => <svg className="w-3.5 h-3.5 text-slate-400 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconShield = () => <svg className="w-3.5 h-3.5 text-slate-400 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;

// --- KOMPONENTY WSPOMAGAJĄCE ---
const CustomCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-4 h-4 rounded-[4px] flex items-center justify-center cursor-pointer transition-colors duration-200 ${checked ? 'bg-[#58b347] border-[#58b347]' : 'border border-slate-300 bg-white hover:border-[#58b347]/50'}`}
  >
    {checked && <IconCheck />}
  </div>
);

// --- FUNKCJE POMOCNICZE ---
const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const getExpiryStatus = (dateString: string | null | undefined) => {
  if (!dateString) return { text: 'Brak', badge: 'bg-slate-50 text-slate-400 border-slate-200', isExpired: false, isExpiring: false };
  const expiryDate = new Date(dateString);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `Po terminie!`, badge: 'bg-red-50 text-red-700 border-red-200 animate-pulse', isExpired: true, isExpiring: false };
  if (diffDays <= 30) return { text: `Wkrótce (${diffDays}d)`, badge: 'bg-orange-50 text-orange-700 border-orange-200', isExpired: false, isExpiring: true };
  return { text: new Date(dateString).toLocaleDateString(), badge: 'bg-[#58b347]/10 text-[#499b3a] border-[#58b347]/20', isExpired: false, isExpiring: false };
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

interface EquipmentManagerProps {
  isSidebarHovered?: boolean;
}

export default function EquipmentManager({ isSidebarHovered = false }: EquipmentManagerProps) {
  const [activeTab, setActiveTab] = useState<'central' | 'mobile' | 'logs'>('central');
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
  const [showOnlyExpiring, setShowOnlyExpiring] = useState(false);
  
  // Akordeony Centralne
  const [centralExpandedCats, setCentralExpandedCats] = useState<string[]>(['Pojazd', 'Narzędzie', 'Część zamienna', 'Materiał eksploatacyjny']);

  // Modale
  const [isNewPartModalOpen, setIsNewPartModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<Part | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [issueModalPart, setIssueModalPart] = useState<Part | null>(null);

  // Formularze
  const [newPart, setNewPart] = useState({ 
    sku: '', name: '', category: 'Część zamienna', unit: 'szt.', main_stock: 0, 
    inspection_date: '', vehicle_type: 'Osobowy', vehicle_plate: '', serial_number: '',
    insurance_date: '', service_status: 'Sprawny', notes: ''
  });
  const [issueForm, setIssueForm] = useState({ technician_id: '', quantity: 1, type: 'WYDANIE' as 'WYDANIE' | 'DOSTAWA' | 'ZWROT' });
  const [sheetUrl, setSheetUrl] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  // Pobieranie danych
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [partsRes, techRes, invRes, logsRes] = await Promise.all([
      supabase.from('parts').select('*').order('name'),
      supabase.from('technicians').select('id, name, color').order('name'),
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
  }, []);

  useEffect(() => { 
    fetchData(); 

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNewPartModalOpen(false);
        setEditingPart(null);
        setIsImportModalOpen(false);
        setIssueModalPart(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fetchData]);

  // Resetowanie Hovera przy zmianie zakładki
  useEffect(() => { setHoveredPartId(null); }, [activeTab]);

  // --- LOGIKA BIZNESOWA ---
  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...newPart };
    
    // Czyszczenie i dopasowywanie pól wg Kategorii
    if (payload.category === 'Część zamienna' || payload.category === 'Materiał eksploatacyjny' || payload.category === 'Inne') {
      payload.inspection_date = null;
      payload.insurance_date = null;
      payload.service_status = null;
      payload.vehicle_type = null;
      payload.vehicle_plate = null;
      payload.serial_number = null;
    }
    if (payload.category === 'Narzędzie') {
      payload.insurance_date = null;
      payload.vehicle_type = null;
      payload.vehicle_plate = null;
      if (!payload.service_status) payload.service_status = 'Sprawny';
    }
    if (payload.category === 'Pojazd') {
      payload.serial_number = null;
      payload.unit = 'szt.';
      if (!payload.service_status) payload.service_status = 'Sprawny';
    }

    // Zamiana pustych tekstów dat na null, żeby baza Postgresa się nie obraziła
    if (!payload.inspection_date) payload.inspection_date = null;
    if (!payload.insurance_date) payload.insurance_date = null;

    // Blokada ilości na 1 dla pojazdów i narzędzi z wpisanym numerem
    const isUnique = (payload.category === 'Pojazd' && payload.vehicle_plate?.trim()) || 
                     (payload.category === 'Narzędzie' && payload.serial_number?.trim());
                     
    if (isUnique) {
      payload.main_stock = 1;
    }

    const { error } = await supabase.from('parts').insert([payload]);
    if (error) alert(`Błąd: ${error.message}`);
    else { 
      setIsNewPartModalOpen(false); 
      setNewPart({ sku: '', name: '', category: 'Część zamienna', unit: 'szt.', main_stock: 0, inspection_date: '', vehicle_type: 'Osobowy', vehicle_plate: '', serial_number: '', insurance_date: '', service_status: 'Sprawny', notes: '' }); 
      fetchData(); 
    }
  };

  const handleUpdatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;
    const payload = { ...editingPart };

    if (payload.category === 'Część zamienna' || payload.category === 'Materiał eksploatacyjny' || payload.category === 'Inne') {
      payload.inspection_date = null;
      payload.insurance_date = null;
      payload.service_status = null;
      payload.vehicle_type = null;
      payload.vehicle_plate = null;
      payload.serial_number = null;
    }
    if (payload.category === 'Narzędzie') {
      payload.insurance_date = null;
      payload.vehicle_type = null;
      payload.vehicle_plate = null;
      if (!payload.service_status) payload.service_status = 'Sprawny';
    }
    if (payload.category === 'Pojazd') {
      payload.serial_number = null;
      payload.unit = 'szt.';
      if (!payload.service_status) payload.service_status = 'Sprawny';
    }

    // Zamiana pustych tekstów dat na null, żeby baza Postgresa się nie obraziła
    if (!payload.inspection_date) payload.inspection_date = null;
    if (!payload.insurance_date) payload.insurance_date = null;

    const isUnique = (payload.category === 'Pojazd' && payload.vehicle_plate?.trim()) || 
                     (payload.category === 'Narzędzie' && payload.serial_number?.trim());

    if (isUnique) {
      payload.main_stock = 1;
    }

    const { error } = await supabase.from('parts').update(payload).eq('id', editingPart.id);
    if (error) alert(`Błąd: ${error.message}`);
    else { setEditingPart(null); fetchData(); }
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
      await supabase.from('inventory_logs').insert([{ part_id: issueModalPart.id, technician_id: issueForm.technician_id, operation_type: 'WYDANIE', quantity: issueForm.quantity, notes: 'Wydanie sprzętu' }]);
    
    } else if (issueForm.type === 'DOSTAWA') {
      await supabase.from('parts').update({ main_stock: issueModalPart.main_stock + issueForm.quantity }).eq('id', issueModalPart.id);
      await supabase.from('inventory_logs').insert([{ part_id: issueModalPart.id, operation_type: 'DOSTAWA', quantity: issueForm.quantity, notes: 'Dostawa zewnętrzna' }]);
    
    } else if (issueForm.type === 'ZWROT') {
      if (!issueForm.technician_id) return;
      const existing = techInventory.find(i => i.technician_id === issueForm.technician_id && i.part_id === issueModalPart.id);
      
      if (!existing || existing.quantity < issueForm.quantity) { alert("Błąd: Próbujesz zwrócić więcej niż technik posiada na aucie!"); return; }

      await supabase.from('technician_inventory').update({ quantity: existing.quantity - issueForm.quantity }).eq('id', existing.id);
      await supabase.from('parts').update({ main_stock: issueModalPart.main_stock + issueForm.quantity }).eq('id', issueModalPart.id);
      await supabase.from('inventory_logs').insert([{ part_id: issueModalPart.id, technician_id: issueForm.technician_id, operation_type: 'ZWROT', quantity: issueForm.quantity, notes: 'Zwrot z terenu na magazyn główny' }]);
    }

    setIssueModalPart(null);
    fetchData();
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
  const filteredParts = useMemo(() => {
    let result = parts;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.serial_number && p.serial_number.toLowerCase().includes(q)) || (p.vehicle_plate && p.vehicle_plate.toLowerCase().includes(q)));
    }
    if (showOnlyExpiring) {
      result = result.filter(p => {
        const insp = p.inspection_date ? getExpiryStatus(p.inspection_date) : null;
        const ins = p.insurance_date ? getExpiryStatus(p.insurance_date) : null;
        return (insp && (insp.isExpired || insp.isExpiring)) || (ins && (ins.isExpired || ins.isExpiring));
      });
    }
    return result;
  }, [parts, searchQuery, showOnlyExpiring]);

  const centralSummary = useMemo(() => {
    const groups: Record<string, Part[]> = { 'Pojazd': [], 'Narzędzie': [], 'Część zamienna': [], 'Materiał eksploatacyjny': [], 'Inne': [] };
    filteredParts.forEach(p => {
      const c = p.category || 'Inne';
      if (groups[c]) groups[c].push(p); else groups['Inne'].push(p);
    });
    Object.keys(groups).forEach(k => groups[k].sort((a, b) => a.name.localeCompare(b.name)));
    return groups;
  }, [filteredParts]);

  const filteredTechInventory = useMemo(() => {
    if (!searchQuery) return techInventory;
    const q = searchQuery.toLowerCase();
    return techInventory.filter(item => {
      const p = parts.find(x => x.id === item.part_id);
      return p && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.serial_number && p.serial_number.toLowerCase().includes(q)) || (p.vehicle_plate && p.vehicle_plate.toLowerCase().includes(q)));
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

    const groups: Record<string, typeof sum[string][]> = { 'Pojazd': [], 'Narzędzie': [], 'Część zamienna': [], 'Materiał eksploatacyjny': [], 'Inne': [] };
    Object.values(sum).forEach(i => {
      const c = i.part.category || 'Inne';
      if (groups[c]) groups[c].push(i); else groups['Inne'].push(i);
    });
    Object.keys(groups).forEach(k => groups[k].sort((a, b) => a.part.name.localeCompare(b.part.name)));
    return groups;
  }, [filteredTechInventory, parts, technicians]);

  // Automatyczne zaznaczenie pierwszego elementu po załadowaniu
  useEffect(() => {
    if (activeTab === 'mobile' && !hoveredPartId && Object.keys(mobileSummary).length > 0) {
      for (const cat of Object.keys(mobileSummary)) {
        if (mobileSummary[cat].length > 0) {
          setHoveredPartId(mobileSummary[cat][0].part.id);
          break;
        }
      }
    }
  }, [activeTab, mobileSummary, hoveredPartId]);

  const activePartDetails = useMemo(() => {
    if (!hoveredPartId) return null;
    const part = parts.find(p => p.id === hoveredPartId);
    if (!part) return null;
    
    const breakdown = techInventory
      .filter(i => i.part_id === part.id && i.quantity > 0)
      .map(i => ({ tech: technicians.find(t => t.id === i.technician_id)!, qty: i.quantity }))
      .filter(b => b.tech);
      
    const totalInField = breakdown.reduce((sum, b) => sum + b.qty, 0);
    return { part, total: totalInField, breakdown };
  }, [hoveredPartId, parts, techInventory, technicians]);

  const getCategoryIcon = (category: string) => {
    if (category === 'Narzędzie') return <IconTool />;
    if (category === 'Materiał eksploatacyjny') return <IconDrop />;
    if (category === 'Pojazd') return <IconTruck />;
    return <IconPackage />;
  };

  // Blokada techników (Wodotrysk): Znajdujemy techników, którzy mają przypisany uszkodzony/serwisowany pojazd lub narzędzie
  const techniciansWithBrokenItems = useMemo(() => {
    const brokenItemIds = parts.filter(p => p.service_status === 'W serwisie' || p.service_status === 'Uszkodzony').map(p => p.id);
    return techInventory.filter(inv => brokenItemIds.includes(inv.part_id) && inv.quantity > 0).map(inv => inv.technician_id);
  }, [parts, techInventory]);

  // KPI
  const totalPartsInField = useMemo(() => techInventory.reduce((acc, curr) => acc + (curr.quantity || 0), 0), [techInventory]);
  const lowStockAlerts = useMemo(() => parts.filter(p => p.main_stock === 0).length, [parts]);
  const expiringPartsCount = useMemo(() => parts.filter(p => {
    const insp = p.inspection_date ? getExpiryStatus(p.inspection_date) : null;
    const ins = p.insurance_date ? getExpiryStatus(p.insurance_date) : null;
    return (insp && (insp.isExpired || insp.isExpiring)) || (ins && (ins.isExpired || ins.isExpiring));
  }).length, [parts]);

  // Dynamiczne renderowanie formularza dodawania / edycji z Siatką Grid
  const renderFormFields = (isEdit: boolean) => {
    const formState = isEdit ? editingPart! : newPart;
    const setFormState = isEdit ? setEditingPart : setNewPart;
    
    const cat = formState.category;
    const isVehicle = cat === 'Pojazd';
    const isTool = cat === 'Narzędzie';
    
    const isUnique = (isVehicle && formState.vehicle_plate && formState.vehicle_plate.trim().length > 0) || 
                     (isTool && formState.serial_number && formState.serial_number.trim().length > 0);

    return (
      <div className="grid grid-cols-12 gap-5">
        
        {/* Wiersz 1: Kategoria, SKU, Nazwa */}
        <div className="col-span-12 sm:col-span-4">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Kategoria asortymentu</label>
          <select 
            value={formState.category} 
            onChange={e => setFormState({...formState, category: e.target.value} as any)} 
            className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm font-bold text-[#58b347] focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer"
          >
            <option>Materiał eksploatacyjny</option>
            <option>Część zamienna</option>
            <option>Narzędzie</option>
            <option>Pojazd</option>
            <option>Inne</option>
          </select>
        </div>

        <div className="col-span-12 sm:col-span-3">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">SKU / Index *</label>
          <input required value={formState.sku} onChange={e => setFormState({...formState, sku: e.target.value.toUpperCase()} as any)} className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
        </div>
        
        <div className="col-span-12 sm:col-span-5">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nazwa / Model *</label>
          <input required value={formState.name} onChange={e => setFormState({...formState, name: e.target.value} as any)} className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
        </div>
        
        {/* Wiersz 2 (Opcjonalny): Pola dla NARZĘDZI I POJAZDÓW */}
        {(isVehicle || isTool) && (
          <div className="col-span-12 grid grid-cols-12 gap-5 p-4 bg-slate-50 border border-slate-100 rounded-xl shadow-inner">
            <div className={`col-span-12 ${isVehicle ? 'sm:col-span-3' : 'sm:col-span-4'}`}>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{isVehicle ? 'Nr Rejestracyjny' : 'Nr seryjny (S/N)'}</label>
              <input 
                value={isVehicle ? (formState.vehicle_plate || '') : (formState.serial_number || '')} 
                onChange={e => isVehicle ? setFormState({...formState, vehicle_plate: e.target.value.toUpperCase()} as any) : setFormState({...formState, serial_number: e.target.value.toUpperCase()} as any)} 
                className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" 
                placeholder="Opcjonalnie..." 
              />
            </div>

            {isVehicle && (
              <div className="col-span-12 sm:col-span-3">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Typ nadwozia</label>
                <select value={formState.vehicle_type || 'Van / Bus'} onChange={e => setFormState({...formState, vehicle_type: e.target.value} as any)} className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer">
                  <option>Van / Bus</option>
                  <option>Osobowy</option>
                  <option>Kombi</option>
                  <option>Podnośnik koszowy</option>
                  <option>Inne</option>
                </select>
              </div>
            )}

            <div className={`col-span-12 ${isVehicle ? 'sm:col-span-2' : 'sm:col-span-4'}`}>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Status</label>
              <select value={formState.service_status || 'Sprawny'} onChange={e => setFormState({...formState, service_status: e.target.value} as any)} className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer">
                <option>Sprawny</option>
                <option>W serwisie</option>
                <option>Uszkodzony</option>
              </select>
            </div>

            <div className={`col-span-12 ${isVehicle ? 'sm:col-span-2' : 'sm:col-span-4'}`}>
              <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{isVehicle ? 'Ważność UDT' : 'Kalibracja/UDT'}</label>
              <input type="date" value={formState.inspection_date || ''} onChange={e => setFormState({...formState, inspection_date: e.target.value} as any)} className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-[10px] font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm text-slate-700" />
            </div>

            {isVehicle && (
              <div className="col-span-12 sm:col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Polisa OC/AC</label>
                <input type="date" value={formState.insurance_date || ''} onChange={e => setFormState({...formState, insurance_date: e.target.value} as any)} className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-[10px] font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm text-slate-700" />
              </div>
            )}
          </div>
        )}

        {/* Wiersz 3: J.M, Ilość, Uwagi */}
        <div className="col-span-12 sm:col-span-2">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">J.M.</label>
          <select value={isVehicle ? 'szt.' : formState.unit} disabled={isVehicle} onChange={e => setFormState({...formState, unit: e.target.value} as any)} className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer disabled:opacity-50">
            <option>szt.</option>
            <option>mb</option>
            <option>kpl.</option>
          </select>
        </div>

        <div className="col-span-12 sm:col-span-3">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Magazyn (Centrala)</label>
          <div className="relative">
            <input 
              type="number" 
              min={isUnique ? "1" : "0"} 
              max={isUnique ? "1" : undefined}
              disabled={isUnique}
              required 
              value={isUnique ? 1 : formState.main_stock} 
              onChange={e => {
                if (isUnique) return;
                setFormState({...formState, main_stock: parseInt(e.target.value) || 0} as any);
              }} 
              className={`w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm text-center ${isUnique ? 'text-slate-400 opacity-60 cursor-not-allowed bg-slate-50' : 'text-slate-800'}`} 
            />
            {isUnique && <div className="absolute top-1/2 left-2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-400 animate-pulse" title="Blokada na 1 szt. ze względu na wpisany numer"></div>}
          </div>
        </div>

        <div className="col-span-12 sm:col-span-7">
          <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Uwagi / Notatki</label>
          <textarea rows={1} value={formState.notes || ''} onChange={e => setFormState({...formState, notes: e.target.value} as any)} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm resize-none" placeholder="Opcjonalne informacje o sprzęcie..." />
        </div>

      </div>
    );
  };

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-100/60 backdrop-blur-2xl border-l border-white/20 z-40 overflow-hidden flex flex-col font-sans transition-all duration-300 ease-out shadow-[-10px_0_30px_rgba(0,0,0,0.05)]">
      
      {/* Pasek nawigacji górnej */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/40 px-6 py-4 flex items-center justify-between shrink-0">
        <div className={`transition-all duration-300 ease-in-out ${isSidebarHovered ? 'ml-[184px]' : 'ml-0'}`}>
          <h1 className="text-xl font-bold tracking-tight text-slate-800">Magazyn i Flota</h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Logistyka zasobów centralnych, mobilnych i pojazdów.</p>
        </div>
        
        <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/60 shadow-inner backdrop-blur-md">
          <button onClick={() => setActiveTab('central')} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'central' ? 'bg-white shadow-sm border border-slate-200 text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}><IconPackage /> Centralny</button>
          <button onClick={() => setActiveTab('mobile')} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'mobile' ? 'bg-white shadow-sm border border-slate-200 text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}><IconTruck /> W Terenie</button>
          <button onClick={() => setActiveTab('logs')} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-white shadow-sm border border-slate-200 text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}><IconHistory /> Historia</button>
        </div>
      </div>

      {/* Kontener Główny */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="flex w-full h-full items-center justify-center text-sm font-bold text-slate-400">Ładowanie bazy danych...</div>
        ) : (
          <div className="h-full w-full max-w-[1500px] mx-auto p-6 flex flex-col gap-6">
            
            {/* KPI Dashboard */}
            <div className="grid grid-cols-3 gap-6 shrink-0">
              <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Katalog (Unikalne pozycje)</p>
                  <p className="text-3xl font-bold text-slate-700">{parts.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#58b347]/10 flex items-center justify-center text-[#58b347]">
                  <IconPackage />
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sprzęt w terenie</p>
                  <p className="text-3xl font-bold text-slate-700">{totalPartsInField}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#58b347]/10 text-[#58b347] flex items-center justify-center">
                  <IconTruck />
                </div>
              </div>

              <div className={`bg-white/80 backdrop-blur-md border ${lowStockAlerts > 0 ? 'border-red-200' : 'border-white/60'} rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between`}>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Krytyczne braki magazynowe</p>
                  <p className={`text-3xl font-bold ${lowStockAlerts > 0 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>{lowStockAlerts}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${lowStockAlerts > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                  <IconAlert />
                </div>
              </div>
            </div>

            {/* WIDOK: MAGAZYN CENTRALNY I W TERENIE KORZYSTAJĄ Z TEGO SAMEGO LAYOUTU BAZOWEGO */}
            {(activeTab === 'central' || activeTab === 'mobile') && (
              <div className="flex w-full h-full gap-6 flex-1 overflow-hidden">
                
                {/* Lewa kolumna: Lista (Centralna lub Mobilna) */}
                <div className="flex-1 flex flex-col h-full bg-white/95 backdrop-blur-sm border border-white/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
                  
                  {activeTab === 'central' && expiringPartsCount > 0 && (
                    <div className="bg-orange-50/90 backdrop-blur-md border-b border-orange-200 p-4 flex justify-between items-center shrink-0">
                      <div className="flex gap-3 items-center text-orange-700">
                        <div className="p-2 bg-orange-100 rounded-full"><IconAlert /></div>
                        <div>
                          <h4 className="font-bold text-sm">Wymagane akcje logistyczne!</h4>
                          <p className="text-xs font-medium opacity-90">Znaleziono {expiringPartsCount} pozycji (pojazdów lub narzędzi) ze zbliżającym się terminem UDT/Ubezpieczenia.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setShowOnlyExpiring(!showOnlyExpiring)} 
                        className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm ${showOnlyExpiring ? 'bg-white text-orange-700 border border-orange-200' : 'bg-orange-500 text-white border border-orange-600 hover:bg-orange-600'}`}
                      >
                        {showOnlyExpiring ? 'Pokaż pełny katalog' : 'Izoluj wygasające'}
                      </button>
                    </div>
                  )}

                  <div className="p-5 border-b border-slate-100/60 bg-white shrink-0 flex justify-between items-center">
                    <div className="relative w-full max-w-[320px]">
                      <IconSearch />
                      <input 
                        type="text" 
                        placeholder={activeTab === 'central' ? "Szukaj po SKU, nazwie..." : "Wyszukaj sprzęt w autach..."}
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 shadow-sm transition-all bg-white"
                      />
                    </div>
                    {activeTab === 'central' && (
                      <div className="flex gap-3">
                        <button onClick={() => setIsImportModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors">
                          <IconImport /> Import CSV
                        </button>
                        <button onClick={() => setIsNewPartModalOpen(true)} className="bg-[#58b347] text-white border border-[#499b3a] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#499b3a] flex items-center gap-2 shadow-sm transition-colors">
                          <IconPlus /> Dodaj asortyment
                        </button>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide bg-slate-50/30">
                    
                    {/* WIDOK: CENTRALNY - Akordeony po kategoriach */}
                    {activeTab === 'central' && ['Pojazd', 'Narzędzie', 'Część zamienna', 'Materiał eksploatacyjny', 'Inne'].map(cat => {
                      const catParts = centralSummary[cat];
                      if (!catParts || catParts.length === 0) return null;
                      const isOpen = centralExpandedCats.includes(cat);

                      return (
                        <div key={cat} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                          <button 
                            onClick={() => setCentralExpandedCats(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat])}
                            className={`w-full px-5 py-4 flex justify-between items-center hover:bg-slate-50 transition-colors ${isOpen ? 'border-b border-slate-100 bg-slate-50/50' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="text-[#58b347]">{getCategoryIcon(cat)}</div>
                              <span className="text-xs font-bold uppercase tracking-widest text-slate-800">{cat}</span>
                              <span className="text-[10px] font-bold bg-white border border-slate-200 px-2 py-0.5 rounded-md text-slate-500 shadow-sm">{catParts.length}</span>
                            </div>
                            <span className="text-slate-400">{isOpen ? <IconChevronUp /> : <IconChevronDown />}</span>
                          </button>
                          
                          {isOpen && (
                            <div className="flex flex-col w-full overflow-hidden">
                              <div className="flex bg-slate-50 border-b border-slate-200 text-[9px] font-bold text-slate-400 uppercase tracking-widest px-5 py-2.5">
                                <div className="w-1/4">SKU / Index</div>
                                <div className="w-1/3">Asortyment / Nr Seryjny</div>
                                <div className="w-1/4">Status / Ważność</div>
                                <div className="w-24 text-center">Stan</div>
                                <div className="flex-1 text-right">Akcje</div>
                              </div>
                              <div className="divide-y divide-slate-100/60 flex flex-col">
                                {catParts.map(p => {
                                  const inspExpiry = getExpiryStatus(p.inspection_date);
                                  const insExpiry = getExpiryStatus(p.insurance_date);
                                  const isVehicle = p.category === 'Pojazd';
                                  const isTool = p.category === 'Narzędzie';
                                  const hasSerial = !!p.serial_number;
                                  const isBroken = p.service_status === 'W serwisie' || p.service_status === 'Uszkodzony';
                                  
                                  return (
                                    <div 
                                      key={p.id} 
                                      onMouseEnter={() => setHoveredPartId(p.id)}
                                      className="relative flex items-start px-5 py-4 group hover:bg-[#58b347]/5 border-b border-slate-50 last:border-0 cursor-pointer transition-colors"
                                    >
                                      {/* ABSOLUTNY WSKAŹNIK HOVER - Zawsze działa! */}
                                      <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${hoveredPartId === p.id ? 'bg-[#58b347]' : 'bg-transparent group-hover:bg-[#58b347]'}`} />
                                      
                                      <div className="w-1/4 pr-4 pt-1">
                                        <span className="font-mono font-bold text-slate-400 uppercase tracking-wider text-xs">{p.sku}</span>
                                      </div>
                                      
                                      <div className="w-1/3 pr-4">
                                        <div className="flex items-center gap-2 mb-1.5">
                                          <span className="text-sm font-bold text-slate-800 leading-tight">{p.name}</span>
                                          <button onClick={(e) => { e.stopPropagation(); setEditingPart(p); }} className="text-slate-300 hover:text-[#58b347] transition-colors p-1" title="Edytuj kartotekę"><IconEdit /></button>
                                        </div>
                                        {hasSerial && (
                                          <span className="text-[10px] font-bold font-mono text-slate-500 uppercase flex items-center gap-1 w-max border border-slate-200 bg-white px-2 py-0.5 rounded shadow-sm">
                                            <IconTool /> S/N: {p.serial_number}
                                          </span>
                                        )}
                                      </div>
                                      
                                      <div className="w-1/4 pr-4 flex flex-col gap-1.5 pt-1">
                                        {isVehicle && p.vehicle_type && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded uppercase tracking-wider w-max">{p.vehicle_type}</span>}
                                        
                                        {(isVehicle || isTool) && p.service_status && p.service_status !== 'Sprawny' && (
                                          <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest w-max ${p.service_status === 'Uszkodzony' ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>
                                            Status: {p.service_status}
                                          </span>
                                        )}

                                        {['Pojazd', 'Narzędzie'].includes(p.category) && p.inspection_date && (
                                          <div className="flex items-center gap-1.5">
                                            <IconCalendar />
                                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest whitespace-nowrap ${inspExpiry.badge}`}>
                                              Przegląd: {inspExpiry.text}
                                            </span>
                                          </div>
                                        )}
                                        
                                        {isVehicle && p.insurance_date && (
                                          <div className="flex items-center gap-1.5">
                                            <IconShield />
                                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest whitespace-nowrap ${insExpiry.badge}`}>
                                              OC/AC: {insExpiry.text}
                                            </span>
                                          </div>
                                        )}
                                      </div>

                                      <div className="w-24 text-center shrink-0 flex flex-col items-center pt-1">
                                        {p.main_stock === 0 ? (
                                          <span className="inline-flex px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-bold border border-red-200 uppercase tracking-widest animate-pulse mb-1">Braki</span>
                                        ) : p.main_stock < 5 ? (
                                          <span className="inline-flex px-2 py-0.5 bg-orange-50 text-orange-600 rounded text-[9px] font-bold border border-orange-200 uppercase tracking-widest mb-1">Niski Stan</span>
                                        ) : (
                                          <span className="inline-flex px-2 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-bold border border-green-200 uppercase tracking-widest mb-1">Dostępne</span>
                                        )}
                                        <span className={`text-lg font-bold tabular-nums ${p.main_stock === 0 ? 'text-red-500' : 'text-slate-800'}`}>
                                          {p.main_stock} <span className="font-bold text-[10px] text-slate-400 uppercase">{p.unit}</span>
                                        </span>
                                      </div>

                                      <div className="flex-1 text-right flex flex-col items-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                                        <button onClick={() => { setIssueForm({ ...issueForm, type: 'DOSTAWA' }); setIssueModalPart(p); }} className="text-[10px] font-bold border border-slate-200 bg-white text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 shadow-sm transition-colors uppercase tracking-wider w-full text-center">
                                          + Dostawa
                                        </button>
                                        <button 
                                          onClick={() => { setIssueForm({ ...issueForm, type: 'WYDANIE' }); setIssueModalPart(p); }} 
                                          disabled={p.main_stock === 0 || isBroken} 
                                          className={`text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors uppercase tracking-wider flex items-center justify-center gap-1 w-full ${isBroken ? 'border border-red-200 bg-red-50 text-red-500 opacity-60 cursor-not-allowed' : 'border border-[#58b347] bg-[#58b347] text-white hover:bg-[#499b3a] disabled:opacity-40 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400'}`}
                                          title={isBroken ? 'Wydanie zablokowane ze względu na status serwisowy!' : ''}
                                        >
                                          Wydaj <IconArrowRight />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {activeTab === 'central' && Object.keys(centralSummary).every(k => centralSummary[k].length === 0) && (
                      <div className="text-center p-12 text-sm text-slate-400 font-bold bg-white rounded-xl border border-slate-200 shadow-sm">
                        Brak pozycji spełniających kryteria.
                      </div>
                    )}

                    {/* WIDOK: W TERENIE - Suma pojazdów */}
                    {activeTab === 'mobile' && (
                      <div className="bg-white border border-[#58b347]/20 rounded-xl shadow-sm overflow-hidden mb-4">
                        <button 
                          onClick={() => setIsSummaryExpanded(!isSummaryExpanded)} 
                          className="w-full px-5 py-4 flex justify-between items-center bg-[#58b347]/5 hover:bg-[#58b347]/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <IconLayers />
                            <span className="text-xs font-bold uppercase tracking-widest text-slate-700">Suma sprzętu we wszystkich pojazdach</span>
                          </div>
                          <span className="text-[#58b347]">{isSummaryExpanded ? <IconChevronUp /> : <IconChevronDown />}</span>
                        </button>
                        
                        {isSummaryExpanded && (
                          <div className="max-h-[40vh] overflow-y-auto bg-white scrollbar-hide">
                            {['Pojazd', 'Narzędzie', 'Część zamienna', 'Materiał eksploatacyjny', 'Inne'].map(cat => {
                              const items = mobileSummary[cat];
                              if (!items || items.length === 0) return null;
                              return (
                                <div key={cat}>
                                  <div className="bg-slate-50 px-5 py-2.5 text-[10px] font-bold text-[#58b347] uppercase border-b border-t border-slate-100 flex items-center gap-2 sticky top-0 z-10 tracking-widest">
                                    {getCategoryIcon(cat)} {cat}
                                  </div>
                                  <div className="flex flex-col">
                                    {items.map(item => (
                                      <div 
                                        key={item.part.id}
                                        onMouseEnter={() => setHoveredPartId(item.part.id)}
                                        className="relative flex items-center justify-between px-6 py-3 cursor-pointer group hover:bg-[#58b347]/5 border-b border-slate-50 last:border-0 transition-colors"
                                      >
                                        {/* ABSOLUTNY WSKAŹNIK HOVER */}
                                        <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${hoveredPartId === item.part.id ? 'bg-[#58b347]' : 'bg-transparent group-hover:bg-[#58b347]'}`} />
                                        
                                        <div className="flex flex-col min-w-0 pr-4 w-2/3">
                                          <span className="text-sm font-bold text-slate-800 leading-tight">{item.part.name}</span>
                                          <span className="text-[10px] font-bold text-slate-400 font-mono mt-1 uppercase tracking-wider">
                                            {item.part.sku} 
                                          </span>
                                        </div>
                                        <div className="text-lg font-bold text-slate-800 tabular-nums bg-white border border-slate-200 px-3 py-1 rounded-lg shadow-sm shrink-0">
                                          {item.total} <span className="text-[10px] font-bold text-slate-400 uppercase">{item.part.unit}</span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                            {Object.keys(mobileSummary).every(k => mobileSummary[k].length === 0) && (
                              <div className="text-center p-6 text-sm text-slate-400 font-bold">Brak wyników.</div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* WIDOK: W TERENIE - Bagażniki techników */}
                    {activeTab === 'mobile' && (
                      <>
                        <div className="flex items-center gap-4 py-2 opacity-60">
                          <div className="h-px bg-slate-300 flex-1"></div>
                          <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Ekwipunek poszczególnych techników</h2>
                          <div className="h-px bg-slate-300 flex-1"></div>
                        </div>
                        
                        <div className="space-y-3 pb-8">
                          {technicians.map(tech => {
                            const techItems = filteredTechInventory.filter(i => i.technician_id === tech.id && i.quantity > 0);
                            const isOpen = expandedTechIds.includes(tech.id);
                            if (searchQuery && techItems.length === 0) return null;

                            const groups: Record<string, TechInventory[]> = { 'Pojazd': [], 'Narzędzie': [], 'Część zamienna': [], 'Materiał eksploatacyjny': [], 'Inne': [] };
                            techItems.forEach(item => {
                              const c = parts.find(p => p.id === item.part_id)?.category || 'Inne';
                              if (groups[c]) groups[c].push(item); else groups['Inne'].push(item);
                            });

                            return (
                              <div key={tech.id} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <div 
                                  onClick={() => setExpandedTechIds(p => p.includes(tech.id) ? p.filter(id => id !== tech.id) : [...p, tech.id])}
                                  className={`w-full px-5 py-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer border-b border-slate-100 transition-colors ${isOpen ? 'bg-slate-50' : ''}`}
                                >
                                  <div className="flex items-center gap-4">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold bg-[#58b347]">
                                      {getInitials(tech.name)}
                                    </div>
                                    <div>
                                      <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        {tech.name}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 text-xs font-bold text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                                    <span>Poz: {techItems.length}</span>
                                    <span className="text-[#58b347]">{isOpen ? <IconChevronUp /> : <IconChevronDown />}</span>
                                  </div>
                                </div>

                                {isOpen && (
                                  <div className="pb-2">
                                    {['Pojazd', 'Narzędzie', 'Część zamienna', 'Materiał eksploatacyjny', 'Inne'].map(cat => {
                                      const items = groups[cat];
                                      if (!items || items.length === 0) return null;
                                      return (
                                        <div key={cat}>
                                          <div className="bg-slate-50 px-5 py-2 text-[9px] font-bold text-[#58b347] uppercase border-b border-t border-slate-100 flex items-center gap-1.5 tracking-widest">{getCategoryIcon(cat)} {cat}</div>
                                          <div className="flex flex-col">
                                            {items.map(item => {
                                              const p = parts.find(x => x.id === item.part_id);
                                              if (!p) return null;
                                              return (
                                                <div 
                                                  key={item.id} 
                                                  onMouseEnter={() => setHoveredPartId(p.id)}
                                                  className="relative flex items-center justify-between px-6 py-3 cursor-pointer group hover:bg-[#58b347]/5 border-b border-slate-50 last:border-b-0 transition-colors"
                                                >
                                                  {/* ABSOLUTNY WSKAŹNIK HOVER */}
                                                  <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${hoveredPartId === p.id ? 'bg-[#58b347]' : 'bg-transparent group-hover:bg-[#58b347]'}`} />
                                                  
                                                  <div className="flex flex-col min-w-0 pr-4 flex-1">
                                                    <span className="text-sm font-bold text-slate-700 leading-tight">{p.name}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 font-mono mt-1 uppercase tracking-wider flex items-center gap-1.5">
                                                      {p.sku}
                                                      {p.category === 'Pojazd' && p.vehicle_plate && <><IconCar /> {p.vehicle_plate}</>}
                                                      {p.category === 'Narzędzie' && p.serial_number && <><IconTool /> S/N: {p.serial_number}</>}
                                                    </span>
                                                  </div>
                                                  <div className="w-24 text-center shrink-0">
                                                    <div className="font-bold text-slate-800 text-sm bg-white border border-slate-200 px-2 py-1 rounded shadow-sm inline-block">
                                                      {item.quantity} <span className="text-[9px] font-bold text-slate-400 uppercase">{p.unit}</span>
                                                    </div>
                                                  </div>
                                                  <div className="w-24 text-right shrink-0 flex justify-end">
                                                    <button onClick={(e) => { e.stopPropagation(); setIssueForm({ type: 'ZWROT', technician_id: tech.id, quantity: 1 }); setIssueModalPart(p); }} className="text-[9px] font-bold text-[#499b3a] bg-white border border-slate-200 hover:border-[#58b347] hover:bg-[#58b347]/5 px-3 py-1.5 rounded-lg transition-colors shadow-sm inline-flex items-center justify-center gap-1.5 uppercase tracking-widest opacity-0 group-hover:opacity-100">
                                                      <IconArrowLeft /> Zwróć
                                                    </button>
                                                  </div>
                                                </div>
                                              )
                                            })}
                                          </div>
                                        </div>
                                      );
                                    })}
                                    {techItems.length === 0 && <div className="p-6 text-xs text-center text-slate-400 font-bold">Brak wyposażenia.</div>}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                  </div>
                </div>

                {/* Prawa kolumna leci z centrali (ponieważ ten sam kod zarządza stanem hoveredPartId) */}
                <div className="w-[380px] bg-white border border-slate-200 rounded-2xl flex flex-col shrink-0 shadow-sm overflow-hidden">
                  {activePartDetails ? (
                    <div className="flex flex-col h-full bg-white animate-fadeIn">
                      <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0 flex flex-col justify-center items-center text-center">
                        <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center text-[#58b347] mb-4">
                          {getCategoryIcon(activePartDetails.part.category)}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{activePartDetails.part.category}</div>
                        <h2 className="text-base font-bold text-slate-900 leading-snug">{activePartDetails.part.name}</h2>
                        <div className="text-[10px] font-bold font-mono text-slate-400 bg-white border border-slate-200 px-3 py-1 rounded-full mt-3 uppercase tracking-wider">{activePartDetails.part.sku}</div>
                        
                        {(activePartDetails.part.serial_number || activePartDetails.part.vehicle_plate) && (
                          <div className="text-[9px] font-bold font-mono text-slate-500 uppercase flex items-center gap-1 mt-2">
                            {activePartDetails.part.category === 'Pojazd' ? <IconCar /> : <IconTool />} 
                            {activePartDetails.part.category === 'Pojazd' ? activePartDetails.part.vehicle_plate : `S/N: ${activePartDetails.part.serial_number}`}
                          </div>
                        )}
                        {activePartDetails.part.notes && (
                          <div className="mt-3 text-xs font-medium italic text-slate-500 border-t border-slate-200 pt-3 w-full">"{activePartDetails.part.notes}"</div>
                        )}
                      </div>

                      {/* WODOTRYSK: Wykres dystrybucji */}
                      <div className="p-6 border-b border-slate-100 shrink-0 space-y-4 bg-white">
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Magazyn Centralny</p>
                            <p className="text-xl font-bold text-slate-800">{activePartDetails.part.main_stock} <span className="text-[10px] font-bold uppercase text-slate-400">{activePartDetails.part.unit}</span></p>
                          </div>
                          <div className="text-right">
                            <p className="text-[9px] font-bold text-[#58b347] uppercase tracking-widest mb-1">W terenie (Auta)</p>
                            <p className="text-xl font-bold text-[#58b347]">{activePartDetails.total} <span className="text-[10px] font-bold uppercase text-[#58b347]/50">{activePartDetails.part.unit}</span></p>
                          </div>
                        </div>
                        
                        {/* Pasek postępu */}
                        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200">
                          <div className="bg-slate-400 h-full transition-all duration-1000 ease-out" style={{ width: `${(activePartDetails.part.main_stock / ((activePartDetails.part.main_stock + activePartDetails.total) || 1)) * 100}%` }}></div>
                          <div className="bg-[#58b347] h-full transition-all duration-1000 ease-out" style={{ width: `${(activePartDetails.total / ((activePartDetails.part.main_stock + activePartDetails.total) || 1)) * 100}%` }}></div>
                        </div>
                      </div>

                      {/* Rozbicie na auta */}
                      <div className="flex-1 overflow-y-auto bg-slate-50/50">
                        <div className="px-6 py-3 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100 tracking-widest sticky top-0 z-10">Rozdysponowane u techników:</div>
                        <ul className="divide-y divide-slate-100">
                          {activePartDetails.breakdown.map((b, i) => (
                            <li key={i} className="flex items-center justify-between px-6 py-4 hover:bg-white transition-colors">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold bg-[#58b347] text-xs shadow-sm">
                                  {getInitials(b.tech.name)}
                                </div>
                                <div className="flex flex-col">
                                  <div className="text-xs font-bold text-slate-800">{b.tech.name}</div>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                <div className="text-sm font-bold text-slate-800 tabular-nums bg-white border border-slate-200 px-2.5 py-1 rounded shadow-sm">{b.qty} <span className="text-[9px] font-bold text-slate-400 uppercase">{activePartDetails.part.unit}</span></div>
                                <button 
                                  onClick={() => { setIssueForm({ type: 'ZWROT', technician_id: b.tech.id, quantity: 1 }); setIssueModalPart(activePartDetails.part); }}
                                  className="text-[9px] font-bold bg-white border border-slate-200 text-slate-500 px-2 py-1 rounded hover:bg-slate-100 hover:text-[#58b347] transition-colors uppercase tracking-widest"
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
                      <div className="w-16 h-16 bg-white border border-[#58b347]/20 rounded-2xl shadow-sm flex items-center justify-center text-[#58b347] mb-4">
                        <IconInfo />
                      </div>
                      <p className="text-sm font-bold text-slate-600">Szczegóły elementu</p>
                      <p className="mt-2 text-xs font-medium max-w-[200px]">Najedź myszką na część w liście po lewej stronie, aby zobaczyć precyzyjną analitykę.</p>
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* WIDOK: HISTORIA ZMIAN */}
            {activeTab === 'logs' && (
              <div className="w-full bg-white/95 backdrop-blur-sm border border-white/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden flex-1">
                <div className="p-5 border-b border-slate-100/60 flex justify-between items-center bg-white shrink-0">
                  <h2 className="font-bold text-sm text-slate-800 uppercase tracking-widest">Rejestr Operacji Magazynowych</h2>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4 w-1/6">Data operacji</th>
                        <th className="px-6 py-4 w-1/6">Typ</th>
                        <th className="px-6 py-4 w-1/3">Asortyment</th>
                        <th className="px-6 py-4 w-1/12 text-center">Ilość</th>
                        <th className="px-6 py-4 w-1/6">Miejsce docelowe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60 text-xs">
                      {logs.map(log => {
                        const part = parts.find(p => p.id === log.part_id);
                        return (
                          <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 text-[11px] font-bold text-slate-400 font-mono whitespace-nowrap uppercase tracking-wider">{new Date(log.created_at).toLocaleString('pl-PL')}</td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`text-[9px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-widest ${log.operation_type === 'DOSTAWA' ? 'border-[#58b347]/50 text-[#499b3a] bg-[#58b347]/10' : log.operation_type === 'WYDANIE' ? 'border-orange-300 text-orange-600 bg-orange-50' : 'border-[#58b347] text-white bg-[#58b347]'}`}>{log.operation_type}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div className="text-slate-800 font-bold text-sm leading-tight">{part?.name || 'Usunięta część'}</div>
                              <div className="text-[10px] font-bold text-slate-400 font-mono mt-1 uppercase tracking-wider">{part?.sku || 'N/A'}</div>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-800 text-center text-sm">{log.quantity} <span className="font-bold text-[9px] text-slate-400 uppercase">{part?.unit || ''}</span></td>
                            <td className="px-6 py-4 text-xs font-bold text-slate-700">{log.technician_id ? technicians.find(t=>t.id === log.technician_id)?.name : <span className="font-medium italic text-slate-400">Magazyn centralny</span>}</td>
                          </tr>
                        )
                      })}
                      {logs.length === 0 && <tr><td colSpan={5} className="text-center p-8 text-slate-400 font-bold">Brak zapisanych operacji w logach.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* --- MODALE --- */}
      
      {/* Modal Operacji (Wydanie / Zwrot) */}
      {issueModalPart && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setIssueModalPart(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-widest">
                {issueForm.type === 'WYDANIE' ? 'Wydanie sprzętu' : issueForm.type === 'ZWROT' ? 'Zwrot do Centrali' : 'Dostawa towaru'}
              </h3>
              <button onClick={() => setIssueModalPart(null)} className="text-slate-400 hover:text-slate-800 transition-colors">✕</button>
            </div>
            <form onSubmit={handleIssuePart} className="p-6 space-y-5 bg-slate-50/30">
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-center shadow-sm">
                <div className="text-[10px] text-slate-400 font-mono font-bold mb-1 tracking-wider uppercase">{issueModalPart.sku}</div>
                <div className="text-sm font-bold text-slate-800 leading-tight">{issueModalPart.name}</div>
              </div>

              {issueForm.type !== 'DOSTAWA' && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{issueForm.type === 'WYDANIE' ? 'Komu wydajesz?' : 'Kto zwraca?'}</label>
                  <select 
                    required 
                    value={issueForm.technician_id} 
                    disabled={issueForm.type === 'ZWROT'} 
                    onChange={e => setIssueForm({...issueForm, technician_id: e.target.value})} 
                    className="w-full border border-slate-300 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 shadow-sm focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 focus:outline-none disabled:opacity-50 cursor-pointer"
                  >
                    <option value="">-- Wybierz pracownika --</option>
                    {technicians.map(t => {
                      const isBroken = techniciansWithBrokenItems.includes(t.id);
                      return (
                        <option key={t.id} value={t.id} disabled={isBroken && issueForm.type === 'WYDANIE'}>
                          {t.name} {isBroken && issueForm.type === 'WYDANIE' ? '(Auto w serwisie)' : ''}
                        </option>
                      )
                    })}
                  </select>
                  {issueForm.type === 'WYDANIE' && techniciansWithBrokenItems.length > 0 && (
                     <p className="text-[9px] text-red-500 font-bold mt-2">Uwaga: Zablokowano wydawanie pracownikom, których pojazd jest w serwisie.</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Ilość ({issueModalPart.unit})</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="number" 
                    min="1" 
                    max={issueForm.type === 'WYDANIE' ? issueModalPart.main_stock : issueForm.type === 'ZWROT' ? (techInventory.find(i => i.technician_id === issueForm.technician_id && i.part_id === issueModalPart.id)?.quantity || 1) : 9999} 
                    required 
                    value={issueForm.quantity} 
                    onChange={e => setIssueForm({...issueForm, quantity: parseInt(e.target.value) || 1})} 
                    className="w-full border border-slate-300 bg-white rounded-xl px-4 py-3 text-lg font-bold text-slate-800 shadow-sm focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 focus:outline-none text-center" 
                  />
                  {issueForm.type !== 'DOSTAWA' && (
                    <button type="button" onClick={() => setIssueForm({...issueForm, quantity: issueForm.type === 'WYDANIE' ? issueModalPart.main_stock : (techInventory.find(i => i.technician_id === issueForm.technician_id && i.part_id === issueModalPart.id)?.quantity || 1)})} className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 font-bold px-4 py-3 rounded-xl text-xs transition-colors shadow-sm uppercase tracking-widest">MAX</button>
                  )}
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setIssueModalPart(null)} className="flex-1 border border-slate-200 bg-white text-slate-700 font-bold py-3 rounded-xl text-xs hover:bg-slate-50 transition-colors shadow-sm">Anuluj</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl text-xs hover:bg-[#499b3a] transition-colors shadow-sm">Zatwierdź</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL NOWEJ CZĘŚCI ORAZ EDYCJI (Szeroki Grid) */}
      {(isNewPartModalOpen || editingPart) && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => { setIsNewPartModalOpen(false); setEditingPart(null); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">
                {editingPart ? 'Edycja kartoteki' : 'Nowy asortyment / Pojazd'}
              </h3>
              <button onClick={() => { setIsNewPartModalOpen(false); setEditingPart(null); }} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            
            <form onSubmit={editingPart ? handleUpdatePart : handleCreatePart} className="p-6 space-y-5 bg-slate-50/30 max-h-[75vh] overflow-y-auto scrollbar-hide">
              {renderFormFields(!!editingPart)}
              
              <div className="flex gap-3 pt-2 border-t border-slate-200 mt-4">
                <button type="button" onClick={() => { setIsNewPartModalOpen(false); setEditingPart(null); }} className="mt-4 flex-1 border border-slate-200 bg-white text-slate-700 font-bold py-3 rounded-xl text-xs hover:bg-slate-50 transition-colors shadow-sm">Anuluj</button>
                <button type="submit" className="mt-4 flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl text-xs hover:bg-[#499b3a] transition-colors shadow-sm">Zapisz pozycję</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL IMPORTU */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => !isImporting && setIsImportModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2"><IconImport /> Import Katalogu Części</h3>
              <button onClick={() => !isImporting && setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-5 bg-slate-50/30">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2 shadow-sm">
                <p className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">Wymagane nagłówki w 1. wierszu arkusza:</p>
                <p className="font-mono bg-slate-50 p-2 border border-slate-100 rounded-lg text-slate-500 font-semibold leading-tight tracking-wider">SKU, Nazwa, Kategoria, Jednostka, Stan</p>
                <p className="text-red-500 font-bold pt-1">Pamiętaj o odblokowaniu udostępniania arkusza!</p>
              </div>
              <form onSubmit={handleImportParts} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Link z Google Sheets</label>
                  <input required type="url" disabled={isImporting} value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" placeholder="https://docs.google.com/..." />
                </div>
                {importStatus && <p className="text-[11px] text-[#58b347] font-bold bg-[#58b347]/10 py-3 rounded-xl border border-[#58b347]/20 text-center animate-pulse">{importStatus}</p>}
                <div className="flex gap-3 pt-3">
                  <button type="button" disabled={isImporting} onClick={() => setIsImportModalOpen(false)} className="flex-1 bg-slate-100 border border-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors shadow-sm">Anuluj</button>
                  <button type="submit" disabled={isImporting} className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#499b3a] disabled:bg-slate-400 transition-colors shadow-sm">Uruchom Import</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}