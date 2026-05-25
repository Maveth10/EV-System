'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../app/supabase';

export type Technician = {
  id: string;
  name: string;
  color: string;
  phone: string | null;
  car_plate: string | null;
  sep_expiry: string | null;
  contract_expiry: string | null;
};

type SortConfig = { key: keyof Technician | 'stationCount'; direction: 'asc' | 'desc' } | null;

// IKONY BAZOWE
const IconSort = () => <svg className="w-3.5 h-3.5 inline-block ml-1 opacity-40 hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>;
const IconTrash = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconEdit = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconImport = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const IconMapPin = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconPlus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const IconSearch = () => <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconAlert = () => <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconCar = () => <svg className="w-3 h-3 inline-block mr-1 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="10" width="18" height="8" rx="2" ry="2"/><path d="M5 10V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v4"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>;
const IconCalendar = () => <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconBox = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
const IconTrendingUp = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const IconCheckCircle = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;

const IconCheck = () => <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

const CustomCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-4 h-4 rounded-[4px] flex items-center justify-center cursor-pointer transition-colors duration-200 ${checked ? 'bg-[#58b347] border-[#58b347]' : 'border border-slate-300 bg-white hover:border-[#58b347]/50'}`}
  >
    {checked && <IconCheck />}
  </div>
);

// NOWOCZESNY INPUT Z PIGUŁKAMI DLA POJAZDÓW
const CarPlateInput = ({ value, onChange }: { value: string | null, onChange: (val: string) => void }) => {
  const [inputValue, setInputValue] = useState('');
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const newTag = inputValue.trim().toUpperCase();
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag].join(', '));
        setInputValue('');
      }
    } else if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      const newTags = [...tags];
      newTags.pop();
      onChange(newTags.join(', '));
    }
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, idx) => idx !== indexToRemove);
    onChange(newTags.join(', '));
  };

  return (
    <div 
      className="w-full min-h-[46px] flex flex-wrap items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-xl shadow-sm focus-within:border-[#58b347] focus-within:ring-1 focus-within:ring-[#58b347]/30 transition-all cursor-text"
      onClick={() => document.getElementById('car-plate-input')?.focus()}
    >
      {tags.map((tag, idx) => (
        <span key={idx} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 font-mono font-bold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md border border-slate-200 shadow-sm animate-fadeIn">
          <IconCar /> {tag}
          <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(idx); }} className="text-slate-400 hover:text-red-500 transition-colors ml-1 leading-none text-sm">&times;</button>
        </span>
      ))}
      <input
        id="car-plate-input"
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? "Wpisz nr i wciśnij Enter..." : ""}
        className="flex-1 min-w-[120px] outline-none text-sm font-mono uppercase font-semibold text-slate-700 bg-transparent placeholder-slate-400"
      />
    </div>
  );
};

// ZWIJANA LISTA SAMOCHODÓW DLA TABELI
const MultiCarBadge = ({ cars }: { cars: string[] }) => {
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

  if (cars.length === 0) return <span className="text-slate-400">-</span>;

  return (
    <div className="flex items-center gap-1.5">
      <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono font-semibold uppercase text-[10px] tracking-wider">
        <IconCar /> {cars[0]}
      </span>
      
      {cars.length > 1 && (
        <div 
          className="relative flex items-center" 
          ref={dropdownRef}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
          onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
        >
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#58b347]/10 hover:bg-[#58b347]/20 text-[#499b3a] border border-[#58b347]/20 cursor-help transition-colors">
            +{cars.length - 1}
          </span>

          {isOpen && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 min-w-[140px] bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn p-2 flex flex-col gap-1">
              <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-2 py-1.5 border-b border-slate-100 mb-1">
                Flota przypisana
              </div>
              {cars.map((car, idx) => (
                <div key={idx} className="text-[11px] font-mono font-semibold text-slate-700 px-2 py-1.5 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2 cursor-default uppercase">
                  <IconCar /> {car}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const getExpiryStatus = (dateString: string | null) => {
  if (!dateString) return { text: 'Brak danych', badge: 'bg-slate-100 text-slate-500 border-slate-200', isExpired: false, isExpiring: false };
  const expiryDate = new Date(dateString);
  const today = new Date();
  const diffTime = expiryDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: `Wygasło (${Math.abs(diffDays)} dni temu)`, badge: 'bg-red-50 text-red-700 border-red-200 animate-pulse', isExpired: true, isExpiring: false };
  if (diffDays <= 30) return { text: `Wygasa za ${diffDays} dni`, badge: 'bg-orange-50 text-orange-700 border-orange-200', isExpired: false, isExpiring: true };
  return { text: new Date(dateString).toLocaleDateString(), badge: 'bg-[#58b347]/10 text-[#499b3a] border-[#58b347]/20', isExpired: false, isExpiring: false };
};

// Generowanie Inicjałów
const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

interface TechniciansDatabaseProps {
  isSidebarHovered?: boolean;
  onChangeView?: (view: any) => void;
}

export default function TechniciansDatabase({ isSidebarHovered = false, onChangeView }: TechniciansDatabaseProps) {
  const [technicians, setTechnicians] = useState<(Technician & { stationCount: number })[]>([]);
  const [allStations, setAllStations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [viewingTechProfile, setViewingTechProfile] = useState<any | null>(null);
  const [viewingStationsForTech, setViewingStationsForTech] = useState<any | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [newTech, setNewTech] = useState({ name: '', phone: '', car_plate: '', sep_expiry: '', contract_expiry: '', color: '#58b347' });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [techRes, statRes] = await Promise.all([
      supabase.from('technicians').select('id, name, color, phone, car_plate, sep_expiry, contract_expiry'),
      supabase.from('stations').select('name, city, street, technician, status')
    ]);

    if (techRes.data && statRes.data) {
      setAllStations(statRes.data);
      const enrichedTechs = techRes.data.map(tech => {
        const count = statRes.data.filter(s => s.technician && s.technician.includes(tech.name)).length;
        return { ...tech, stationCount: count };
      });
      setTechnicians(enrichedTechs);
      
      setViewingTechProfile((prev: any) => prev ? enrichedTechs.find(t => t.id === prev.id) || prev : null);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isAddModalOpen) setIsAddModalOpen(false);
        if (editingTech) setEditingTech(null);
        if (viewingTechProfile) setViewingTechProfile(null);
        if (viewingStationsForTech) setViewingStationsForTech(null);
        if (isImportModalOpen && !isImporting) setIsImportModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, editingTech, viewingTechProfile, viewingStationsForTech, isImportModalOpen, isImporting]);

  const handleSort = (key: keyof Technician | 'stationCount') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const processedTechs = useMemo(() => {
    let result = technicians;

    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      result = result.filter(t => 
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.phone && t.phone.toLowerCase().includes(q)) ||
        (t.car_plate && t.car_plate.toLowerCase().includes(q))
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
  }, [technicians, sortConfig, searchTerm]);

  const toggleSelectAll = () => {
    if (selectedIds.length === processedTechs.length && processedTechs.length > 0) setSelectedIds([]);
    else setSelectedIds(processedTechs.map(t => t.id));
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(selId => selId !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const deleteSelected = async () => {
    if (!confirm(`Na pewno chcesz bezpowrotnie usunąć wybranych techników (${selectedIds.length}) z systemu? Ich zasięg na mapie zostanie wyczyszczony.`)) return;
    const { error } = await supabase.from('technicians').delete().in('id', selectedIds);
    if (error) alert('Błąd usuwania: ' + error.message);
    else { setSelectedIds([]); await supabase.rpc('refresh_station_zones'); fetchData(); }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTech) return;
    const { error } = await supabase.from('technicians')
      .update({ 
        name: editingTech.name,
        color: editingTech.color,
        phone: editingTech.phone || null, 
        car_plate: editingTech.car_plate || null, 
        sep_expiry: editingTech.sep_expiry || null,
        contract_expiry: editingTech.contract_expiry || null
      })
      .eq('id', editingTech.id);
    
    if (error) alert('Błąd aktualizacji: ' + error.message);
    else { 
      await supabase.rpc('refresh_station_zones'); 
      setEditingTech(null); 
      setSelectedIds([]);
      fetchData(); 
    }
  };

  const handleAddTech = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('technicians').insert([{
      name: newTech.name, 
      phone: newTech.phone || null, 
      car_plate: newTech.car_plate || null, 
      sep_expiry: newTech.sep_expiry || null, 
      contract_expiry: newTech.contract_expiry || null,
      color: newTech.color
    }]);
    
    if (error) alert('Błąd dodawania: ' + error.message);
    else { setIsAddModalOpen(false); setNewTech({ name: '', phone: '', car_plate: '', sep_expiry: '', contract_expiry: '', color: '#58b347' }); fetchData(); }
  };

  const handleImportTechs = async (e: React.FormEvent) => {
    e.preventDefault();
    const matches = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = matches ? matches[1] : null;

    if (!spreadsheetId) { alert('Nieprawidłowy link do Arkusza Google.'); return; }

    setIsImporting(true);
    setImportStatus('Pobieranie pliku...');

    let csvText = '';
    try {
      const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`);
      if (res.ok) {
        const text = await res.text();
        if (text && !text.includes('<!DOCTYPE html>')) csvText = text;
      }
    } catch (err) {}

    if (!csvText) {
      alert('Nie udało się pobrać danych. Upewnij się, że arkusz jest udostępniony publicznie ("Każdy kto ma link").');
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
    const idxContract = getColIndex(['umowa', 'zakończenie', 'contract']);

    if (idxName === -1) {
      alert('Nie odnaleziono kolumny z imieniem i nazwiskiem.');
      setIsImporting(false); return;
    }

    let successCount = 0;
    const rows = lines.slice(1);
    const colorsPool = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

    for (let i = 0; i < rows.length; i++) {
      const vals = rows[i].split(delimiter).map(v => v.replace(/^["']|["']$/g, '').trim());
      const nameVal = vals[idxName];
      if (!nameVal) continue;

      setImportStatus(`Zapisywanie: ${nameVal}...`);

      const payload = {
        name: nameVal,
        phone: idxPhone !== -1 && vals[idxPhone] ? vals[idxPhone] : null,
        car_plate: idxPlate !== -1 && vals[idxPlate] ? vals[idxPlate].toUpperCase() : null,
        sep_expiry: idxSep !== -1 && vals[idxSep] ? vals[idxSep] : null,
        contract_expiry: idxContract !== -1 && vals[idxContract] ? vals[idxContract] : null,
        color: colorsPool[i % colorsPool.length]
      };

      const { error } = await supabase.from('technicians').insert([payload]);
      if (!error) successCount++;
    }

    alert(`Gotowe! Zaimportowano ${successCount} techników.`);
    setIsImporting(false); setIsImportModalOpen(false); setSheetUrl(''); setImportStatus('');
    fetchData();
  };

  const assignedStationsForView = viewingStationsForTech ? allStations.filter(s => s.technician && s.technician.includes(viewingStationsForTech.name)) : [];

  const expiredSepCount = technicians.filter(t => getExpiryStatus(t.sep_expiry).isExpired).length;
  const expiringContractCount = technicians.filter(t => getExpiryStatus(t.contract_expiry).isExpiring || getExpiryStatus(t.contract_expiry).isExpired).length;

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-100/60 backdrop-blur-2xl border-l border-white/20 z-40 overflow-hidden flex flex-col font-sans transition-all duration-300 ease-out shadow-[-10px_0_30px_rgba(0,0,0,0.05)]">
      
      {/* Pasek Nawigacji */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/40 px-6 py-4 flex justify-between items-center shrink-0">
        <div className={`transition-all duration-300 ease-in-out ${isSidebarHovered ? 'ml-[184px]' : 'ml-0'}`}>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Katalog Techników i Zespołów</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Zarządzanie uprawnieniami, flotą i przypisanymi stacjami.</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/50 border border-slate-200/50 px-3 py-1.5 rounded-lg shadow-sm">
            Aktywnych techników: <strong className="text-slate-800">{processedTechs.length}</strong>
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide flex justify-center">
        <div className="w-full max-w-[1400px] flex flex-col h-full gap-6">

          {/* Karty KPI (Dashboard) */}
          <div className="grid grid-cols-3 gap-6 shrink-0">
            <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Całkowita flota</p>
                <p className="text-3xl font-bold text-slate-700">{technicians.length}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-[#58b347]/10 flex items-center justify-center text-[#58b347]">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
            </div>
            
            <div className={`bg-white/80 backdrop-blur-md border ${expiredSepCount > 0 ? 'border-red-200' : 'border-white/60'} rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between`}>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Przeterminowany SEP</p>
                <p className={`text-3xl font-bold ${expiredSepCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>{expiredSepCount}</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${expiredSepCount > 0 ? 'bg-red-50 text-red-500' : 'bg-[#58b347]/10 text-[#58b347]'}`}>
                {expiredSepCount > 0 ? <IconAlert /> : <IconCheckCircle />}
              </div>
            </div>

            <div className={`bg-white/80 backdrop-blur-md border ${expiringContractCount > 0 ? 'border-orange-200' : 'border-white/60'} rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between`}>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Wygasające Umowy (&lt;30 dni)</p>
                <p className={`text-3xl font-bold ${expiringContractCount > 0 ? 'text-orange-600' : 'text-slate-700'}`}>{expiringContractCount}</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${expiringContractCount > 0 ? 'bg-orange-50 text-orange-500' : 'bg-slate-50 text-slate-400'}`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
              </div>
            </div>
          </div>

          <div className="w-full flex flex-col h-full bg-white/95 backdrop-blur-sm border border-white/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            
            {/* PASEK NARZĘDZI */}
            <div className="p-5 border-b border-slate-100/60 flex justify-between items-center bg-slate-50/50 shrink-0">
              <div className="relative">
                <IconSearch />
                <input 
                  type="text" 
                  placeholder="Szukaj po nazwisku, aucie, nr telefonu..." 
                  value={searchTerm} 
                  onChange={e => setSearchTerm(e.target.value)} 
                  className="pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 w-[320px] shadow-sm transition-all"
                />
              </div>
              
              <div className="flex gap-3 items-center">
                {selectedIds.length > 0 && (
                  <>
                    <button onClick={deleteSelected} className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 flex items-center gap-2 shadow-sm transition-all">
                      <IconTrash /> Usuń wybrane ({selectedIds.length})
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                  </>
                )}

                <button onClick={() => setIsImportModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors">
                  <IconImport /> Import CSV
                </button>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-[#58b347] text-white border border-[#499b3a] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#499b3a] flex items-center gap-2 shadow-sm transition-colors">
                  <IconPlus /> Dodaj technika
                </button>
              </div>
            </div>

            {/* TABELA DANYCH */}
            <div className="flex-1 overflow-x-auto overflow-y-auto scrollbar-hide">
              <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-0 z-10 shadow-sm shadow-slate-100/50">
                    <th className="py-4 px-3 w-20 text-center">Wybór</th>
                    <th className="py-4 px-3 w-16 text-center">Kolor</th>
                    <th className="py-4 px-3 w-56 cursor-pointer hover:text-slate-800 hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('name')}>Imię i nazwisko <IconSort /></th>
                    <th className="py-4 px-3 w-32 cursor-pointer hover:text-slate-800 hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('phone')}>Telefon <IconSort /></th>
                    <th className="py-4 px-3 w-40 cursor-pointer hover:text-slate-800 hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('car_plate')}>Pojazdy <IconSort /></th>
                    <th className="py-4 px-3 w-36 cursor-pointer hover:text-slate-800 hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('sep_expiry')}>Status SEP <IconSort /></th>
                    <th className="py-4 px-3 w-36 cursor-pointer hover:text-slate-800 hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('contract_expiry')}>Zakończenie Umowy <IconSort /></th>
                    <th className="py-4 px-3 w-32 text-center cursor-pointer hover:text-slate-800 hover:bg-slate-100/80 transition-colors" onClick={() => handleSort('stationCount')}>Zasięg Terytorialny <IconSort /></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100/60 text-xs">
                  {isLoading ? (
                    <tr><td colSpan={8} className="p-12 text-center text-slate-400 font-bold">Ładowanie danych zespołu...</td></tr>
                  ) : processedTechs.length === 0 ? (
                    <tr><td colSpan={8} className="p-12 text-center text-slate-400 font-bold">Brak wyników w bazie.</td></tr>
                  ) : (
                    processedTechs.map(tech => {
                      const sep = getExpiryStatus(tech.sep_expiry);
                      const contract = getExpiryStatus(tech.contract_expiry);
                      const cars = tech.car_plate ? tech.car_plate.split(',').map(c => c.trim()).filter(Boolean) : [];
                      
                      return (
                        <tr key={tech.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.includes(tech.id) ? 'bg-[#58b347]/5 hover:bg-[#58b347]/10' : ''}`}>
                          <td className="py-3 px-3">
                            <div className="flex justify-center items-center gap-2.5">
                              <CustomCheckbox checked={selectedIds.includes(tech.id)} onChange={() => toggleSelect(tech.id)} />
                              <button 
                                onClick={(e) => { e.stopPropagation(); setEditingTech(tech); }} 
                                className="text-slate-400 hover:text-[#58b347] hover:bg-[#58b347]/10 p-1.5 rounded-lg transition-colors" 
                                title="Edytuj dane technika"
                              >
                                <IconEdit />
                              </button>
                            </div>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <div className="w-4 h-4 rounded-full mx-auto shadow-sm ring-2 ring-white" style={{ backgroundColor: tech.color }} />
                          </td>
                          <td className="py-3 px-3">
                            <span 
                              className="cursor-pointer font-semibold text-slate-800 hover:text-[#58b347] transition-colors border-b border-transparent hover:border-[#58b347]/30 pb-0.5" 
                              onClick={() => setViewingTechProfile(tech)} 
                              title="Otwórz pełny profil pracownika"
                            >
                              {tech.name}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">{tech.phone || '-'}</td>
                          <td className="py-3 px-3">
                            <MultiCarBadge cars={cars} />
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-widest whitespace-nowrap ${sep.badge}`}>{sep.text}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-widest whitespace-nowrap ${contract.badge}`}>{contract.text}</span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setViewingStationsForTech(tech); }}
                              disabled={tech.stationCount === 0}
                              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${tech.stationCount > 0 ? 'bg-[#58b347]/10 text-[#499b3a] hover:bg-[#58b347]/20 border border-[#58b347]/20 cursor-pointer' : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'}`}
                              title={tech.stationCount > 0 ? "Pokaż przypisane stacje" : "Brak przypisanych stacji"}
                            >
                              <IconMapPin /> {tech.stationCount} stacji
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODALE --- */}

      {/* MODAL PROFILU TECHNIKA (BAJERY & DASHBOARD) */}
      {viewingTechProfile && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setViewingTechProfile(null)}>
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl border border-slate-200 flex overflow-hidden animate-slideUp" onClick={e => e.stopPropagation()}>
            
            {/* LEWA KOLUMNA: DANE OSOBOWE I FLOTA */}
            <div className="w-[320px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto scrollbar-hide">
              <div className="relative bg-[#58b347]/5 pt-12 pb-8 px-6 shrink-0 flex flex-col items-center text-center border-b border-[#58b347]/10">
                <div 
                  className="w-24 h-24 rounded-[1.25rem] shadow-md flex items-center justify-center text-4xl font-bold text-white z-10 relative border-4 border-white" 
                  style={{ backgroundColor: viewingTechProfile.color || '#58b347' }}
                >
                  {getInitials(viewingTechProfile.name)}
                </div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight mt-5">{viewingTechProfile.name}</h2>
                <p className="text-xs font-mono text-slate-500 mt-1.5 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
                  {viewingTechProfile.phone || 'Brak telefonu w bazie'}
                </p>
              </div>

              <div className="p-6 space-y-6">
                {/* Zasięg */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Zasięg terytorialny</p>
                  <button 
                    onClick={() => {
                      setViewingTechProfile(null);
                      setViewingStationsForTech(viewingTechProfile);
                    }}
                    disabled={viewingTechProfile.stationCount === 0}
                    className="w-full py-2.5 bg-white border border-[#58b347]/30 text-[#499b3a] font-bold rounded-xl text-xs hover:bg-[#58b347]/5 transition-colors shadow-sm disabled:border-slate-200 disabled:text-slate-400 disabled:bg-slate-50 flex items-center justify-center gap-2"
                  >
                    <IconMapPin /> Pokaż mapowane stacje ({viewingTechProfile.stationCount})
                  </button>
                </div>

                {/* Status Uprawnień */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5">Uprawnienia i Umowy</p>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-xs font-bold text-slate-600">SEP:</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${getExpiryStatus(viewingTechProfile.sep_expiry).badge}`}>
                        {getExpiryStatus(viewingTechProfile.sep_expiry).text}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
                      <span className="text-xs font-bold text-slate-600">Umowa:</span>
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${getExpiryStatus(viewingTechProfile.contract_expiry).badge}`}>
                        {getExpiryStatus(viewingTechProfile.contract_expiry).text}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Przypisana Flota */}
                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-1.5">Przypisana Flota Mobilna</p>
                  {viewingTechProfile.car_plate ? (
                    <div className="flex flex-col gap-2">
                      {viewingTechProfile.car_plate.split(',').map((car: string, idx: number) => (
                        <div key={idx} className="flex items-center w-full px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-sm gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                            <IconCar />
                          </div>
                          <span className="text-sm font-mono font-bold text-slate-700 uppercase tracking-wider">{car.trim()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <p className="text-xs text-slate-400 font-medium">Brak przypisanego pojazdu</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PRAWA KOLUMNA: DASHBOARD, WYKRESY, MAGAZYN */}
            <div className="flex-1 bg-white flex flex-col overflow-y-auto scrollbar-hide relative">
              <button onClick={() => setViewingTechProfile(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition-colors">✕</button>
              
              <div className="p-8 space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Panel Operacyjny</h3>
                  <p className="text-xs text-slate-500">Przegląd bieżących zadań i stanów magazynowych na aucie.</p>
                </div>

                {/* Szybkie KPI */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Oczekujące zgłoszenia</p>
                      <p className="text-3xl font-bold text-slate-700 mt-1">2</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                      <IconAlert />
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Średni czas reakcji (SLA)</p>
                      <p className="text-3xl font-bold text-[#58b347] mt-1">3.5h</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#58b347]/10 text-[#58b347] flex items-center justify-center">
                      <IconTrendingUp />
                    </div>
                  </div>
                </div>

                {/* Środkowy wiersz: Wykres i Kalendarz */}
                <div className="grid grid-cols-2 gap-6">
                  
                  {/* Pseudo-Wykres Zamkniętych Zgłoszeń */}
                  <div className="border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                      <span>Wydajność (Ostatnie 7 dni)</span>
                      <IconTrendingUp />
                    </p>
                    <div className="flex-1 flex items-end justify-between gap-2 pt-4 h-32">
                      {[3, 5, 2, 8, 4, 0, 1].map((val, i) => {
                        const days = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'Sb', 'Nd'];
                        const heightPct = Math.max((val / 10) * 100, 5); 
                        return (
                          <div key={i} className="flex flex-col items-center gap-2 group w-full relative">
                            <div className="absolute -top-6 opacity-0 group-hover:opacity-100 text-[10px] font-bold text-slate-600 transition-opacity">{val}</div>
                            <div className="w-full bg-slate-100 rounded-t-md relative flex items-end justify-center overflow-hidden h-full">
                              <div className="w-full bg-[#58b347] rounded-t-md transition-all duration-500 ease-out" style={{ height: `${heightPct}%` }}></div>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{days[i]}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Kalendarz / Dziś */}
                  <div className="border border-slate-200 rounded-2xl p-5 shadow-sm bg-gradient-to-br from-white to-slate-50 flex flex-col">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                      <span>Harmonogram na dzisiaj</span>
                      <IconCalendar />
                    </p>
                    <div className="flex-1 flex flex-col justify-center items-center text-center space-y-3">
                      <div className="w-14 h-14 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center text-[#58b347]">
                        <IconCheckCircle />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">Wszystkie zadania wykonane</p>
                        <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto">Pracownik nie ma dziś otwartych zgłoszeń priorytetowych.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if(onChangeView) {
                          setViewingTechProfile(null);
                          onChangeView('calendar');
                        } else {
                          alert('Brak połączenia z głównym widokiem. Dodaj onChangeView w ChargeMap.tsx!');
                        }
                      }} 
                      className="mt-4 w-full py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      Otwórz Pełny Kalendarz
                    </button>
                  </div>
                </div>

                {/* Stany Magazynowe na Aucie */}
                <div className="border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                    <span>Stan Magazynowy Pojazdu (Wirtualny)</span>
                    <IconBox />
                  </p>
                  
                  <div className="space-y-2">
                    {[
                      { name: 'Moduł mocy Alpitronic 50kW', qty: 2, unit: 'szt.', status: 'ok' },
                      { name: 'Kabel CCS2 200A chłodzony', qty: 1, unit: 'szt.', status: 'ok' },
                      { name: 'Zestaw filtrów powietrza', qty: 5, unit: 'kpl.', status: 'ok' },
                      { name: 'Zasilacz pomocniczy 24V', qty: 0, unit: 'szt.', status: 'low' },
                      { name: 'Bezpieczniki różnicowe', qty: 12, unit: 'szt.', status: 'ok' }
                    ].map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${item.status === 'low' ? 'bg-red-500 animate-pulse' : 'bg-[#58b347]'}`} />
                          <span className="text-xs font-bold text-slate-700">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.status === 'low' && <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded">Braki</span>}
                          <span className="text-xs font-mono font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md min-w-[60px] text-center">
                            {item.qty} <span className="text-[9px] uppercase">{item.unit}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL LISTY STACJI W ZASIĘGU */}
      {viewingStationsForTech && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setViewingStationsForTech(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl overflow-hidden border border-slate-200 flex flex-col max-h-[85vh] animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full ring-2 ring-slate-100" style={{ backgroundColor: viewingStationsForTech.color }} />
                <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">Terytorium: {viewingStationsForTech.name}</h3>
              </div>
              <button onClick={() => setViewingStationsForTech(null)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50">
              {assignedStationsForView.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-10 bg-white border border-slate-200 rounded-xl shadow-sm">
                  Brak stacji w tym rejonie operacyjnym.
                </p>
              ) : (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50/80 font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 text-[10px]">
                        <th className="p-4">Identyfikator stacji</th>
                        <th className="p-4">Lokalizacja</th>
                        <th className="p-4 text-right">Zadanie operacyjne</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {assignedStationsForView.map((station, i) => (
                        <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                          <td className="p-4 font-bold text-slate-800">{station.name}</td>
                          <td className="p-4 text-slate-600 font-medium">{station.city}, {station.street}</td>
                          <td className="p-4 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest ${
                              station.status === 'Awaria' ? 'bg-red-50 text-red-700 border-red-200' : 
                              station.status === 'Brak akcji' ? 'bg-green-50 text-green-700 border-green-200' :
                              'bg-orange-50 text-orange-700 border-orange-200'
                            }`}>
                              {station.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL DODAWANIA NOWEGO TECHNIKA */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setIsAddModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Rejestracja nowego pracownika</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            <form onSubmit={handleAddTech} className="p-6 space-y-5 bg-slate-50/30">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Imię i nazwisko *</label>
                  <input required type="text" value={newTech.name} onChange={(e) => setNewTech({...newTech, name: e.target.value})} placeholder="np. Jan Kowalski" className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kolor mapy operacyjnej</label>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                    <input type="color" value={newTech.color} onChange={(e) => setNewTech({...newTech, color: e.target.value})} className="w-8 h-8 p-0 border-0 rounded cursor-pointer" />
                    <span className="text-[11px] text-slate-500 font-mono uppercase font-bold">{newTech.color}</span>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Numer telefonu</label>
                  <input type="tel" value={newTech.phone} onChange={(e) => setNewTech({...newTech, phone: e.target.value})} placeholder="+48..." className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-mono focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pojazdy (Zatwierdź Enterem)</label>
                  <CarPlateInput value={newTech.car_plate} onChange={(val) => setNewTech({...newTech, car_plate: val})} />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Ważność SEP</label>
                  <input type="date" value={newTech.sep_expiry} onChange={(e) => setNewTech({...newTech, sep_expiry: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#58b347] transition-all shadow-sm" />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Koniec Umowy</label>
                  <input type="date" value={newTech.contract_expiry} onChange={(e) => setNewTech({...newTech, contract_expiry: e.target.value})} className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:border-[#58b347] transition-all shadow-sm" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors">Anuluj</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#499b3a] transition-colors shadow-sm">Zarejestruj pracownika</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDYCJI DANYCH (Osobny modal odpala się przyciskiem z toolbara lub długopisem przy checku) */}
      {editingTech && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setEditingTech(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest">Edycja wpisu w kadrach</h3>
              <button onClick={() => setEditingTech(null)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            <form id="tech-edit-form" onSubmit={handleEditSave} className="p-6 space-y-5 bg-slate-50/30">
              <div className="grid grid-cols-2 gap-5">
                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Imię i nazwisko *</label>
                  <input required type="text" value={editingTech.name || ''} onChange={(e) => setEditingTech({...editingTech, name: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kolor mapy operacyjnej</label>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
                    <input type="color" value={editingTech.color || '#000000'} onChange={(e) => setEditingTech({...editingTech, color: e.target.value})} className="w-8 h-8 p-0 border-0 rounded cursor-pointer" />
                    <span className="text-[11px] text-slate-500 font-mono uppercase font-bold">{editingTech.color}</span>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Numer telefonu</label>
                  <input type="tel" value={editingTech.phone || ''} onChange={(e) => setEditingTech({...editingTech, phone: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-mono focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pojazdy (Zatwierdź Enterem)</label>
                  <CarPlateInput value={editingTech.car_plate} onChange={(val) => setEditingTech({...editingTech, car_plate: val})} />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Ważność SEP</label>
                  <input type="date" value={editingTech.sep_expiry || ''} onChange={(e) => setEditingTech({...editingTech, sep_expiry: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:border-[#58b347] transition-all shadow-sm" />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Zakończenie Umowy</label>
                  <input type="date" value={editingTech.contract_expiry || ''} onChange={(e) => setEditingTech({...editingTech, contract_expiry: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:border-[#58b347] transition-all shadow-sm" />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setEditingTech(null)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors">Anuluj</button>
                <button form="tech-edit-form" type="submit" className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#499b3a] transition-colors shadow-sm">Zapisz poprawki</button>
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
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2"><IconImport /> Import Masowy</h3>
              <button onClick={() => !isImporting && setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            <div className="p-6 space-y-5 bg-slate-50/30">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-xs text-slate-600 space-y-2 shadow-sm">
                <p className="font-bold text-slate-800 uppercase tracking-widest text-[10px]">Wymagane nagłówki w 1. wierszu arkusza:</p>
                <p className="font-mono bg-slate-50 p-2 border border-slate-100 rounded-lg text-slate-500 font-semibold leading-tight">Imię i nazwisko, Telefon, Pojazd, Ważność SEP, Zakończenie Umowy</p>
                <p className="text-red-500 font-bold pt-1">Pamiętaj o odblokowaniu udostępniania arkusza!</p>
              </div>
              <form onSubmit={handleImportTechs} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Link z Google Sheets</label>
                  <input required type="url" disabled={isImporting} value={sheetUrl} onChange={(e) => setSheetUrl(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" placeholder="https://docs.google.com/..." />
                </div>
                {importStatus && <p className="text-[11px] text-[#58b347] font-bold bg-[#58b347]/10 py-3 rounded-xl border border-[#58b347]/20 text-center animate-pulse">{importStatus}</p>}
                <div className="flex gap-3 pt-3">
                  <button type="button" disabled={isImporting} onClick={() => setIsImportModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors">Anuluj</button>
                  <button type="submit" disabled={isImporting} className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#499b3a] disabled:bg-slate-400 transition-colors shadow-sm shadow-[#58b347]/20">{isImporting ? 'Przetwarzanie...' : 'Uruchom Import'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}