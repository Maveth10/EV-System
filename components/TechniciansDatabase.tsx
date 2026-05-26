'use client';
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../app/supabase';

// --- TYPY DANYCH ---
export type Technician = {
  id: string;
  name: string;
  color: string;
  phone: string | null;
  car_plate: string | null;
  sep_expiry: string | null;
  contract_expiry: string | null;
  shortcut_key: string | null;
};

type VehicleInfo = { vehicle_plate: string; vehicle_type: string | null };
type SortConfig = { key: keyof Technician | 'stationCount'; direction: 'asc' | 'desc' } | null;

type SearchQuery = { id: string; text: string; logic: 'AND' | 'OR' | 'NOT' };
type CustomTabTech = { id: string; name: string; filterStatus: string; filterQueries: SearchQuery[] };

type ColumnKey = 'select' | 'actions' | 'avatar' | 'name' | 'phone' | 'car_plate' | 'sep_expiry' | 'contract_expiry' | 'stationCount';

interface ColumnDef {
  key: ColumnKey;
  label: string;
  visible: boolean;
  sortableKey?: keyof Technician | 'stationCount';
  thClass: string;
  tdClass: string;
}

// --- KLASY DLA SCROLLBARA ---
const customScrollbarClasses = "[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#58b347]/40 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#58b347]/80";

const defaultColumns: ColumnDef[] = [
  { key: 'select', label: '☑', visible: true, thClass: 'w-10 text-center', tdClass: 'text-center' },
  { key: 'actions', label: 'Akcje', visible: true, thClass: 'w-16 text-center text-slate-400', tdClass: 'text-center' },
  { key: 'avatar', label: 'Profil', visible: true, thClass: 'w-16 text-center', tdClass: 'text-center' },
  { key: 'name', label: 'Imię i nazwisko', visible: true, sortableKey: 'name', thClass: 'w-56', tdClass: 'font-bold text-slate-800' },
  { key: 'phone', label: 'Telefon', visible: true, sortableKey: 'phone', thClass: 'w-32', tdClass: 'text-slate-600 font-mono text-[11px] font-bold' },
  { key: 'car_plate', label: 'Pojazdy', visible: true, sortableKey: 'car_plate', thClass: 'w-48', tdClass: '' },
  { key: 'sep_expiry', label: 'Status SEP', visible: true, sortableKey: 'sep_expiry', thClass: 'w-36', tdClass: '' },
  { key: 'contract_expiry', label: 'Zakończenie Umowy', visible: true, sortableKey: 'contract_expiry', thClass: 'w-36', tdClass: '' },
  { key: 'stationCount', label: 'Zasięg', visible: true, sortableKey: 'stationCount', thClass: 'w-32 text-center', tdClass: 'text-center' },
];

// --- IKONY BAZOWE ---
const IconSort = () => <svg className="w-3.5 h-3.5 inline-block ml-1 opacity-40 hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>;
const IconTrash = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconEdit = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconImport = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const IconMapPin = () => <svg className="w-3.5 h-3.5 inline-block mr-1 text-[#58b347]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconPlus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const IconSearch = () => <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconAlert = () => <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconCalendar = () => <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconCheckCircle = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconKeyboard = () => <svg className="w-3 h-3 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" ry="2"/><path d="M6 8h.001"/><path d="M10 8h.001"/><path d="M14 8h.001"/><path d="M18 8h.001"/><path d="M8 12h.001"/><path d="M12 12h.001"/><path d="M16 12h.001"/><path d="M7 16h10"/></svg>;
const IconCheck = () => <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconFilter = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const IconUsers = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>;
const IconContract = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>;
const IconColumns = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>;
const IconArrowUp = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const IconArrowDown = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;

// --- DYNAMICZNE IKONY POJAZDÓW ---
const IconCar = ({ className = "w-3.5 h-3.5 inline-block mr-1 opacity-70" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3" />
    <circle cx="7.5" cy="16.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
);

const IconTruck = ({ className = "w-3.5 h-3.5 inline-block mr-1 opacity-70" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11" />
    <path d="M14 9h4l4 4v5h-3" />
    <circle cx="7.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="18" r="2.5" />
  </svg>
);

const IconLift = ({ className = "w-3.5 h-3.5 inline-block mr-1 opacity-70" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19h16" />
    <rect x="2" y="14" width="14" height="4" rx="1" />
    <path d="M16 14h4l2 3v1h-6" />
    <circle cx="6" cy="19" r="2" />
    <circle cx="18" cy="19" r="2" />
    <path d="M8 14L16 6" />
    <rect x="14" y="2" width="4" height="4" rx="1" />
  </svg>
);

const IconForVehicle = ({ plate, availableCars, className }: { plate: string, availableCars: VehicleInfo[], className?: string }) => {
  const type = availableCars.find(c => c.vehicle_plate === plate)?.vehicle_type || 'Osobowy';
  if (type === 'Van / Bus') return <IconTruck className={className} />;
  if (type === 'Podnośnik koszowy') return <IconLift className={className} />;
  return <IconCar className={className} />;
};

const CustomCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-4 h-4 rounded-[4px] flex items-center justify-center cursor-pointer transition-colors duration-200 ${checked ? 'bg-[#58b347] border-[#58b347]' : 'border border-slate-300 bg-white hover:border-[#58b347]/50'}`}
  >
    {checked && <IconCheck />}
  </div>
);

// --- KOMPONENT: NASŁUCHIWANIE SKRÓTÓW KLAWISZOWYCH ---
const ShortcutInput = ({ value, onChange }: { value: string | null, onChange: (val: string | null) => void }) => {
  const [isRecording, setIsRecording] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    e.preventDefault(); 
    e.stopPropagation();

    const { key, ctrlKey, altKey, shiftKey, metaKey } = e;
    if (['Control', 'Shift', 'Alt', 'Meta', 'Dead', 'CapsLock', 'Tab'].includes(key)) return;

    if (key === 'Escape') { inputRef.current?.blur(); return; }
    if (key === 'Backspace' || key === 'Delete') { onChange(null); inputRef.current?.blur(); return; }

    const keys = [];
    if (ctrlKey || metaKey) keys.push('Ctrl');
    if (altKey) keys.push('Alt');
    if (shiftKey) keys.push('Shift');

    let displayKey = key.length === 1 ? key.toUpperCase() : key;
    if (displayKey === ' ') displayKey = 'Space';

    keys.push(displayKey);
    onChange(keys.join('+'));
    inputRef.current?.blur(); 
  };

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
        <IconKeyboard />
      </div>
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={isRecording ? 'Wciśnij kombinację...' : (value || '')}
        onFocus={() => setIsRecording(true)}
        onBlur={() => setIsRecording(false)}
        onKeyDown={handleKeyDown}
        placeholder="Kliknij by ustawić..."
        className={`w-full pl-9 pr-10 py-2.5 border rounded-xl text-sm font-mono font-bold uppercase focus:outline-none transition-all shadow-sm cursor-pointer
          ${isRecording ? 'border-[#58b347] ring-1 ring-[#58b347]/30 bg-[#58b347]/5 text-[#58b347]' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
      />
      {value && !isRecording && (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-red-500 transition-colors font-bold text-lg leading-none"
          title="Usuń przypisany skrót"
        >
          &times;
        </button>
      )}
    </div>
  );
};


// --- SMART KOMPONENT: AUTOCOMPLETE DLA POJAZDÓW ---
const CarPlateInput = ({ value, onChange, availableCars }: { value: string | null, onChange: (val: string) => void, availableCars: VehicleInfo[] }) => {
  const [inputValue, setInputValue] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const tags = value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];

  const filteredCars = availableCars.filter(car => 
    car.vehicle_plate.toLowerCase().includes(inputValue.trim().toLowerCase()) && !tags.includes(car.vehicle_plate)
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val.includes('  ') || val.includes(',') || val.includes(';')) {
      const parts = val.split(/  |,|;/);
      const newInputValue = parts.pop() || ''; 
      
      let currentTags = [...tags];
      let tagsChanged = false;
      
      parts.forEach(p => {
        const t = p.trim().toUpperCase();
        if (t && !currentTags.includes(t)) {
          currentTags.push(t);
          tagsChanged = true;
        }
      });
      
      if (tagsChanged) {
        onChange(currentTags.join(', '));
      }
      setInputValue(newInputValue);
      setIsDropdownOpen(newInputValue.trim().length > 0);
    } else {
      setInputValue(val);
      setIsDropdownOpen(val.trim().length > 0);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const newTag = inputValue.trim().toUpperCase();
      if (newTag && !tags.includes(newTag)) {
        onChange([...tags, newTag].join(', '));
        setInputValue('');
        setIsDropdownOpen(false);
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

  const handleSelectCar = (carPlate: string) => {
    if (!tags.includes(carPlate)) {
      onChange([...tags, carPlate].join(', '));
      setInputValue('');
      setIsDropdownOpen(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="w-full min-h-[46px] flex flex-wrap items-center gap-2 px-3 py-2 border border-slate-200 bg-white rounded-xl shadow-sm focus-within:border-[#58b347] focus-within:ring-1 focus-within:ring-[#58b347]/30 transition-all cursor-text relative"
      onClick={() => document.getElementById('car-plate-input')?.focus()}
    >
      {tags.map((tag, idx) => (
        <span key={idx} className="flex items-center gap-1.5 bg-slate-100 text-slate-700 font-mono font-bold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded-md border border-slate-200 shadow-sm animate-fadeIn">
          <IconForVehicle plate={tag} availableCars={availableCars} className="w-3.5 h-3.5 opacity-70" /> {tag}
          <button type="button" onClick={(e) => { e.stopPropagation(); removeTag(idx); }} className="text-slate-400 hover:text-red-500 transition-colors ml-1 leading-none text-sm">&times;</button>
        </span>
      ))}
      <div className="flex-1 min-w-[150px] relative">
        <input
          id="car-plate-input"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={() => { if(inputValue.trim()) setIsDropdownOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={tags.length === 0 ? "Wpisz nr i wciśnij przecinek lub podwójną spację..." : ""}
          className="w-full outline-none text-sm font-mono uppercase font-semibold text-slate-700 bg-transparent placeholder-slate-400"
        />
        
        {isDropdownOpen && filteredCars.length > 0 && (
          <div className={`absolute top-full left-0 mt-2 w-max min-w-[200px] max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-xl z-[200] animate-fadeIn ${customScrollbarClasses}`}>
            <div className="px-3 py-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100 bg-slate-50">
              Pojazdy z bazy logistycznej:
            </div>
            {filteredCars.map(car => (
              <div 
                key={car.vehicle_plate} 
                onClick={(e) => { e.stopPropagation(); handleSelectCar(car.vehicle_plate); }} 
                className="px-4 py-2.5 hover:bg-[#58b347]/10 hover:text-[#499b3a] cursor-pointer text-xs font-bold text-slate-700 transition-colors flex items-center gap-2 uppercase font-mono"
              >
                <IconForVehicle plate={car.vehicle_plate} availableCars={availableCars} className="w-4 h-4 opacity-70" /> {car.vehicle_plate}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ZWIJANA LISTA SAMOCHODÓW DLA TABELI
const MultiCarBadge = ({ cars, availableCars }: { cars: string[], availableCars: VehicleInfo[] }) => {
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
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-600 font-mono font-semibold uppercase text-[10px] tracking-wider">
        <IconForVehicle plate={cars[0]} availableCars={availableCars} /> {cars[0]}
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
                  <IconForVehicle plate={car} availableCars={availableCars} /> {car}
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
  if (diffDays <= 30) return { text: `Wkrótce (${diffDays}d)`, badge: 'bg-orange-50 text-orange-700 border-orange-200', isExpired: false, isExpiring: true };
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
  const [availableCarsFromDB, setAvailableCarsFromDB] = useState<VehicleInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([{ id: 'init', text: '', logic: 'AND' }]);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [customTabs, setCustomTabs] = useState<CustomTabTech[]>([]);
  const [isCustomTabModalOpen, setIsCustomTabModalOpen] = useState(false);
  const [newCustomTab, setNewCustomTab] = useState<{ name: string, filterQueries: SearchQuery[] }>({ name: '', filterQueries: [{ id: 'c_init', text: '', logic: 'AND' }] });

  const [columns, setColumns] = useState<ColumnDef[]>(defaultColumns);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<Technician | null>(null);
  const [viewingTechProfile, setViewingTechProfile] = useState<any | null>(null);
  const [viewingStationsForTech, setViewingStationsForTech] = useState<any | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [importStatus, setImportStatus] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const [newTech, setNewTech] = useState({ name: '', phone: '', car_plate: '', sep_expiry: '', contract_expiry: '', color: '#58b347', shortcut_key: '' });

  const tabsScrollRef = useRef<HTMLDivElement>(null);

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
    const savedTabs = localStorage.getItem('ekoen_tech_custom_tabs');
    if (savedTabs) {
      try { 
        const parsed = JSON.parse(savedTabs);
        setCustomTabs(parsed);
      } catch (e) {}
    }
  }, []);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const [techRes, statRes, partsRes] = await Promise.all([
      supabase.from('technicians').select('id, name, color, phone, car_plate, sep_expiry, contract_expiry, shortcut_key'),
      supabase.from('stations').select('name, city, street, technician, status'),
      supabase.from('parts').select('vehicle_plate, vehicle_type').eq('category', 'Pojazd').not('vehicle_plate', 'is', null)
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
    if (partsRes.data) {
      const vehicles: VehicleInfo[] = partsRes.data.map(p => ({ vehicle_plate: p.vehicle_plate as string, vehicle_type: p.vehicle_type }));
      setAvailableCarsFromDB(vehicles);
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
        if (isCustomTabModalOpen) setIsCustomTabModalOpen(false);
        if (isColumnSettingsOpen) setIsColumnSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAddModalOpen, editingTech, viewingTechProfile, viewingStationsForTech, isImportModalOpen, isImporting, isCustomTabModalOpen, isColumnSettingsOpen]);

  const handleSort = (key: keyof Technician | 'stationCount') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const evaluateCondition = useCallback((t: Technician & { stationCount: number }, q: SearchQuery) => {
    const qText = q.text.trim().toLowerCase();
    if (!qText) return true;
    return (t.name?.toLowerCase().includes(qText)) ||
           (t.phone?.toLowerCase().includes(qText)) ||
           (t.car_plate?.toLowerCase().includes(qText)) ||
           (t.shortcut_key?.toLowerCase().includes(qText));
  }, []);

  const processedTechs = useMemo(() => {
    let result = technicians;

    if (activeFilter === 'EXPIRED_SEP') {
      result = result.filter(t => getExpiryStatus(t.sep_expiry).isExpired);
    } else if (activeFilter === 'EXPIRING_CONTRACT') {
      result = result.filter(t => getExpiryStatus(t.contract_expiry).isExpiring || getExpiryStatus(t.contract_expiry).isExpired);
    } else if (activeFilter.startsWith('CUSTOM_')) {
      const tabId = activeFilter.split('_')[1];
      const tabInfo = customTabs.find(c => c.id === tabId);
      if (tabInfo) {
        result = result.filter(t => {
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
  }, [technicians, sortConfig, searchQueries, activeFilter, customTabs, evaluateCondition]);

  const getCustomTabCount = useCallback((tabInfo: CustomTabTech) => {
    let res = technicians;
    res = res.filter(t => {
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
  }, [technicians, evaluateCondition]);

  const handleSaveCustomTab = (e: React.FormEvent) => {
    e.preventDefault();
    const newTab: CustomTabTech = {
      id: Math.random().toString(36).substring(7),
      name: newCustomTab.name,
      filterQueries: newCustomTab.filterQueries.filter(q => q.text.trim() !== '')
    };
    const updatedTabs = [...customTabs, newTab];
    setCustomTabs(updatedTabs);
    localStorage.setItem('ekoen_tech_custom_tabs', JSON.stringify(updatedTabs));
    setIsCustomTabModalOpen(false);
    setNewCustomTab({ name: '', filterQueries: [{ id: Math.random().toString(), text: '', logic: 'AND' }] });
  };

  const handleDeleteCustomTab = (id: string) => {
    const updatedTabs = customTabs.filter(t => t.id !== id);
    setCustomTabs(updatedTabs);
    localStorage.setItem('ekoen_tech_custom_tabs', JSON.stringify(updatedTabs));
    if (activeFilter === `CUSTOM_${id}`) setActiveFilter('ALL');
  };

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
        contract_expiry: editingTech.contract_expiry || null,
        shortcut_key: editingTech.shortcut_key || null
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
      color: newTech.color,
      shortcut_key: newTech.shortcut_key || null
    }]);
    
    if (error) alert('Błąd dodawania: ' + error.message);
    else { setIsAddModalOpen(false); setNewTech({ name: '', phone: '', car_plate: '', sep_expiry: '', contract_expiry: '', color: '#58b347', shortcut_key: '' }); fetchData(); }
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

  const handleRightClickClearFilters = (e: React.MouseEvent) => {
    e.preventDefault();
    setSearchQueries([{ id: Math.random().toString(), text: '', logic: 'AND' }]);
    setActiveFilter('ALL');
  };

  const renderSearchQueries = (queries: SearchQuery[], setQueries: (q: SearchQuery[]) => void) => {
    const addQuery = () => setQueries([...queries, { id: Math.random().toString(), text: '', logic: 'AND' }]);
    const updateQuery = (id: string, updates: Partial<SearchQuery>) => {
      setQueries(queries.map(q => q.id === id ? { ...q, ...updates } : q));
    };
    const removeQuery = (id: string) => {
      setQueries(queries.filter(q => q.id !== id));
    };

    return (
      <div className="flex flex-col gap-2 w-full max-w-2xl animate-fadeIn">
        {queries.map((q, idx) => {
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
                <div className="flex items-center justify-center pl-3 w-8 h-full shrink-0 text-slate-400">
                  <IconSearch />
                </div>
                <input
                  value={q.text}
                  onChange={e => updateQuery(q.id, { text: e.target.value })}
                  placeholder="Wpisz imię, numer auta, telefon, skrót..."
                  className="w-full pl-2 pr-3 py-2 text-xs font-semibold focus:outline-none bg-transparent h-full border-none"
                />
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

  const renderCellContent = (tech: Technician & { stationCount: number }, key: ColumnKey) => {
    const sep = getExpiryStatus(tech.sep_expiry);
    const contract = getExpiryStatus(tech.contract_expiry);
    const cars = tech.car_plate ? tech.car_plate.split(',').map(c => c.trim()).filter(Boolean) : [];

    switch (key) {
      case 'select':
        return (
          <div className="flex justify-center items-center gap-2.5">
            <CustomCheckbox checked={selectedIds.includes(tech.id)} onChange={() => toggleSelect(tech.id)} />
          </div>
        );
      case 'actions':
        return (
          <button 
            onClick={(e) => { e.stopPropagation(); setEditingTech(tech); }} 
            className="text-slate-400 hover:text-[#58b347] hover:bg-[#58b347]/10 p-1.5 rounded-lg transition-colors" 
            title="Edytuj dane technika"
          >
            <IconEdit />
          </button>
        );
      case 'avatar':
        return (
          <div 
            className="w-10 h-10 rounded-[12px] flex items-center justify-center text-white font-bold text-sm shadow-sm border border-black/5 mx-auto"
            style={{ backgroundColor: tech.color || '#58b347' }}
          >
            {getInitials(tech.name)}
          </div>
        );
      case 'name':
        return (
          <div className="flex items-center gap-2">
            <span 
              className="cursor-pointer font-bold text-[13px] text-slate-800 hover:text-[#58b347] transition-colors border-b border-transparent hover:border-[#58b347]/30 pb-0.5" 
              onClick={() => setViewingTechProfile(tech)} 
              title="Otwórz pełny profil pracownika"
            >
              {tech.name}
            </span>
            {tech.shortcut_key && (
              <kbd className="text-[9px] font-mono font-bold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200 flex items-center gap-1 w-max" title="Globalny skrót klawiszowy">
                <IconKeyboard /> {tech.shortcut_key}
              </kbd>
            )}
          </div>
        );
      case 'phone':
        return tech.phone || '-';
      case 'car_plate':
        return <MultiCarBadge cars={cars} availableCars={availableCarsFromDB} />;
      case 'sep_expiry':
        return <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-widest whitespace-nowrap ${sep.badge}`}>{sep.text}</span>;
      case 'contract_expiry':
        return <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-widest whitespace-nowrap ${contract.badge}`}>{contract.text}</span>;
      case 'stationCount':
        return (
          <button 
            onClick={(e) => { e.stopPropagation(); setViewingStationsForTech(tech); }}
            disabled={tech.stationCount === 0}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${tech.stationCount > 0 ? 'bg-[#58b347]/10 text-[#499b3a] hover:bg-[#58b347]/20 border border-[#58b347]/20 cursor-pointer' : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed'}`}
            title={tech.stationCount > 0 ? "Pokaż przypisane stacje" : "Brak przypisanych stacji"}
          >
            <IconMapPin /> {tech.stationCount} stacji
          </button>
        );
      default:
        return null;
    }
  };

  const expiredSepCount = technicians.filter(t => getExpiryStatus(t.sep_expiry).isExpired).length;
  const expiringContractCount = technicians.filter(t => getExpiryStatus(t.contract_expiry).isExpiring || getExpiryStatus(t.contract_expiry).isExpired).length;

  return (
    <div className={`absolute inset-0 bg-slate-100/60 backdrop-blur-2xl border-l border-white/20 z-40 overflow-y-auto overflow-x-hidden flex flex-col font-sans transition-[left] duration-300 ease-out shadow-[-10px_0_30px_rgba(0,0,0,0.05)] ${isSidebarHovered ? 'left-[256px]' : 'left-[72px]'} ${customScrollbarClasses}`}>
      
      {/* Pasek Nawigacji - Sticky */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/40 px-6 py-4 flex justify-between items-center shrink-0 sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Katalog Techników i Zespołów</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Zarządzanie uprawnieniami, flotą i przypisanymi stacjami.</p>
        </div>
        <div>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-white/50 border border-slate-200/50 px-3 py-1.5 rounded-lg shadow-sm">
            Aktywnych techników: <strong className="text-slate-800">{processedTechs.length}</strong>
          </span>
        </div>
      </div>

      <div className="flex-1 relative" onContextMenu={handleRightClickClearFilters}>
        <div className="min-h-full w-full max-w-[1600px] mx-auto p-6 flex flex-col gap-6">

          {/* KARTY KPI + CUSTOMOWE ZAKŁADKI */}
          <div ref={tabsScrollRef} className={`flex overflow-x-auto gap-6 pb-2 snap-x items-stretch shrink-0 select-none ${customScrollbarClasses}`}>
            <div 
              onClick={() => setActiveFilter('ALL')}
              className={`min-w-[280px] shrink-0 snap-start bg-white/80 backdrop-blur-md border ${activeFilter === 'ALL' ? 'border-[#58b347] ring-2 ring-[#58b347]/20 bg-[#58b347]/5' : 'border-white/60 hover:bg-white'} rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between cursor-pointer transition-all`}
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Całkowita flota</p>
                <p className="text-3xl font-bold text-slate-700">{technicians.length}</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeFilter === 'ALL' ? 'bg-[#58b347] text-white' : 'bg-[#58b347]/10 text-[#58b347]'}`}>
                <IconUsers />
              </div>
            </div>
            
            <div 
              onClick={() => setActiveFilter(prev => prev === 'EXPIRED_SEP' ? 'ALL' : 'EXPIRED_SEP')}
              className={`min-w-[280px] shrink-0 snap-start bg-white/80 backdrop-blur-md border ${activeFilter === 'EXPIRED_SEP' ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50' : expiredSepCount > 0 ? 'border-red-200 hover:bg-red-50/30' : 'border-white/60'} rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between cursor-pointer transition-all`}
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Przeterminowany SEP</p>
                <p className={`text-3xl font-bold ${expiredSepCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>{expiredSepCount}</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${expiredSepCount > 0 ? 'bg-red-100 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                {expiredSepCount > 0 ? <IconAlert /> : <IconCheckCircle />}
              </div>
            </div>

            <div 
              onClick={() => setActiveFilter(prev => prev === 'EXPIRING_CONTRACT' ? 'ALL' : 'EXPIRING_CONTRACT')}
              className={`min-w-[280px] shrink-0 snap-start bg-white/80 backdrop-blur-md border ${activeFilter === 'EXPIRING_CONTRACT' ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/50' : expiringContractCount > 0 ? 'border-orange-200 hover:bg-orange-50/30' : 'border-white/60'} rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between cursor-pointer transition-all`}
            >
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Wygasające Umowy (&lt;30 dni)</p>
                <p className={`text-3xl font-bold ${expiringContractCount > 0 ? 'text-orange-600' : 'text-slate-700'}`}>{expiringContractCount}</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${expiringContractCount > 0 ? 'bg-orange-100 text-orange-500' : 'bg-slate-50 text-slate-400'}`}>
                <IconContract />
              </div>
            </div>

            {/* RENDER CUSTOMOWYCH ZAKŁADEK */}
            {customTabs.map(tab => (
              <div 
                key={tab.id}
                onClick={() => setActiveFilter(prev => prev === `CUSTOM_${tab.id}` ? 'ALL' : `CUSTOM_${tab.id}`)}
                className={`min-w-[280px] shrink-0 snap-start bg-white/80 backdrop-blur-md border ${activeFilter === `CUSTOM_${tab.id}` ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'} rounded-2xl p-5 shadow-sm flex items-center justify-between cursor-pointer transition-all relative group`}
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
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${activeFilter === `CUSTOM_${tab.id}` ? 'bg-blue-100 text-blue-500' : 'bg-slate-50 text-slate-400'}`}>
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

          <div className="w-full flex flex-col h-max bg-white/95 backdrop-blur-sm border border-white/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
            
            {/* PASEK NARZĘDZI (ZAAWANSOWANE FILTROWANIE) */}
            <div className="p-4 border-b border-slate-100/60 flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50/50 shrink-0 gap-4">
              
              <div className="flex-1 w-full max-w-2xl">
                {renderSearchQueries(searchQueries, setSearchQueries)}
              </div>

              <div className="flex gap-3 items-center shrink-0 w-full md:w-auto mt-auto flex-wrap">
                <div className="relative">
                  <button onClick={() => setIsColumnSettingsOpen(!isColumnSettingsOpen)} className={`bg-white border text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors ${isColumnSettingsOpen ? 'border-[#58b347] text-[#58b347]' : 'border-slate-200'} h-[38px]`}>
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

                {(searchQueries.some(q => q.text.trim() !== '') || activeFilter !== 'ALL') && (
                  <>
                    <button 
                      onClick={() => { setSearchQueries([{ id: Math.random().toString(), text: '', logic: 'AND' }]); setActiveFilter('ALL'); }} 
                      className="bg-white hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest px-3 py-2.5 rounded-xl transition-colors shadow-sm h-[38px]"
                    >
                      Wyczyść Filtry
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                  </>
                )}

                {selectedIds.length > 0 && (
                  <>
                    <button onClick={deleteSelected} className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-red-100 flex items-center gap-2 shadow-sm transition-all h-[38px]">
                      <IconTrash /> Usuń ({selectedIds.length})
                    </button>
                    <div className="w-px h-6 bg-slate-200 mx-1"></div>
                  </>
                )}

                <button onClick={() => setIsImportModalOpen(true)} className="bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-2 shadow-sm transition-colors h-[38px]">
                  <IconImport /> CSV
                </button>
                <button onClick={() => setIsAddModalOpen(true)} className="bg-[#58b347] text-white border border-[#499b3a] px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#499b3a] flex items-center gap-2 shadow-sm transition-colors h-[38px]">
                  <IconPlus /> Dodaj
                </button>
              </div>
            </div>

            {/* TABELA DANYCH */}
            <div className={`flex-1 overflow-x-auto overflow-y-hidden`}>
              <table className="w-full text-left border-collapse table-fixed min-w-[1000px]">
                <thead>
                  <tr className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm shadow-slate-100/50">
                    {columns.filter(c => c.visible).map(c => (
                      <th 
                        key={c.key} 
                        className={`py-4 px-3 ${c.thClass} ${c.sortableKey ? 'cursor-pointer hover:text-slate-800 hover:bg-slate-100/80 transition-colors' : ''}`}
                        onClick={() => c.sortableKey && handleSort(c.sortableKey)}
                      >
                        {c.key === 'select' ? (
                          <div className="flex justify-center">
                            <CustomCheckbox 
                              checked={selectedIds.length === processedTechs.length && processedTechs.length > 0} 
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
                    <tr><td colSpan={columns.filter(c => c.visible).length} className="p-12 text-center text-slate-400 font-bold">Ładowanie danych zespołu...</td></tr>
                  ) : processedTechs.length === 0 ? (
                    <tr><td colSpan={columns.filter(c => c.visible).length} className="p-12 text-center text-slate-400 font-bold">Brak wyników w bazie.</td></tr>
                  ) : (
                    processedTechs.map(tech => (
                      <tr key={tech.id} className={`hover:bg-slate-50/80 transition-colors ${selectedIds.includes(tech.id) ? 'bg-[#58b347]/5 hover:bg-[#58b347]/10' : ''}`}>
                        {columns.filter(c => c.visible).map(c => (
                          <td key={c.key} className={`py-3 px-3 ${c.tdClass}`}>
                            {renderCellContent(tech, c.key)}
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
      </div>

      {/* --- MODALE --- */}

      {/* MODAL PROFILU TECHNIKA (BAJERY & DASHBOARD LIVE DATA) */}
      {viewingTechProfile && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setViewingTechProfile(null)}>
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl border border-slate-200 flex overflow-hidden animate-slideUp" onClick={e => e.stopPropagation()}>
            
            {/* LEWA KOLUMNA: DANE OSOBOWE I FLOTA */}
            <div className={`w-[320px] bg-white border-r border-slate-200 flex flex-col shrink-0 overflow-y-auto ${customScrollbarClasses}`}>
              <div className="relative bg-[#58b347]/5 pt-12 pb-8 px-6 shrink-0 flex flex-col items-center text-center border-b border-[#58b347]/10">
                <div 
                  className="w-24 h-24 rounded-[1.25rem] shadow-md flex items-center justify-center text-4xl font-bold text-white z-10 relative border-4 border-white" 
                  style={{ backgroundColor: viewingTechProfile.color || '#58b347' }}
                >
                  {getInitials(viewingTechProfile.name)}
                </div>
                <h2 className="text-xl font-bold text-slate-800 tracking-tight mt-5">{viewingTechProfile.name}</h2>
                <div className="flex flex-col gap-2 mt-2 items-center">
                  <p className="text-xs font-mono font-bold text-slate-500 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm w-max">
                    {viewingTechProfile.phone || 'Brak telefonu w bazie'}
                  </p>
                  {viewingTechProfile.shortcut_key && (
                    <kbd className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 shadow-sm flex items-center gap-1.5 w-max">
                      <IconKeyboard /> SKRÓT: {viewingTechProfile.shortcut_key}
                    </kbd>
                  )}
                </div>
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
                      {/* Dzielimy poprawnie na bazie przecinka z komponentu CarPlateInput */}
                      {viewingTechProfile.car_plate.split(',').filter(Boolean).map((car: string, idx: number) => (
                        <div key={idx} className="flex items-center w-full px-3 py-2 rounded-xl bg-white border border-slate-200 shadow-sm gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                            <IconForVehicle plate={car.trim()} availableCars={availableCarsFromDB} className="w-4 h-4 opacity-70" />
                          </div>
                          <span className="text-sm font-mono font-bold text-slate-700 uppercase tracking-wider">{car.trim()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <p className="text-xs text-slate-400 font-bold">Brak przypisanego pojazdu</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* PRAWA KOLUMNA: DASHBOARD, WYKRESY, MAGAZYN LIVE */}
            <div className={`flex-1 bg-white flex flex-col overflow-y-auto relative ${customScrollbarClasses}`}>
              <button onClick={() => setViewingTechProfile(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 p-2 rounded-xl transition-colors">✕</button>
              
              <div className="p-8 space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Panel Operacyjny</h3>
                  <p className="text-xs text-slate-500 font-medium">Przegląd bieżących zadań i stanów magazynowych na aucie (Live Data).</p>
                </div>

                {/* Szybkie KPI */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Oczekujące zgłoszenia</p>
                      <p className="text-3xl font-bold text-slate-700 mt-1">{activeTicketsCount}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-orange-100 text-orange-500 flex items-center justify-center">
                      <IconAlert />
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 p-5 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Zakończone zadania (Suma)</p>
                      <p className="text-3xl font-bold text-[#58b347] mt-1">{totalFinishedTickets}</p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-[#58b347]/10 text-[#58b347] flex items-center justify-center">
                      <IconCheckCircle />
                    </div>
                  </div>
                </div>

                {/* Środkowy wiersz: Wykres i Kalendarz */}
                <div className="grid grid-cols-2 gap-6">
                  
                  {/* Wykres Zadań - Ostatnie 7 dni */}
                  <div className="border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                      <span>Wydajność (Zakończone tickety)</span>
                      <IconTrendingUp />
                    </p>
                    <div className="flex-1 flex items-end justify-between gap-2 pt-4 h-32">
                      {chartData.reverse().map((data, i) => {
                        const heightPct = Math.max((data.count / maxChartVal) * 100, 5); 
                        return (
                          <div key={i} className="flex flex-col items-center gap-2 group w-full relative">
                            <div className="absolute -top-6 opacity-0 group-hover:opacity-100 text-[10px] font-bold text-slate-600 transition-opacity">{data.count}</div>
                            <div className="w-full bg-slate-100 rounded-t-md relative flex items-end justify-center overflow-hidden h-full">
                              <div className="w-full bg-[#58b347] rounded-t-md transition-all duration-500 ease-out" style={{ height: `${heightPct}%` }}></div>
                            </div>
                            <span className="text-[9px] font-bold text-slate-400 uppercase">{data.day}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Dzisiejsze Zadania */}
                  <div className="border border-slate-200 rounded-2xl p-5 shadow-sm bg-gradient-to-br from-white to-slate-50 flex flex-col">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                      <span>Harmonogram na dzisiaj</span>
                      <IconCalendar />
                    </p>
                    <div className="flex-1 flex flex-col justify-center items-center text-center space-y-3">
                      {todayTickets.length > 0 ? (
                        <>
                          <div className="w-14 h-14 bg-orange-100 border border-orange-200 shadow-sm rounded-full flex items-center justify-center text-orange-500 font-black text-xl">
                            {todayTickets.length}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">Otwarte zadania na dziś</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto font-medium">Sprawdź mapę, by zoptymalizować trasę.</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="w-14 h-14 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center text-[#58b347]">
                            <IconCheckCircle />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-700">Czyste konto</p>
                            <p className="text-xs text-slate-500 mt-1 max-w-[200px] mx-auto font-medium">Brak nowo utworzonych ticketów na dzisiejszy dzień.</p>
                          </div>
                        </>
                      )}
                    </div>
                    <button 
                      onClick={() => {
                        if(onChangeView) {
                          setViewingTechProfile(null);
                          onChangeView('calendar');
                        } else {
                          alert('Brak połączonego widoku kalendarza (dodaj w ChargeMap).');
                        }
                      }} 
                      className="mt-4 w-full py-2.5 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-50 transition-colors shadow-sm"
                    >
                      Otwórz Pełny Kalendarz
                    </button>
                  </div>
                </div>

                {/* Stany Magazynowe na Aucie - LIVE DATA */}
                <div className="border border-slate-200 rounded-2xl p-5 shadow-sm">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                    <span>Stan Magazynowy Pojazdu</span>
                    <IconBox />
                  </p>
                  
                  <div className="space-y-2">
                    {profileInv.length === 0 ? (
                      <div className="text-center py-6 text-slate-400 font-bold text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
                        Brak ekwipunku wpisanego na stan tego technika.
                      </div>
                    ) : (
                      profileInv.map((item, idx) => {
                        const part = allParts.find(p => p.id === item.part_id);
                        if (!part) return null;
                        
                        const isLow = item.quantity <= 3; // Ostrzegamy przy 3 lub mniej
                        return (
                          <div key={idx} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-200 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${isLow ? 'bg-red-500 animate-pulse' : 'bg-[#58b347]'}`} />
                              <div className="flex flex-col">
                                <span className="text-xs font-bold text-slate-700 leading-tight">{part.name}</span>
                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">{part.sku}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {isLow && <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest bg-red-50 px-2 py-0.5 rounded border border-red-100">Niski Stan</span>}
                              <span className="text-xs font-mono font-bold text-slate-500 bg-white border border-slate-200 px-2.5 py-1 rounded-md min-w-[60px] text-center shadow-sm">
                                {item.quantity} <span className="text-[9px] uppercase">{part.unit}</span>
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
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
            
            <div className={`p-6 overflow-y-auto bg-slate-50 ${customScrollbarClasses}`}>
              {assignedStationsForView.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-10 bg-white border border-slate-200 rounded-xl shadow-sm font-bold">
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
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kolor operacyjny</label>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm h-[46px]">
                    <input type="color" value={newTech.color} onChange={(e) => setNewTech({...newTech, color: e.target.value})} className="w-8 h-8 p-0 border-0 rounded cursor-pointer" />
                    <span className="text-[11px] text-slate-500 font-mono uppercase font-bold">{newTech.color}</span>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Klawisz skrótu</label>
                  <ShortcutInput value={newTech.shortcut_key} onChange={(val) => setNewTech({...newTech, shortcut_key: val || ''})} />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Numer telefonu</label>
                  <input type="tel" value={newTech.phone || ''} onChange={(e) => setNewTech({...newTech, phone: e.target.value})} placeholder="+48..." className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pojazdy (Z bazy logistycznej)</label>
                  <CarPlateInput value={newTech.car_plate} onChange={(val) => setNewTech({...newTech, car_plate: val})} availableCars={availableCarsFromDB} />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Ważność SEP</label>
                  <input type="date" value={newTech.sep_expiry || ''} onChange={(e) => setNewTech({...newTech, sep_expiry: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Koniec Umowy</label>
                  <input type="date" value={newTech.contract_expiry || ''} onChange={(e) => setNewTech({...newTech, contract_expiry: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-200 mt-5">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-slate-100 border border-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors shadow-sm">Anuluj</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#499b3a] transition-colors shadow-sm">Zarejestruj pracownika</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDYCJI DANYCH */}
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
                  <input required type="text" value={editingTech.name || ''} onChange={(e) => setEditingTech({...editingTech, name: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                </div>
                
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Kolor operacyjny</label>
                  <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm h-[46px]">
                    <input type="color" value={editingTech.color || '#000000'} onChange={(e) => setEditingTech({...editingTech, color: e.target.value})} className="w-8 h-8 p-0 border-0 rounded cursor-pointer" />
                    <span className="text-[11px] text-slate-500 font-mono uppercase font-bold">{editingTech.color}</span>
                  </div>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Klawisz skrótu</label>
                  <ShortcutInput value={editingTech.shortcut_key} onChange={(val) => setEditingTech({...editingTech, shortcut_key: val})} />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Numer telefonu</label>
                  <input type="tel" value={editingTech.phone || ''} onChange={(e) => setEditingTech({...editingTech, phone: e.target.value})} placeholder="+48..." className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-mono font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                </div>

                <div className="col-span-2">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Pojazdy (Z bazy logistycznej)</label>
                  <CarPlateInput value={editingTech.car_plate} onChange={(val) => setEditingTech({...editingTech, car_plate: val})} availableCars={availableCarsFromDB} />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Ważność SEP</label>
                  <input type="date" value={editingTech.sep_expiry || ''} onChange={(e) => setEditingTech({...editingTech, sep_expiry: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] transition-all shadow-sm" />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Zakończenie Umowy</label>
                  <input type="date" value={editingTech.contract_expiry || ''} onChange={(e) => setEditingTech({...editingTech, contract_expiry: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] transition-all shadow-sm" />
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-200 mt-5">
                <button type="button" onClick={() => setEditingTech(null)} className="flex-1 bg-slate-100 border border-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors shadow-sm">Anuluj</button>
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
                  <button type="button" disabled={isImporting} onClick={() => setIsImportModalOpen(false)} className="flex-1 bg-slate-100 border border-slate-200 text-slate-700 font-bold py-3 rounded-xl text-sm hover:bg-slate-200 transition-colors shadow-sm">Anuluj</button>
                  <button type="submit" disabled={isImporting} className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#499b3a] disabled:bg-slate-400 transition-colors shadow-sm shadow-[#58b347]/20">{isImporting ? 'Przetwarzanie...' : 'Uruchom Import'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TWORZENIE ZAKŁADKI CUSTOMOWEJ (WIELOKROTNE TAGI) */}
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
              </div>

              <div className="bg-white p-5 border border-slate-200 rounded-xl space-y-3 shadow-sm">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#58b347]">Warunki Filtrowania (Szukajka)</label>
                <p className="text-[10px] text-slate-400 mb-3 leading-relaxed border-b border-slate-100 pb-3">
                  Każde pole to osobny warunek. Możesz używać wykluczeń lub łączyć wiele kryteriów.
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

    </div>
  );
}