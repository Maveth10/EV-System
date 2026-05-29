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
  is_muted?: boolean;
  mobile_muted?: boolean;
  stock?: number; // Frontend-only (wirtualna)
};
type Technician = { id: string; name: string; car_plate?: string | null; car_category?: string | null; sep_expiry?: string | null; contract_expiry?: string | null; color?: string; };
type TechInventory = { id: string; technician_id: string; part_id: string; quantity: number; is_muted?: boolean; };
type Log = { id: string; part_id: string; technician_id: string; operation_type: string; quantity: number; created_at: string; notes?: string; };

type SearchQuery = { id: string; text: string; logic: 'AND' | 'OR' | 'NOT' };
type CustomTabEq = { id: string; name: string; filterQueries: SearchQuery[] };

// Dynamiczne kolumny
type ColumnKey = 'select' | 'actions' | 'sku' | 'name' | 'category' | 'status' | 'stock';
interface ColumnDef { key: ColumnKey; label: string; visible: boolean; sortableKey?: keyof Part | 'stock'; thClass: string; tdClass: string; }

const defaultCentralColumns: ColumnDef[] = [
  { key: 'select', label: '☑', visible: true, thClass: 'w-10 px-4 text-center', tdClass: 'w-10 px-4 text-center align-middle' },
  { key: 'sku', label: 'SKU / INDEX', visible: true, sortableKey: 'sku', thClass: 'w-36 px-4', tdClass: 'w-36 px-4 align-middle' },
  { key: 'name', label: 'ASORTYMENT / NR SERYJNY', visible: true, sortableKey: 'name', thClass: 'w-auto px-4', tdClass: 'px-4 align-middle' },
  { key: 'category', label: 'KATEGORIA', visible: true, sortableKey: 'category', thClass: 'w-40 px-4', tdClass: 'w-40 px-4 align-middle' },
  { key: 'status', label: 'STATUS / WAŻNOŚĆ', visible: true, sortableKey: 'service_status', thClass: 'w-48 px-4', tdClass: 'w-48 px-4 align-middle' },
  { key: 'stock', label: 'STAN', visible: true, sortableKey: 'main_stock', thClass: 'w-24 px-4 text-center', tdClass: 'w-24 px-4 text-center align-middle' },
  { key: 'actions', label: 'AKCJE', visible: true, thClass: 'w-28 px-4 text-right', tdClass: 'w-28 px-4 text-right align-middle opacity-0 group-hover:opacity-100 transition-opacity' },
];

const defaultMobileColumns: ColumnDef[] = [
  { key: 'select', label: '☑', visible: false, thClass: 'w-10 px-4 text-center', tdClass: 'w-10 px-4 text-center align-middle' },
  { key: 'sku', label: 'SKU / INDEX', visible: true, sortableKey: 'sku', thClass: 'w-36 px-4', tdClass: 'w-36 px-4 align-middle' },
  { key: 'name', label: 'ASORTYMENT (W TERENIE)', visible: true, sortableKey: 'name', thClass: 'w-auto px-4', tdClass: 'px-4 align-middle' },
  { key: 'category', label: 'KATEGORIA', visible: true, sortableKey: 'category', thClass: 'w-40 px-4', tdClass: 'w-40 px-4 align-middle' },
  { key: 'status', label: 'STATUS / WAŻNOŚĆ', visible: true, sortableKey: 'service_status', thClass: 'w-48 px-4', tdClass: 'w-48 px-4 align-middle' },
  { key: 'stock', label: 'ILOŚĆ', visible: true, sortableKey: 'stock', thClass: 'w-24 px-4 text-center', tdClass: 'w-24 px-4 text-center align-middle' },
  { key: 'actions', label: 'AKCJE', visible: true, thClass: 'w-24 px-4 text-right', tdClass: 'w-24 px-4 text-right align-middle opacity-0 group-hover:opacity-100 transition-opacity' },
];

type SortConfig = { key: keyof Part | 'stock'; direction: 'asc' | 'desc' } | null;

// --- KLASY DLA SCROLLBARA ---
const customScrollbarClasses = "[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#58b347]/40 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#58b347]/80";

// --- IKONY BAZOWE ---
const IconPackage = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>;
const IconHistory = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l4 2"/></svg>;
const IconSearch = () => <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconArrowLeft = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>;
const IconArrowRight = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
const IconChevronDown = () => <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const IconChevronUp = () => <svg className="w-4 h-4 text-[#58b347]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const IconLayers = () => <svg className="w-5 h-5 text-[#58b347]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>;
const IconTool = () => <svg className="w-3.5 h-3.5 inline-block mr-1 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>;
const IconDrop = () => <svg className="w-3.5 h-3.5 inline-block mr-1 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/></svg>;
const IconImport = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>;
const IconAlert = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconPlusCenter = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconPlus = () => <svg className="w-4 h-4 inline-block mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>;
const IconEdit = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconCalendar = () => <svg className="w-3.5 h-3.5 text-slate-400 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconShield = () => <svg className="w-3.5 h-3.5 text-slate-400 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>;
const IconBell = () => <svg className="w-4 h-4 text-slate-300 hover:text-red-500 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>;
const IconBellOff = () => <svg className="w-4 h-4 text-red-500 hover:text-slate-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M8.7 3A6 6 0 0 1 18 8a21.3 21.3 0 0 0 .6 5M17 17H3s3-2 3-9a4.67 4.67 0 0 1 .3-1.7M10.3 21a1.94 1.94 0 0 0 3.4 0"/><line x1="2" y1="2" x2="22" y2="22"/></svg>;
const IconFilter = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const IconTrash = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconInfo = () => <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconSort = () => <svg className="w-3.5 h-3.5 inline-block ml-1 opacity-40 hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>;
const IconColumns = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>;
const IconArrowUp = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const IconArrowDown = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const IconCheck = () => <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;

// --- DYNAMICZNE IKONY POJAZDÓW ---
const IconCar = ({ className = "w-4 h-4 inline-block mr-1 opacity-70" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a2 2 0 0 0-1.6-.8H9.3a2 2 0 0 0-1.6.8L5 11l-5.16.86a1 1 0 0 0-.84.99V16h3" />
    <circle cx="7.5" cy="16.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
);

const IconTruck = ({ className = "w-4 h-4 inline-block mr-1 opacity-70" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 18H3c-.6 0-1-.4-1-1V7c0-.6.4-1 1-1h10c.6 0 1 .4 1 1v11" />
    <path d="M14 9h4l4 4v5h-3" />
    <circle cx="7.5" cy="18" r="2.5" />
    <circle cx="17.5" cy="18" r="2.5" />
  </svg>
);

const IconLift = ({ className = "w-4 h-4 inline-block mr-1 opacity-70" }: { className?: string }) => (
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

const IconForVehicle = ({ type, className }: { type?: string | null, className?: string }) => {
  const resolvedType = type || 'Osobowy';
  if (resolvedType === 'Van / Bus') return <IconTruck className={className} />;
  if (resolvedType === 'Podnośnik koszowy') return <IconLift className={className} />;
  return <IconCar className={className} />;
};

const CustomCheckbox = ({ checked, onChange }: { checked: boolean, onChange: () => void }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-4 h-4 rounded-[4px] flex items-center justify-center cursor-pointer transition-colors duration-200 shrink-0 ${checked ? 'bg-[#58b347] border-[#58b347]' : 'border border-slate-300 bg-white hover:border-[#58b347]/50'}`}
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

  // Stany dla Smart Search & Tabs
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([{ id: 'init', text: '', logic: 'AND' }]);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [customTabs, setCustomTabs] = useState<CustomTabEq[]>([]);
  const [isCustomTabModalOpen, setIsCustomTabModalOpen] = useState(false);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [newCustomTab, setNewCustomTab] = useState<{ name: string, filterQueries: SearchQuery[] }>({ name: '', filterQueries: [{ id: 'c_init', text: '', logic: 'AND' }] });

  // Konfiguracja Kolumn
  const [centralColumns, setCentralColumns] = useState<ColumnDef[]>(defaultCentralColumns);
  const [mobileColumns, setMobileColumns] = useState<ColumnDef[]>(defaultMobileColumns);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Konfigurowalny limit zapasów
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(3);

  // Stany UI
  const [isSummaryExpanded, setIsSummaryExpanded] = useState(true);
  const [expandedTechIds, setExpandedTechIds] = useState<string[]>([]);
  const [hoveredPartId, setHoveredPartId] = useState<string | null>(null);
  
  // Akordeony Centralne
  const [centralExpandedCats, setCentralExpandedCats] = useState<string[]>(['Pojazd', 'Narzędzie', 'Część zamienna', 'Materiał eksploatacyjny', 'Inne']);

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

  // DRAG & DROP Wskaźników KPI / ZAKŁADEK
  const defaultTabIds = ['default_all', 'default_mobile', 'default_low_stock', 'default_expiring', 'default_muted'];
  const [tabOrder, setTabOrder] = useState<string[]>([]);
  const draggedTabRef = useRef<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

  // Refs dla scrolla
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const scrollIntervalRef = useRef<number | null>(null);

  // --- WODOTRYSK: EDGE-SCROLL DLA PASKA ZAKŁADEK ---
  const stopEdgeScroll = useCallback(() => {
    if (scrollIntervalRef.current) {
      cancelAnimationFrame(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  }, []);

  const startEdgeScroll = useCallback((direction: 'left' | 'right') => {
    stopEdgeScroll();
    const scrollContainer = tabsScrollRef.current;
    if (!scrollContainer) return;

    const performScroll = () => {
      const speed = 10;
      if (direction === 'left') scrollContainer.scrollLeft -= speed;
      else scrollContainer.scrollLeft += speed;
      scrollIntervalRef.current = requestAnimationFrame(performScroll);
    };
    scrollIntervalRef.current = requestAnimationFrame(performScroll);
  }, [stopEdgeScroll]);

  // --- WODOTRYSK: SMART SCROLL (KÓŁKO MYSZY PRZESUWA W POZIOMIE TYLKO NAD KAFLAMI) ---
  useEffect(() => {
    const el = tabsScrollRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      // Ignoruj naturalny ruch w poziomie (Touchpady gładzika) - system poradzi z tym sobie sam
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      // Zablokuj domyślne zachowanie (przewijanie całej strony w dół), gdy myszka jest na liście kafli!
      if (Math.abs(e.deltaY) > 0) {
        e.preventDefault(); 
        el.scrollLeft += e.deltaY * 1.5; // Zamień ruch "góra/dół" na płynne pchanie w boki
      }
    };

    // passive: false to wymóg współczesnych przeglądarek, aby e.preventDefault działało na wheel
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
      stopEdgeScroll();
    };
  }, [stopEdgeScroll]);

  // Ładowanie ustawień i zakładek
  useEffect(() => {
    let parsedCustom: CustomTabEq[] = [];
    const savedTabs = localStorage.getItem('ekoen_eq_custom_tabs');
    if (savedTabs) {
      try { 
        parsedCustom = JSON.parse(savedTabs);
        setCustomTabs(parsedCustom);
      } catch (e) {}
    }

    const savedOrder = localStorage.getItem('ekoen_eq_tab_order');
    const expectedIds = [...defaultTabIds, ...parsedCustom.map(t => t.id)];
    
    if (savedOrder) {
      try { 
        let order = JSON.parse(savedOrder);
        const finalOrder = order.filter((id: string) => expectedIds.includes(id));
        expectedIds.forEach((id: string) => { if (!finalOrder.includes(id)) finalOrder.push(id); });
        setTabOrder(finalOrder);
      } catch(e) { setTabOrder(expectedIds); }
    } else {
      setTabOrder(expectedIds);
    }

    const savedThreshold = localStorage.getItem('ekoen_eq_low_stock_threshold');
    if (savedThreshold) setLowStockThreshold(parseInt(savedThreshold, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpdateThreshold = (val: number) => {
    setLowStockThreshold(val);
    localStorage.setItem('ekoen_eq_low_stock_threshold', val.toString());
  };

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
      setExpandedTechIds(prev => prev.length === 0 && techRes.data.length > 0 ? [techRes.data[0].id] : prev);
    }
    if (invRes.data) setTechInventory(invRes.data);
    if (logsRes.data) setLogs(logsRes.data);
    setIsLoading(false);
  }, []);

  useEffect(() => { 
    fetchData(); 
  }, [fetchData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNewPartModalOpen(false);
        setEditingPart(null);
        setIsImportModalOpen(false);
        setIssueModalPart(null);
        setIsCustomTabModalOpen(false);
        setIsColumnSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Resetowanie Hovera przy zmianie zakładki
  useEffect(() => { setHoveredPartId(null); setSelectedIds([]); setSortConfig(null); }, [activeTab]);

  // --- LOGIKA BIZNESOWA ---
  const handleCreatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = { ...newPart, is_muted: false, mobile_muted: false };
    
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

    if (!payload.inspection_date) payload.inspection_date = null;
    if (!payload.insurance_date) payload.insurance_date = null;

    const isUnique = Boolean((payload.category === 'Pojazd' && payload.vehicle_plate && payload.vehicle_plate.trim().length > 0) || 
                             (payload.category === 'Narzędzie' && payload.serial_number && payload.serial_number.trim().length > 0));
                     
    if (isUnique) {
      payload.main_stock = 1;
    }

    // USUNIĘCIE WŁAŚCIWOŚCI WIRTUALNYCH
    delete payload.stock;

    const { error } = await supabase.from('parts').insert([payload]);
    if (error) {
      alert(`Błąd: ${error.message}`);
    } else { 
      setIsNewPartModalOpen(false); 
      setNewPart({ sku: '', name: '', category: 'Część zamienna', unit: 'szt.', main_stock: 0, inspection_date: '', vehicle_type: 'Osobowy', vehicle_plate: '', serial_number: '', insurance_date: '', service_status: 'Sprawny', notes: '' }); 
      fetchData(); 
    }
  };

  const handleUpdatePart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPart) return;
    const payload: any = { ...editingPart };

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

    if (!payload.inspection_date) payload.inspection_date = null;
    if (!payload.insurance_date) payload.insurance_date = null;

    const isUnique = Boolean((payload.category === 'Pojazd' && payload.vehicle_plate && payload.vehicle_plate.trim().length > 0) || 
                             (payload.category === 'Narzędzie' && payload.serial_number && payload.serial_number.trim().length > 0));

    if (isUnique) {
      payload.main_stock = 1;
    }

    // USUNIĘCIE WŁAŚCIWOŚCI WIRTUALNYCH (Zapobiega "Could not find stock column")
    delete payload.stock;

    const { error } = await supabase.from('parts').update(payload).eq('id', editingPart.id);
    if (error) alert(`Błąd: ${error.message}`);
    else { setEditingPart(null); fetchData(); }
  };

  const deleteSelected = async () => {
    if (!confirm(`Na pewno chcesz bezpowrotnie usunąć wybrane elementy (${selectedIds.length}) z magazynu? Powiązane z nimi stany na autach i historia logów również mogą zostać usunięte!`)) return;
    const { error } = await supabase.from('parts').delete().in('id', selectedIds);
    if (error) alert('Błąd usuwania: ' + error.message);
    else { setSelectedIds([]); setHoveredPartId(null); fetchData(); }
  };

  // Trójpoziomowy System Wyciszania
  const handleToggleMuteCentral = async (part: Part) => {
    const newStatus = !part.is_muted;
    setParts(curr => curr.map(p => p.id === part.id ? { ...p, is_muted: newStatus } : p));
    await supabase.from('parts').update({ is_muted: newStatus }).eq('id', part.id);
  };

  const handleToggleMuteMobile = async (part: Part) => {
    const newStatus = !part.mobile_muted;
    setParts(curr => curr.map(p => p.id === part.id ? { ...p, mobile_muted: newStatus } : p));
    const { error } = await supabase.from('parts').update({ mobile_muted: newStatus }).eq('id', part.id);
    if (error && error.message.includes('column "mobile_muted"')) {
      alert("Błąd: Proszę dodać kolumnę 'mobile_muted' (typ: boolean) do tabeli 'parts' w Supabase.");
    }
  };

  const handleToggleMuteTech = async (invItem: TechInventory) => {
    const newStatus = !invItem.is_muted;
    setTechInventory(curr => curr.map(i => i.id === invItem.id ? { ...i, is_muted: newStatus } : i));
    const { error } = await supabase.from('technician_inventory').update({ is_muted: newStatus }).eq('id', invItem.id);
    if (error && error.message.includes('column "is_muted"')) {
      alert("Błąd: Proszę dodać kolumnę 'is_muted' (typ: boolean) do tabeli 'technician_inventory' w Supabase.");
    }
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
      
      if (!existing || existing.quantity < issueForm.quantity) { alert("Błąd: Próbujesz zwrócić więcej niż technik posiada!"); return; }

      await supabase.from('technician_inventory').update({ quantity: existing.quantity - issueForm.quantity }).eq('id', existing.id);
      await supabase.from('parts').update({ main_stock: issueModalPart.main_stock + issueForm.quantity }).eq('id', issueModalPart.id);
      await supabase.from('inventory_logs').insert([{ part_id: issueModalPart.id, technician_id: issueForm.technician_id, operation_type: 'ZWROT', quantity: issueForm.quantity, notes: 'Zwrot do centrali' }]);
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

  // --- LOGIKA SMART SEARCH & CUSTOM TABS ---
  const handleEditTab = (tab: CustomTabEq) => {
    setEditingTabId(tab.id);
    setNewCustomTab({
      name: tab.name,
      filterQueries: tab.filterQueries.length > 0 ? tab.filterQueries : [{ id: Math.random().toString(), text: '', logic: 'AND' }]
    });
    setIsCustomTabModalOpen(true);
  };

  const handleSaveCustomTab = (e: React.FormEvent) => {
    e.preventDefault();
    const validQueries = newCustomTab.filterQueries.filter(q => q.text.trim() !== '');

    if (editingTabId) {
      const updatedTabs = customTabs.map(t => 
        t.id === editingTabId ? { ...t, name: newCustomTab.name, filterQueries: validQueries } : t
      );
      setCustomTabs(updatedTabs);
      localStorage.setItem('ekoen_eq_custom_tabs', JSON.stringify(updatedTabs));
    } else {
      const newTab: CustomTabEq = {
        id: Math.random().toString(36).substring(7),
        name: newCustomTab.name,
        filterQueries: validQueries
      };
      const updatedTabs = [...customTabs, newTab];
      setCustomTabs(updatedTabs);
      localStorage.setItem('ekoen_eq_custom_tabs', JSON.stringify(updatedTabs));
      
      const newOrder = [...tabOrder, newTab.id];
      setTabOrder(newOrder);
      localStorage.setItem('ekoen_eq_tab_order', JSON.stringify(newOrder));
    }
    
    setIsCustomTabModalOpen(false);
    setEditingTabId(null);
    setNewCustomTab({ name: '', filterQueries: [{ id: Math.random().toString(), text: '', logic: 'AND' }] });
  };

  const handleDeleteCustomTab = (id: string) => {
    const updatedTabs = customTabs.filter(t => t.id !== id);
    setCustomTabs(updatedTabs);
    localStorage.setItem('ekoen_eq_custom_tabs', JSON.stringify(updatedTabs));
    
    const newOrder = tabOrder.filter(tId => tId !== id);
    setTabOrder(newOrder);
    localStorage.setItem('ekoen_eq_tab_order', JSON.stringify(newOrder));

    if (activeFilter === `CUSTOM_${id}`) setActiveFilter('ALL');
  };

  const handleTabDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    draggedTabRef.current = id;
    setTimeout(() => setDraggedTabId(id), 0);
  };

  const handleTabDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    
    const container = tabsScrollRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      if (x < 80) container.scrollLeft -= 15;
      else if (x > rect.width - 80) container.scrollLeft += 15;
    }
  };

  const handleTabDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const sourceId = draggedTabRef.current || e.dataTransfer.getData('text/plain');
    
    if (!sourceId || sourceId === targetId) {
       setDraggedTabId(null);
       return;
    }

    const sourceIndex = tabOrder.indexOf(sourceId);
    const targetIndex = tabOrder.indexOf(targetId);

    if (sourceIndex !== -1 && targetIndex !== -1) {
      const newOrder = [...tabOrder];
      const [movedTab] = newOrder.splice(sourceIndex, 1);
      newOrder.splice(targetIndex, 0, movedTab);
      setTabOrder(newOrder);
      localStorage.setItem('ekoen_eq_tab_order', JSON.stringify(newOrder));
    }
    setDraggedTabId(null);
    draggedTabRef.current = null;
  };

  const evaluateCondition = useCallback((p: Part, q: SearchQuery) => {
    const qText = q.text.trim().toLowerCase();
    if (!qText) return true;
    return (p.name.toLowerCase().includes(qText)) ||
           (p.sku.toLowerCase().includes(qText)) ||
           (p.serial_number?.toLowerCase().includes(qText)) ||
           (p.vehicle_plate?.toLowerCase().includes(qText));
  }, []);

  const mobileSummaryRaw = useMemo(() => {
    const sum: Record<string, { part: Part, total: number, breakdown: { tech: Technician, qty: number }[] }> = {};
    techInventory.forEach(item => {
      if (item.quantity <= 0) return;
      const part = parts.find(p => p.id === item.part_id);
      const tech = technicians.find(t => t.id === item.technician_id);
      if (!part || !tech) return;
      if (!sum[part.id]) sum[part.id] = { part, total: 0, breakdown: [] };
      sum[part.id].total += item.quantity;
      sum[part.id].breakdown.push({ tech, qty: item.quantity });
    });
    return sum;
  }, [techInventory, parts, technicians]);

  const filteredParts = useMemo(() => {
    let result = parts;

    // Filtry główne na całą pule części przed budowaniem akordeonów
    if (activeFilter === 'EXPIRING') {
      result = result.filter(p => {
        const insp = p.inspection_date ? getExpiryStatus(p.inspection_date) : null;
        const ins = p.insurance_date ? getExpiryStatus(p.insurance_date) : null;
        return (insp && (insp.isExpired || insp.isExpiring)) || (ins && (ins.isExpired || ins.isExpiring));
      });
    } else if (activeFilter === 'LOW_STOCK') {
      if (activeTab === 'central') {
        result = result.filter(p => !p.is_muted && ['Część zamienna', 'Materiał eksploatacyjny'].includes(p.category) && p.main_stock <= lowStockThreshold);
      } else {
        result = result.filter(p => !p.is_muted && !p.mobile_muted && ['Część zamienna', 'Materiał eksploatacyjny'].includes(p.category) && (mobileSummaryRaw[p.id]?.total || 0) <= lowStockThreshold);
      }
    } else if (activeFilter === 'MUTED') {
      if (activeTab === 'central') {
        result = result.filter(p => p.is_muted);
      } else {
        result = result.filter(p => p.is_muted || p.mobile_muted || techInventory.some(inv => inv.part_id === p.id && inv.quantity > 0 && inv.is_muted));
      }
    } else if (activeFilter.startsWith('CUSTOM_')) {
      const tabId = activeFilter.split('_')[1];
      const tabInfo = customTabs.find(c => c.id === tabId);
      if (tabInfo) {
        result = result.filter(p => {
          const validQ = tabInfo.filterQueries.filter(q => q.text.trim() !== '');
          if (validQ.length > 0) {
            let match = evaluateCondition(p, validQ[0]);
            if (validQ[0].logic === 'NOT') match = !match;
            for (let i = 1; i < validQ.length; i++) {
              const conditionMet = evaluateCondition(p, validQ[i]);
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

    // Wyszukiwarka tekstowa Smart Search
    const validSearchQueries = searchQueries.filter(q => q.text.trim() !== '');
    if (validSearchQueries.length > 0) {
      result = result.filter(p => {
        let match = evaluateCondition(p, validSearchQueries[0]);
        if (validSearchQueries[0].logic === 'NOT') match = !match;
        for (let i = 1; i < validSearchQueries.length; i++) {
          const conditionMet = evaluateCondition(p, validSearchQueries[i]);
          if (validSearchQueries[i].logic === 'AND') match = match && conditionMet;
          else if (validSearchQueries[i].logic === 'OR') match = match || conditionMet;
          else if (validSearchQueries[i].logic === 'NOT') match = match && !conditionMet;
        }
        return match;
      });
    }

    const resultWithMobileStock = result.map(p => {
      const breakdown = techInventory.filter(i => i.part_id === p.id && i.quantity > 0);
      const totalInField = breakdown.reduce((sum, b) => sum + b.quantity, 0);
      return { ...p, stock: activeTab === 'mobile' ? totalInField : p.main_stock };
    });

    if (sortConfig) {
      return resultWithMobileStock.sort((a, b) => {
        const aVal = a[sortConfig.key] || '';
        const bVal = b[sortConfig.key] || '';
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return resultWithMobileStock.sort((a, b) => a.name.localeCompare(b.name));
  }, [parts, searchQueries, activeFilter, customTabs, evaluateCondition, lowStockThreshold, sortConfig, techInventory, activeTab, mobileSummaryRaw]);

  const getCustomTabCount = useCallback((tabInfo: CustomTabEq) => {
    let res = activeTab === 'central' ? parts : parts.filter(p => techInventory.some(i => i.part_id === p.id && i.quantity > 0));
    res = res.filter(p => {
      const validQ = tabInfo.filterQueries.filter(q => q.text.trim() !== '');
      if (validQ.length > 0) {
        let match = evaluateCondition(p, validQ[0]);
        if (validQ[0].logic === 'NOT') match = !match;
        for (let i = 1; i < validQ.length; i++) {
          const conditionMet = evaluateCondition(p, validQ[i]);
          if (validQ[i].logic === 'AND') match = match && conditionMet;
          else if (validQ[i].logic === 'OR') match = match || conditionMet;
          else if (validQ[i].logic === 'NOT') match = match && !conditionMet;
        }
        if (!match) return false;
      }
      return true;
    });
    return res.length;
  }, [parts, techInventory, activeTab, evaluateCondition]);

  const centralSummary = useMemo(() => {
    const groups: Record<string, Part[]> = { 'Pojazd': [], 'Narzędzie': [], 'Część zamienna': [], 'Materiał eksploatacyjny': [], 'Inne': [] };
    filteredParts.forEach(p => {
      const c = p.category || 'Inne';
      if (groups[c]) groups[c].push(p); else groups['Inne'].push(p);
    });
    return groups;
  }, [filteredParts]);

  const filteredTechInventory = useMemo(() => {
    const validSearchQueries = searchQueries.filter(q => q.text.trim() !== '');
    if (validSearchQueries.length === 0) return techInventory;
    
    return techInventory.filter(item => {
      const p = parts.find(x => x.id === item.part_id);
      if (!p) return false;
      
      let match = evaluateCondition(p, validSearchQueries[0]);
      if (validSearchQueries[0].logic === 'NOT') match = !match;
      
      for (let i = 1; i < validSearchQueries.length; i++) {
        const conditionMet = evaluateCondition(p, validSearchQueries[i]);
        if (validSearchQueries[i].logic === 'AND') match = match && conditionMet;
        else if (validSearchQueries[i].logic === 'OR') match = match || conditionMet;
        else if (validSearchQueries[i].logic === 'NOT') match = match && !conditionMet;
      }
      return match;
    });
  }, [techInventory, parts, searchQueries, evaluateCondition]);

  const mobileSummary = useMemo(() => {
    const groups: Record<string, { part: Part, total: number, breakdown: { tech: Technician, qty: number }[] }[]> = { 'Pojazd': [], 'Narzędzie': [], 'Część zamienna': [], 'Materiał eksploatacyjny': [], 'Inne': [] };
    
    const relevantParts = filteredParts.filter(p => {
      if (activeFilter === 'LOW_STOCK') return p.stock <= lowStockThreshold;
      return true;
    });

    relevantParts.forEach(p => {
      const breakdown = techInventory
        .filter(i => i.part_id === p.id && i.quantity > 0)
        .map(i => ({ tech: technicians.find(t => t.id === i.technician_id)!, qty: i.quantity }))
        .filter(b => b.tech);

      if (breakdown.length === 0) return;

      const c = p.category || 'Inne';
      if (groups[c]) {
        groups[c].push({ part: p, total: p.stock, breakdown });
      } else {
        groups['Inne'].push({ part: p, total: p.stock, breakdown });
      }
    });

    return groups;
  }, [filteredParts, techInventory, technicians, activeFilter, lowStockThreshold]);

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

  const techniciansWithBrokenItems = useMemo(() => {
    const brokenItemIds = parts.filter(p => p.service_status === 'W serwisie' || p.service_status === 'Uszkodzony').map(p => p.id);
    return techInventory.filter(inv => brokenItemIds.includes(inv.part_id) && inv.quantity > 0).map(inv => inv.technician_id);
  }, [parts, techInventory]);

  // KPI Calculations
  const totalPartsInField = useMemo(() => techInventory.reduce((acc, curr) => acc + (curr.quantity || 0), 0), [techInventory]);
  
  const lowStockAlerts = useMemo(() => {
    if (activeTab === 'central') {
      return parts.filter(p => !p.is_muted && ['Część zamienna', 'Materiał eksploatacyjny'].includes(p.category) && p.main_stock <= lowStockThreshold).length;
    } else {
      return Object.values(mobileSummaryRaw).filter(i => !i.part.is_muted && !i.part.mobile_muted && ['Część zamienna', 'Materiał eksploatacyjny'].includes(i.part.category) && i.total <= lowStockThreshold).length;
    }
  }, [parts, mobileSummaryRaw, lowStockThreshold, activeTab]);

  const mutedAlertsCount = useMemo(() => {
    if (activeTab === 'central') {
      return parts.filter(p => p.is_muted).length;
    } else {
      let count = 0;
      Object.values(mobileSummaryRaw).forEach(i => {
        if (i.part.is_muted || i.part.mobile_muted) {
          count++;
        } else {
          const hasMutedTechItems = techInventory.some(inv => inv.part_id === i.part.id && inv.quantity > 0 && inv.is_muted);
          if (hasMutedTechItems) count++;
        }
      });
      return count;
    }
  }, [parts, activeTab, mobileSummaryRaw, techInventory]);

  const expiringPartsCount = useMemo(() => parts.filter(p => {
    const insp = p.inspection_date ? getExpiryStatus(p.inspection_date) : null;
    const ins = p.insurance_date ? getExpiryStatus(p.insurance_date) : null;
    return (insp && (insp.isExpired || insp.isExpiring)) || (ins && (ins.isExpired || ins.isExpiring));
  }).length, [parts]);

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
                  placeholder="Wpisz nazwę, SKU, rejestrację lub nr seryjny..."
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

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredParts.length && filteredParts.length > 0) setSelectedIds([]);
    else setSelectedIds(filteredParts.map(p => p.id));
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(selId => selId !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const moveColumn = (index: number, direction: -1 | 1) => {
    const cols = activeTab === 'central' ? centralColumns : mobileColumns;
    const setCols = activeTab === 'central' ? setCentralColumns : setMobileColumns;
    const newCols = [...cols];
    const target = index + direction;
    if (target >= 0 && target < newCols.length) {
      [newCols[index], newCols[target]] = [newCols[target], newCols[index]];
      setCols(newCols);
    }
  };

  const toggleColumnVisibility = (index: number) => {
    const cols = activeTab === 'central' ? centralColumns : mobileColumns;
    const setCols = activeTab === 'central' ? setCentralColumns : setMobileColumns;
    const newCols = [...cols];
    newCols[index].visible = !newCols[index].visible;
    setCols(newCols);
  };

  const handleSort = (key: keyof Part | 'stock') => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const renderCellContent = (rowData: { part: Part, quantity: number, techId?: string, invItem?: TechInventory }, key: ColumnKey) => {
    const p = rowData.part;
    const inspExpiry = getExpiryStatus(p.inspection_date);
    const insExpiry = getExpiryStatus(p.insurance_date);
    const isVehicle = p.category === 'Pojazd';
    const isTool = p.category === 'Narzędzie';
    const hasSerial = !!p.serial_number;
    const isBroken = p.service_status === 'W serwisie' || p.service_status === 'Uszkodzony';

    const effectiveMuted = 
      activeTab === 'central' ? p.is_muted :
      activeTab === 'mobile' && !rowData.techId ? (p.is_muted || p.mobile_muted) :
      (p.is_muted || p.mobile_muted || rowData.invItem?.is_muted);

    const handleMuteClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (activeTab === 'central') handleToggleMuteCentral(p);
      if (activeTab === 'mobile' && !rowData.techId) handleToggleMuteMobile(p);
      if (activeTab === 'mobile' && rowData.techId && rowData.invItem) handleToggleMuteTech(rowData.invItem);
    }

    let muteTooltip = "Zarządzaj powiadomieniami";
    if (activeTab === 'central') muteTooltip = effectiveMuted ? "Odwycisz w centralnym (Globalnie)" : "Wycisz w centralnym (Globalnie)";
    if (activeTab === 'mobile' && !rowData.techId) muteTooltip = effectiveMuted ? "Odwycisz dla wszystkich aut w terenie" : "Wycisz powiadomienia dla wszystkich aut";
    if (activeTab === 'mobile' && rowData.techId) muteTooltip = effectiveMuted ? "Odwycisz tylko u tego technika" : "Wycisz tylko u tego technika";

    switch (key) {
      case 'select':
        return (
          <div className="flex justify-center w-full">
            <CustomCheckbox checked={selectedIds.includes(p.id)} onChange={() => toggleSelect(p.id)} />
          </div>
        );
      case 'actions':
        if (activeTab === 'central') {
          return (
            <div className="flex justify-end gap-2 w-full">
              <button onClick={(e) => { e.stopPropagation(); setIssueForm({ ...issueForm, type: 'DOSTAWA' }); setIssueModalPart(p); }} className="text-[10px] font-bold border border-slate-200 bg-white text-slate-600 px-3 py-1.5 rounded-lg hover:bg-slate-50 shadow-sm transition-colors uppercase tracking-wider">
                + Dostawa
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); setIssueForm({ ...issueForm, type: 'WYDANIE' }); setIssueModalPart(p); }} 
                disabled={p.main_stock === 0 || isBroken} 
                className={`text-[10px] font-bold px-3 py-1.5 rounded-lg shadow-sm transition-colors uppercase tracking-wider flex items-center justify-center gap-1 ${isBroken ? 'border border-red-200 bg-red-50 text-red-500 opacity-60 cursor-not-allowed' : 'border border-[#58b347] bg-[#58b347] text-white hover:bg-[#499b3a] disabled:opacity-40 disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400'}`}
                title={isBroken ? 'Wydanie zablokowane ze względu na status serwisowy!' : ''}
              >
                Wydaj <IconArrowRight />
              </button>
            </div>
          );
        }
        if (activeTab === 'mobile' && rowData.techId) {
          return (
            <div className="flex justify-end w-full">
              <button 
                onClick={(e) => { e.stopPropagation(); setIssueForm({ type: 'ZWROT', technician_id: rowData.techId!, quantity: 1 }); setIssueModalPart(p); }}
                className="text-[9px] font-bold bg-white border border-slate-200 text-[#499b3a] px-3 py-1.5 rounded-lg hover:bg-slate-100 hover:border-[#58b347] transition-colors uppercase tracking-widest shadow-sm flex items-center gap-1.5"
              >
                <IconArrowLeft /> Zwróć
              </button>
            </div>
          );
        }
        return null;
      case 'sku':
        return (
          <>
            <span>{p.sku}</span>
            {effectiveMuted && <span className="inline-flex mt-1.5 px-2 py-0.5 bg-slate-100 text-slate-500 rounded text-[9px] font-bold border border-slate-200 uppercase tracking-widest w-max">Wyciszony</span>}
          </>
        );
      case 'name':
        return (
          <>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-sm font-bold text-slate-800 leading-tight">{p.name}</span>
              <button onClick={(e) => { e.stopPropagation(); setEditingPart(p); }} className="text-slate-300 hover:text-[#58b347] transition-colors p-1" title="Edytuj kartotekę"><IconEdit /></button>
              
              {/* DZWONEK DO WYCISZANIA */}
              {['Część zamienna', 'Materiał eksploatacyjny'].includes(p.category) && (
                <button 
                  onClick={handleMuteClick} 
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 ml-1" 
                  title={muteTooltip}
                >
                  {effectiveMuted ? <IconBellOff /> : <IconBell />}
                </button>
              )}
            </div>
            {isVehicle && p.vehicle_plate && (
              <span className="text-[10px] font-bold font-mono text-slate-500 uppercase flex items-center gap-1 w-max border border-slate-200 bg-white px-2 py-0.5 rounded shadow-sm">
                <IconForVehicle type={p.vehicle_type} className="w-3.5 h-3.5 opacity-70" /> {p.vehicle_plate}
              </span>
            )}
            {isTool && hasSerial && (
              <span className="text-[10px] font-bold font-mono text-slate-500 uppercase flex items-center gap-1 w-max border border-slate-200 bg-white px-2 py-0.5 rounded shadow-sm">
                <IconTool /> S/N: {p.serial_number}
              </span>
            )}
          </>
        );
      case 'category':
        return (
          <div className="flex items-center gap-2">
            <div className="text-[#58b347]">{getCategoryIcon(p.category)}</div>
            <span>{p.category}</span>
          </div>
        );
      case 'status':
        return (
          <>
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
          </>
        );
      case 'stock':
        const displayStock = rowData.quantity;
        const isLowStock = displayStock <= lowStockThreshold;
        return (
          <div className="flex flex-col items-center">
            {activeTab === 'central' && (
              displayStock === 0 ? (
                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest mb-1 ${effectiveMuted ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-red-50 text-red-600 border-red-200 animate-pulse'}`}>Braki</span>
              ) : isLowStock ? (
                <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest mb-1 ${effectiveMuted ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-orange-50 text-orange-600 border-orange-200'}`}>Niski Stan</span>
              ) : (
                <span className="inline-flex px-2 py-0.5 bg-green-50 text-green-600 rounded text-[9px] font-bold border border-green-200 uppercase tracking-widest mb-1">Dostępne</span>
              )
            )}
            <span className={`text-lg font-bold tabular-nums ${activeTab === 'central' && displayStock === 0 && !effectiveMuted ? 'text-red-500' : 'text-slate-800'}`}>
              {displayStock} <span className="font-bold text-[10px] text-slate-400 uppercase">{p.unit}</span>
            </span>
          </div>
        );
      default:
        return null;
    }
  };

  const activeCols = activeTab === 'central' ? centralColumns : mobileColumns;

  // --- RENDEROWANIE POJEDYNCZEJ ZAKŁADKI (W TYM CUSTOM) ---
  const renderTab = (tabId: string) => {
    const isDragged = draggedTabId === tabId;
    const baseClasses = `min-w-[240px] shrink-0 bg-white/80 backdrop-blur-md rounded-2xl p-4 shadow-sm flex items-center justify-between cursor-grab active:cursor-grabbing transition-all relative group box-border ${isDragged ? 'opacity-40 scale-95' : ''}`;

    if (tabId === 'default_all') {
      const isActive = activeFilter === 'ALL' && activeTab === 'central';
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => { setActiveTab('central'); setActiveFilter('ALL'); }} className={`${baseClasses} border ${isActive ? 'border-[#58b347] ring-2 ring-[#58b347]/20 bg-[#58b347]/5' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none mt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Katalog (Mag. Centralny)</p>
            <p className="text-2xl font-bold text-slate-700">{parts.length}</p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center pointer-events-none mt-1 ${isActive ? 'bg-[#58b347] text-white' : 'bg-[#58b347]/10 text-[#58b347]'}`}>
            <IconPackage />
          </div>
        </div>
      );
    }
    
    if (tabId === 'default_mobile') {
      const isActive = activeTab === 'mobile' && activeFilter === 'ALL';
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => { setActiveTab('mobile'); setActiveFilter('ALL'); }} className={`${baseClasses} border ${isActive ? 'border-[#58b347] ring-2 ring-[#58b347]/20 bg-[#58b347]/5' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none mt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Sprzęt w terenie</p>
            <p className="text-2xl font-bold text-slate-700">{totalPartsInField}</p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center pointer-events-none mt-1 ${isActive ? 'bg-[#58b347] text-white' : 'bg-[#58b347]/10 text-[#58b347]'}`}>
            <IconTruck />
          </div>
        </div>
      );
    }

    if (tabId === 'default_low_stock') {
      const isActive = activeFilter === 'LOW_STOCK';
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => setActiveFilter(prev => prev === 'LOW_STOCK' ? 'ALL' : 'LOW_STOCK')} className={`${baseClasses} border ${isActive ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50' : lowStockAlerts > 0 ? 'border-red-200 hover:bg-red-50/30' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none mt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Krytyczne braki (≤ {lowStockThreshold})</p>
            <p className={`text-2xl font-bold ${lowStockAlerts > 0 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>{lowStockAlerts}</p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center pointer-events-none mt-1 ${lowStockAlerts > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
            <IconAlert />
          </div>
        </div>
      );
    }

    if (tabId === 'default_expiring') {
      const isActive = activeFilter === 'EXPIRING';
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => setActiveFilter(prev => prev === 'EXPIRING' ? 'ALL' : 'EXPIRING')} className={`${baseClasses} border ${isActive ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/50' : expiringPartsCount > 0 ? 'border-orange-200 hover:bg-orange-50/30' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none mt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Wygasające Przeglądy</p>
            <p className={`text-2xl font-bold ${expiringPartsCount > 0 ? 'text-orange-600' : 'text-slate-700'}`}>{expiringPartsCount}</p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center pointer-events-none mt-1 ${expiringPartsCount > 0 ? 'bg-orange-100 text-orange-500' : 'bg-slate-50 text-slate-400'}`}>
            <IconCalendar />
          </div>
        </div>
      );
    }

    if (tabId === 'default_muted') {
      const isActive = activeFilter === 'MUTED';
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => setActiveFilter(prev => prev === 'MUTED' ? 'ALL' : 'MUTED')} className={`${baseClasses} border ${isActive ? 'border-slate-500 ring-2 ring-slate-500/20 bg-slate-50/50' : mutedAlertsCount > 0 ? 'border-slate-200 hover:border-slate-300' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none mt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Wyciszone alerty</p>
            <p className="text-2xl font-bold text-slate-700">{mutedAlertsCount}</p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center pointer-events-none mt-1 ${isActive ? 'bg-slate-200 text-slate-600' : 'bg-slate-50 text-slate-400'}`}>
            <IconBellOff />
          </div>
        </div>
      );
    }

    const tabInfo = customTabs.find(t => t.id === tabId);
    if (tabInfo) {
      const isActive = activeFilter === `CUSTOM_${tabInfo.id}`;
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => setActiveFilter(prev => prev === `CUSTOM_${tabInfo.id}` ? 'ALL' : `CUSTOM_${tabInfo.id}`)} className={`${baseClasses} border ${isActive ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
          <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-auto bg-white/90 backdrop-blur shadow-sm rounded-md border border-slate-100 px-1 py-0.5">
            <button onClick={(e) => { e.stopPropagation(); handleEditTab(tabInfo); }} className="text-slate-400 hover:text-blue-500 transition-colors p-1" title="Edytuj zakładkę"><IconEdit /></button>
            <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomTab(tabId); }} className="text-slate-400 hover:text-red-500 transition-colors p-1" title="Usuń zakładkę"><IconTrash /></button>
          </div>
          <div className="pointer-events-none mt-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">{tabInfo.name}</p>
            <p className="text-2xl font-bold text-slate-700">{getCustomTabCount(tabInfo)}</p>
          </div>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center pointer-events-none mt-1 ${isActive ? 'bg-blue-100 text-blue-500' : 'bg-slate-50 text-slate-400'}`}>
            <IconFilter />
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`absolute inset-0 bg-slate-100/60 backdrop-blur-2xl border-l border-white/20 z-40 flex flex-col font-sans transition-[left] duration-300 ease-out shadow-[-10px_0_30px_rgba(0,0,0,0.05)] overflow-y-auto overflow-x-hidden ${isSidebarHovered ? 'left-[256px]' : 'left-[72px]'} ${customScrollbarClasses}`}>
      
      {/* Pasek Nawigacji - Sticky */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/40 px-6 py-4 flex justify-between items-center shrink-0 z-50 sticky top-0">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Magazyn i Flota</h1>
          <p className="text-xs text-slate-500 mt-1 font-medium">Logistyka zasobów centralnych, mobilnych i pojazdów.</p>
        </div>
        
        <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/60 shadow-inner backdrop-blur-md">
          <button onClick={() => { setActiveTab('central'); setActiveFilter('ALL'); }} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'central' ? 'bg-white shadow-sm border border-slate-200 text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}><IconPackage /> Centralny</button>
          <button onClick={() => { setActiveTab('mobile'); setActiveFilter('ALL'); }} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'mobile' ? 'bg-white shadow-sm border border-slate-200 text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}><IconTruck /> W Terenie</button>
          <button onClick={() => { setActiveTab('logs'); setActiveFilter('ALL'); }} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-white shadow-sm border border-slate-200 text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}><IconHistory /> Historia</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col relative" onContextMenu={handleRightClickClearFilters}>
        {isLoading ? (
          <div className="flex w-full h-[50vh] items-center justify-center text-sm font-bold text-slate-400">Ładowanie bazy danych...</div>
        ) : (
          <div className="min-h-max w-full max-w-[1600px] mx-auto p-6 flex flex-col gap-6">
            
            {/* KARTY KPI + CUSTOMOWE ZAKŁADKI Z EDGE SCROLLEM */}
            <div className="relative group/scroll">
              
              {/* STREFA EDGE-SCROLL LEWA */}
              <div 
                onMouseEnter={() => startEdgeScroll('left')} 
                onMouseLeave={stopEdgeScroll}
                className="absolute left-0 top-0 bottom-2 w-16 z-30 cursor-w-resize bg-gradient-to-r from-slate-200/50 to-transparent opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 rounded-l-2xl"
              />

              {/* KONTENER ZAKŁADEK */}
              <div ref={tabsScrollRef} className={`flex overflow-x-auto gap-6 pb-2 items-stretch shrink-0 select-none ${customScrollbarClasses} relative z-10`}>
                
                {tabOrder.map(id => renderTab(id))}

                <div 
                  onClick={() => {
                    setEditingTabId(null);
                    setNewCustomTab({ name: '', filterQueries: [{ id: Math.random().toString(), text: '', logic: 'AND' }] });
                    setIsCustomTabModalOpen(true);
                  }}
                  className="min-w-[150px] shrink-0 bg-white/50 hover:bg-slate-50 backdrop-blur-md border-2 border-dashed border-slate-300 hover:border-[#58b347] rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-[#58b347] cursor-pointer transition-all group p-4 h-[96px] relative"
                >
                  <div className="bg-white rounded-full p-2 mb-1.5 shadow-sm group-hover:scale-110 transition-transform"><IconPlusCenter /></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-center">Nowy Filtr</span>
                </div>
                <div className="w-2 shrink-0 opacity-0 pointer-events-none">.</div>
              </div>

              {/* STREFA EDGE-SCROLL PRAWA */}
              <div 
                onMouseEnter={() => startEdgeScroll('right')} 
                onMouseLeave={stopEdgeScroll}
                className="absolute right-0 top-0 bottom-2 w-16 z-30 cursor-e-resize bg-gradient-to-l from-slate-200/50 to-transparent opacity-0 group-hover/scroll:opacity-100 transition-opacity duration-300 rounded-r-2xl"
              />
            </div>

            {/* ZAAWANSOWANY PASEK FILTROWANIA (PIONOWY INTEGRALNY) */}
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-5 shrink-0 items-start">
              
              <div className="flex-1 w-full">
                {renderSearchQueries(searchQueries, setSearchQueries)}
              </div>

              <div className="flex flex-col gap-3 min-w-[200px] w-full md:w-auto shrink-0">
                {(searchQueries.some(q => q.text.trim() !== '') || activeFilter !== 'ALL') && (
                  <button 
                    onClick={() => { setSearchQueries([{ id: Math.random().toString(), text: '', logic: 'AND' }]); setActiveFilter('ALL'); }} 
                    className="w-full bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest px-3 py-2.5 rounded-xl transition-colors shadow-sm h-[38px]"
                  >
                    Wyczyść Filtry
                  </button>
                )}

                {activeTab === 'central' && (
                  <div className="flex gap-2 w-full mt-auto">
                    <button onClick={() => setIsImportModalOpen(true)} className="flex-1 bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-1.5 shadow-sm transition-colors h-[38px]">
                      <IconImport /> CSV
                    </button>
                    <button onClick={() => setIsNewPartModalOpen(true)} className="flex-1 bg-[#58b347] text-white border border-[#499b3a] px-3 py-2 rounded-xl text-xs font-bold hover:bg-[#499b3a] flex items-center justify-center gap-1.5 shadow-sm transition-colors h-[38px]">
                      <IconPlus /> Nowy
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* WIDOK: MAGAZYN CENTRALNY I W TERENIE */}
            {(activeTab === 'central' || activeTab === 'mobile') && (
              <div className="flex w-full gap-6 flex-1 items-start relative">
                
                {/* Lewa kolumna: Lista (Centralna lub Mobilna) */}
                <div className="flex-1 flex flex-col bg-white/95 backdrop-blur-sm border border-white/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden min-h-max">
                  
                  {activeFilter === 'EXPIRING' && (
                    <div className="bg-orange-50/90 backdrop-blur-md border-b border-orange-200 p-4 flex justify-between items-center shrink-0">
                      <div className="flex gap-3 items-center text-orange-700">
                        <div className="p-2 bg-orange-100 rounded-full"><IconAlert /></div>
                        <div>
                          <h4 className="font-bold text-sm">Wymagane akcje logistyczne!</h4>
                          <p className="text-xs font-medium opacity-90">Znaleziono {expiringPartsCount} pozycji ze zbliżającym się terminem przeglądu/Ubezpieczenia.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveFilter('ALL')} 
                        className="px-5 py-2.5 bg-white text-orange-700 border border-orange-200 rounded-xl text-xs font-bold hover:bg-orange-50 transition-all shadow-sm"
                      >
                        Zamknij filtr
                      </button>
                    </div>
                  )}

                  {activeFilter === 'LOW_STOCK' && (
                    <div className="bg-red-50/90 backdrop-blur-md border-b border-red-200 p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center shrink-0 gap-4">
                      <div className="flex gap-3 items-center text-red-700">
                        <div className="p-2 bg-red-100 rounded-full"><IconAlert /></div>
                        <div>
                          <h4 className="font-bold text-sm">Krytyczne braki w podglądanym ekwipunku</h4>
                          <div className="text-xs font-medium opacity-90 flex items-center gap-2 mt-1">
                            Wyświetlanie aktywnych pozycji ze stanem 
                            <input 
                              type="number" 
                              min="0"
                              value={lowStockThreshold}
                              onChange={e => handleUpdateThreshold(parseInt(e.target.value) || 0)}
                              className="w-14 px-1.5 py-0.5 border border-red-300 rounded text-red-800 font-bold bg-white text-center focus:outline-none focus:ring-1 focus:ring-red-500"
                            />
                            lub niższym.
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveFilter('ALL')} 
                        className="px-5 py-2.5 bg-white text-red-700 border border-red-200 rounded-xl text-xs font-bold hover:bg-red-50 transition-all shadow-sm"
                      >
                        Zamknij filtr
                      </button>
                    </div>
                  )}

                  {activeFilter === 'MUTED' && (
                    <div className="bg-slate-100/90 backdrop-blur-md border-b border-slate-300 p-4 flex justify-between items-center shrink-0">
                      <div className="flex gap-3 items-center text-slate-700">
                        <div className="p-2 bg-white rounded-full border border-slate-200"><IconBellOff /></div>
                        <div>
                          <h4 className="font-bold text-sm">Przeglądasz wyciszone pozycje</h4>
                          <p className="text-xs font-medium opacity-90">Te elementy są trwale ukryte w powiadomieniach o niskich stanach.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setActiveFilter('ALL')} 
                        className="px-5 py-2.5 bg-white text-slate-700 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-50 transition-all shadow-sm"
                      >
                        Zamknij filtr
                      </button>
                    </div>
                  )}

                  <div className="p-4 border-b border-slate-100/60 flex justify-between items-center bg-slate-50/50 shrink-0">
                    <div className="font-bold text-sm text-slate-700 uppercase tracking-widest">Lista Wyposażenia</div>
                    <div className="flex gap-3 items-center">
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
                              {activeCols.map((c, i) => (
                                <div key={c.key} className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl group transition-colors cursor-pointer" onClick={() => toggleColumnVisibility(i)}>
                                  <div className="flex items-center gap-3">
                                    <CustomCheckbox checked={c.visible} onChange={() => {}} />
                                    <span className={`text-xs font-bold select-none ${c.visible ? 'text-slate-700' : 'text-slate-400'}`}>{c.label === '☑' ? 'Zaznaczanie' : c.label || 'Akcje'}</span>
                                  </div>
                                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => moveColumn(i, -1)} disabled={i === 0} className="p-1 text-slate-400 hover:text-[#58b347] hover:bg-green-50 rounded-md disabled:opacity-20 transition-colors"><IconArrowUp /></button>
                                    <button onClick={() => moveColumn(i, 1)} disabled={i === activeCols.length - 1} className="p-1 text-slate-400 hover:text-[#58b347] hover:bg-green-50 rounded-md disabled:opacity-20 transition-colors"><IconArrowDown /></button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {activeTab === 'central' && selectedIds.length > 0 && (
                        <>
                          <button onClick={deleteSelected} className="bg-red-50 border border-red-200 text-red-600 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-red-100 flex items-center gap-2 shadow-sm transition-all h-[38px]">
                            <IconTrash /> Usuń ({selectedIds.length})
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* TABELA KLASYCZNA */}
                  <div className="w-full overflow-x-auto min-h-max pb-4">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                      <thead className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest shadow-sm shadow-slate-100/50">
                        <tr>
                          {activeCols.filter(c => c.visible).map(c => (
                            <th 
                              key={c.key} 
                              className={`py-4 ${c.thClass} ${c.sortableKey ? 'cursor-pointer hover:text-slate-800 transition-colors' : ''}`}
                              onClick={() => c.sortableKey && handleSort(c.sortableKey)}
                            >
                              {c.key === 'select' && activeTab === 'central' ? (
                                <div className="flex justify-center w-full">
                                  <CustomCheckbox 
                                    checked={selectedIds.length === filteredParts.length && filteredParts.length > 0} 
                                    onChange={toggleSelectAll} 
                                  />
                                </div>
                              ) : (
                                <>
                                  {c.label} {c.sortableKey && <IconSort />}
                                </>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      
                      {isLoading ? (
                        <tbody><tr><td colSpan={activeCols.filter(c => c.visible).length} className="p-12 text-center text-slate-400 font-bold">Ładowanie bazy wyposażenia...</td></tr></tbody>
                      ) : filteredParts.length === 0 ? (
                        <tbody><tr><td colSpan={activeCols.filter(c => c.visible).length} className="p-12 text-center text-slate-400 font-bold">Brak wyników w bazie.</td></tr></tbody>
                      ) : (
                        // WIDOK: CENTRALNY (Kategorie - Klasyczne Akordeony)
                        activeTab === 'central' ? (
                          Object.keys(centralSummary).map(cat => {
                            const catParts = centralSummary[cat];
                            if (!catParts || catParts.length === 0) return null;
                            const isOpen = centralExpandedCats.includes(cat);
                            return (
                              <tbody key={`central-${cat}`} className="divide-y divide-slate-100/60">
                                <tr 
                                  className="bg-[#58b347]/10 hover:bg-[#58b347]/20 cursor-pointer transition-colors border-y border-[#58b347]/20"
                                  onClick={() => setCentralExpandedCats(p => p.includes(cat) ? p.filter(c => c !== cat) : [...p, cat])}
                                >
                                  <td colSpan={activeCols.filter(c => c.visible).length} className="px-6 py-4">
                                    <div className="flex justify-between items-center">
                                      <div className="flex items-center gap-3">
                                        <div className="bg-white p-2 rounded-lg shadow-sm text-[#58b347]">{getCategoryIcon(cat)}</div>
                                        <span className="text-sm font-extrabold uppercase tracking-widest text-[#499b3a]">{cat}</span>
                                        <span className="text-[10px] font-bold bg-white text-[#499b3a] px-2.5 py-0.5 rounded-full shadow-sm border border-[#58b347]/20">{catParts.length}</span>
                                      </div>
                                      <span className="text-[#58b347] bg-white p-1.5 rounded-lg shadow-sm border border-[#58b347]/20">{isOpen ? <IconChevronUp /> : <IconChevronDown />}</span>
                                    </div>
                                  </td>
                                </tr>
                                
                                {isOpen && catParts.map(p => (
                                  <tr 
                                    key={p.id} 
                                    onMouseEnter={() => setHoveredPartId(p.id)}
                                    className={`bg-white hover:bg-slate-50/80 transition-colors cursor-pointer group ${selectedIds.includes(p.id) ? 'bg-[#58b347]/5 hover:bg-[#58b347]/10' : ''}`}
                                  >
                                    {activeCols.filter(c => c.visible).map((c, index) => (
                                      <td key={c.key} className={`py-4 relative ${c.tdClass}`}>
                                        {index === 0 && <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${hoveredPartId === p.id ? 'bg-[#58b347]' : 'bg-transparent group-hover:bg-[#58b347]'}`} />}
                                        {renderCellContent({ part: p, quantity: p.main_stock }, c.key)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            )
                          })
                        ) : (
                          // WIDOK: W TERENIE (Akordeony Techników)
                          <>
                            {/* Akordeon SUMA SPRZĘTU */}
                            <tbody className="divide-y divide-slate-100/60">
                              <tr 
                                onClick={() => setIsSummaryExpanded(!isSummaryExpanded)}
                                className="bg-[#58b347]/10 hover:bg-[#58b347]/20 cursor-pointer transition-colors border-y border-[#58b347]/20"
                              >
                                <td colSpan={activeCols.filter(c => c.visible).length} className="px-6 py-4">
                                  <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                      <div className="bg-white p-2 rounded-lg shadow-sm text-[#58b347]"><IconLayers /></div>
                                      <span className="text-sm font-extrabold uppercase tracking-widest text-[#499b3a]">Suma sprzętu we wszystkich pojazdach</span>
                                    </div>
                                    <span className="text-[#58b347] bg-white p-1.5 rounded-lg shadow-sm border border-[#58b347]/20">{isSummaryExpanded ? <IconChevronUp /> : <IconChevronDown />}</span>
                                  </div>
                                </td>
                              </tr>
                              {isSummaryExpanded && ['Pojazd', 'Narzędzie', 'Część zamienna', 'Materiał eksploatacyjny', 'Inne'].map(cat => {
                                const items = mobileSummary[cat];
                                if (!items || items.length === 0) return null;
                                return (
                                  <React.Fragment key={`mob-sum-${cat}`}>
                                    <tr className="bg-slate-100/80 border-y border-slate-200 shadow-sm">
                                      <td colSpan={activeCols.filter(c => c.visible).length} className="px-6 py-2 text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
                                        <div className="flex items-center gap-2">
                                          {getCategoryIcon(cat)} {cat}
                                        </div>
                                      </td>
                                    </tr>
                                    {items.map(item => (
                                      <tr 
                                        key={`mob-sum-part-${item.part.id}`} 
                                        onMouseEnter={() => setHoveredPartId(item.part.id)}
                                        className="bg-white hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                      >
                                        {activeCols.filter(c => c.visible).map((c, index) => (
                                          <td key={c.key} className={`py-4 relative ${c.tdClass}`}>
                                            {index === 0 && <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${hoveredPartId === item.part.id ? 'bg-[#58b347]' : 'bg-transparent group-hover:bg-[#58b347]'}`} />}
                                            {renderCellContent({ part: item.part, quantity: item.total }, c.key)}
                                          </td>
                                        ))}
                                      </tr>
                                    ))}
                                  </React.Fragment>
                                );
                              })}
                            </tbody>

                            {/* Separator */}
                            <tbody>
                              <tr>
                                <td colSpan={activeCols.filter(c => c.visible).length} className="px-6 py-6 opacity-60 bg-transparent">
                                  <div className="flex items-center gap-4">
                                    <div className="h-px bg-slate-300 flex-1"></div>
                                    <h2 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-2">Ekwipunek poszczególnych techników</h2>
                                    <div className="h-px bg-slate-300 flex-1"></div>
                                  </div>
                                </td>
                              </tr>
                            </tbody>

                            {/* Akordeony dla poszczególnych Techników */}
                            {technicians.map(tech => {
                              // Najpierw pobieramy ekwipunek i od razu filtrujemy go według aktywnych reguł
                              let techItems = filteredTechInventory.filter(i => i.technician_id === tech.id && i.quantity > 0);
                              
                              if (activeFilter === 'LOW_STOCK') {
                                techItems = techItems.filter(i => {
                                  const p = parts.find(x => x.id === i.part_id);
                                  if (!p || p.is_muted || p.mobile_muted || i.is_muted || !['Część zamienna', 'Materiał eksploatacyjny'].includes(p.category)) return false;
                                  const total = mobileSummaryRaw[p.id]?.total || 0;
                                  return total <= lowStockThreshold;
                                });
                              } else if (activeFilter === 'MUTED') {
                                techItems = techItems.filter(i => {
                                  const p = parts.find(x => x.id === i.part_id);
                                  return p?.is_muted || p?.mobile_muted || i.is_muted;
                                });
                              } else if (activeFilter === 'EXPIRING') {
                                techItems = techItems.filter(i => {
                                  const p = parts.find(x => x.id === i.part_id);
                                  if (!p) return false;
                                  const insp = p.inspection_date ? getExpiryStatus(p.inspection_date) : null;
                                  const ins = p.insurance_date ? getExpiryStatus(p.insurance_date) : null;
                                  return (insp && (insp.isExpired || insp.isExpiring)) || (ins && (ins.isExpired || ins.isExpiring));
                                });
                              }

                              const isOpen = expandedTechIds.includes(tech.id);
                              
                              if (searchQueries.some(q => q.text.trim() !== '') && techItems.length === 0) return null;
                              if (techItems.length === 0) return null;

                              const groups: Record<string, TechInventory[]> = { 'Pojazd': [], 'Narzędzie': [], 'Część zamienna': [], 'Materiał eksploatacyjny': [], 'Inne': [] };
                              techItems.forEach(item => {
                                const c = parts.find(p => p.id === item.part_id)?.category || 'Inne';
                                if (groups[c]) groups[c].push(item); else groups['Inne'].push(item);
                              });

                              return (
                                <tbody key={`tech-${tech.id}`} className="divide-y divide-slate-100/60 bg-white">
                                  <tr 
                                    onClick={() => setExpandedTechIds(p => p.includes(tech.id) ? p.filter(id => id !== tech.id) : [...p, tech.id])}
                                    className={`hover:bg-slate-50 cursor-pointer transition-colors border-y border-slate-200 ${isOpen ? 'bg-slate-50' : ''}`}
                                  >
                                    <td colSpan={activeCols.filter(c => c.visible).length} className="px-6 py-4">
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                          <div 
                                            className="w-12 h-12 rounded-[14px] flex items-center justify-center text-white font-bold text-lg shadow-sm border-2 border-white ring-1 ring-black/5"
                                            style={{ backgroundColor: tech.color || '#58b347' }}
                                          >
                                            {getInitials(tech.name)}
                                          </div>
                                          <div className="text-sm font-extrabold text-slate-800">{tech.name}</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                          <span className="text-[10px] font-bold bg-white border border-slate-200 text-slate-500 px-3 py-1.5 rounded-full shadow-sm uppercase tracking-widest">Pozycji: {techItems.length}</span>
                                          <span className="text-slate-400 bg-white p-1.5 rounded-lg shadow-sm border border-slate-200">{isOpen ? <IconChevronUp /> : <IconChevronDown />}</span>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>

                                  {isOpen && ['Pojazd', 'Narzędzie', 'Część zamienna', 'Materiał eksploatacyjny', 'Inne'].map(cat => {
                                    const items = groups[cat];
                                    if (!items || items.length === 0) return null;
                                    return (
                                      <React.Fragment key={`tech-${tech.id}-cat-${cat}`}>
                                        <tr className="bg-slate-100/80 border-y border-slate-200 shadow-sm">
                                          <td colSpan={activeCols.filter(c => c.visible).length} className="px-6 py-2 text-[9px] font-extrabold text-slate-500 uppercase tracking-widest">
                                            <div className="flex items-center gap-2">
                                              {getCategoryIcon(cat)} {cat}
                                            </div>
                                          </td>
                                        </tr>
                                        {items.map(item => {
                                          const p = parts.find(x => x.id === item.part_id);
                                          if (!p) return null;
                                          return (
                                            <tr 
                                              key={`tech-${tech.id}-part-${item.id}`} 
                                              onMouseEnter={() => setHoveredPartId(p.id)}
                                              className="bg-white hover:bg-slate-50/80 transition-colors cursor-pointer group"
                                            >
                                              {activeCols.filter(c => c.visible).map((c, index) => (
                                                <td key={c.key} className={`py-4 relative ${c.tdClass}`}>
                                                  {index === 0 && <div className={`absolute left-0 top-0 bottom-0 w-1 transition-colors ${hoveredPartId === p.id ? 'bg-[#58b347]' : 'bg-transparent group-hover:bg-[#58b347]'}`} />}
                                                  {renderCellContent({ part: p, quantity: item.quantity, techId: tech.id, invItem: item }, c.key)}
                                                </td>
                                              ))}
                                            </tr>
                                          )
                                        })}
                                      </React.Fragment>
                                    );
                                  })}
                                </tbody>
                              );
                            })}
                          </>
                        )
                      )}
                    </table>
                  </div>
                </div>

                {/* Prawa kolumna - Czysty Sticky Panel */}
                <div className="w-[380px] h-[calc(100vh-120px)] bg-white border border-slate-200 rounded-2xl flex flex-col shrink-0 shadow-sm overflow-hidden sticky top-[90px]">
                  {activePartDetails ? (
                    <div className="flex flex-col h-full bg-white animate-fadeIn relative">
                      
                      {/* Przycisk Wyciszenia */}
                      {['Część zamienna', 'Materiał eksploatacyjny'].includes(activePartDetails.part.category) && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleToggleMuteCentral(activePartDetails.part); }}
                          className={`absolute top-4 right-14 p-2 rounded-xl transition-colors shadow-sm border ${activePartDetails.part.is_muted ? 'bg-slate-100 text-slate-500 border-slate-200' : 'bg-white text-slate-400 hover:text-slate-700 hover:bg-slate-50 border-slate-200'}`}
                          title={activePartDetails.part.is_muted ? "Odwycisz w systemie głównym" : "Wycisz globalnie powiadomienia o brakach"}
                        >
                          {activePartDetails.part.is_muted ? <IconBellOff /> : <IconBell />}
                        </button>
                      )}

                      <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0 flex flex-col justify-center items-center text-center pt-10">
                        <div className="w-12 h-12 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center text-[#58b347] mb-4">
                          {getCategoryIcon(activePartDetails.part.category)}
                        </div>
                        <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2">{activePartDetails.part.category}</div>
                        <h2 className="text-base font-bold text-slate-900 leading-snug">{activePartDetails.part.name}</h2>
                        <div className="flex items-center gap-2 mt-3">
                          <div className="text-[10px] font-bold font-mono text-slate-500 bg-white border border-slate-200 px-3 py-1 rounded-full uppercase tracking-wider">{activePartDetails.part.sku}</div>
                          {activePartDetails.part.is_muted && (
                            <div className="text-[10px] font-bold text-slate-500 bg-slate-200 px-3 py-1 rounded-full uppercase tracking-wider">GLOBALNIE WYCISZONY</div>
                          )}
                        </div>
                        
                        {(activePartDetails.part.serial_number || activePartDetails.part.vehicle_plate) && (
                          <div className="text-[9px] font-bold font-mono text-slate-500 uppercase flex items-center gap-1 mt-2">
                            <IconForVehicle type={activePartDetails.part.vehicle_type} className="w-3.5 h-3.5 opacity-70" /> 
                            {activePartDetails.part.category === 'Pojazd' ? activePartDetails.part.vehicle_plate : `S/N: ${activePartDetails.part.serial_number}`}
                          </div>
                        )}
                        {activePartDetails.part.notes && (
                          <div className="mt-3 text-xs font-medium italic text-slate-500 border-t border-slate-200 pt-3 w-full">&quot;{activePartDetails.part.notes}&quot;</div>
                        )}
                      </div>

                      {/* Wykres dystrybucji */}
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

                      {/* Rozbicie na auta (Tutaj znajduje się Wewnętrzny Scroll) */}
                      <div className={`flex-1 overflow-y-auto bg-slate-50/50 ${customScrollbarClasses}`}>
                        <div className="px-6 py-3 bg-slate-50 text-[9px] font-bold text-slate-400 uppercase border-b border-slate-100 tracking-widest sticky top-0 z-10">Rozdysponowane u techników:</div>
                        <ul className="divide-y divide-slate-100">
                          {activePartDetails.breakdown.map((b, i) => (
                            <li key={i} className="flex items-center justify-between px-6 py-4 hover:bg-white transition-colors">
                              <div className="flex items-center gap-3">
                                <div 
                                  className="w-10 h-10 rounded-[12px] flex items-center justify-center text-white font-bold text-xs shadow-sm border border-black/5 shrink-0"
                                  style={{ backgroundColor: b.tech.color || '#58b347' }}
                                >
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
              <div className="w-full bg-white/95 backdrop-blur-sm border border-white/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col h-max overflow-hidden flex-1">
                <div className="p-5 border-b border-slate-100/60 flex justify-between items-center bg-white shrink-0 sticky top-0 z-20">
                  <h2 className="font-bold text-sm text-slate-800 uppercase tracking-widest">Rejestr Operacji Magazynowych</h2>
                </div>
                <div className="flex-1">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-[68px] z-10">
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
                              <span className={`text-[9px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-widest ${log.operation_type === 'DOSTAWA' ? 'border-[#58b347]/50 text-[#499b3a] bg-[#58b347]/10' : log.operation_type === 'WYDANIE' ? 'border-orange-300 text-orange-600 bg-orange-50' : 'border-slate-300 text-slate-700 bg-slate-100'}`}>{log.operation_type}</span>
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
            
            <form onSubmit={editingPart ? handleUpdatePart : handleCreatePart} className={`p-6 space-y-5 bg-slate-50/30 max-h-[75vh] overflow-y-auto ${customScrollbarClasses}`}>
              
              <div className="grid grid-cols-12 gap-5">
                {/* Wiersz 1: Kategoria, SKU, Nazwa */}
                <div className="col-span-12 sm:col-span-4">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Kategoria asortymentu</label>
                  <select 
                    value={editingPart ? editingPart.category : newPart.category} 
                    onChange={e => editingPart ? setEditingPart({...editingPart, category: e.target.value} as any) : setNewPart({...newPart, category: e.target.value})} 
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
                  <input required value={editingPart ? editingPart.sku : newPart.sku} onChange={e => editingPart ? setEditingPart({...editingPart, sku: e.target.value.toUpperCase()} as any) : setNewPart({...newPart, sku: e.target.value.toUpperCase()})} className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                </div>
                
                <div className="col-span-12 sm:col-span-5">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nazwa / Model *</label>
                  <input required value={editingPart ? editingPart.name : newPart.name} onChange={e => editingPart ? setEditingPart({...editingPart, name: e.target.value} as any) : setNewPart({...newPart, name: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                </div>
                
                {/* Wiersz 2 (Opcjonalny): Pola dla NARZĘDZI I POJAZDÓW */}
                {((editingPart ? editingPart.category : newPart.category) === 'Pojazd' || (editingPart ? editingPart.category : newPart.category) === 'Narzędzie') && (
                  <div className="col-span-12 grid grid-cols-12 gap-5 p-4 bg-slate-50 border border-slate-100 rounded-xl shadow-inner animate-fadeIn">
                    <div className={`col-span-12 ${(editingPart ? editingPart.category : newPart.category) === 'Pojazd' ? 'sm:col-span-3' : 'sm:col-span-4'}`}>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{(editingPart ? editingPart.category : newPart.category) === 'Pojazd' ? 'Nr Rejestracyjny' : 'Nr seryjny (S/N)'}</label>
                      <input 
                        value={(editingPart ? editingPart.category : newPart.category) === 'Pojazd' ? (editingPart ? editingPart.vehicle_plate || '' : newPart.vehicle_plate) : (editingPart ? editingPart.serial_number || '' : newPart.serial_number)} 
                        onChange={e => {
                          const val = e.target.value.toUpperCase();
                          if ((editingPart ? editingPart.category : newPart.category) === 'Pojazd') {
                            editingPart ? setEditingPart({...editingPart, vehicle_plate: val} as any) : setNewPart({...newPart, vehicle_plate: val});
                          } else {
                            editingPart ? setEditingPart({...editingPart, serial_number: val} as any) : setNewPart({...newPart, serial_number: val});
                          }
                        }} 
                        className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-mono font-bold uppercase focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" 
                        placeholder="Opcjonalnie..." 
                      />
                    </div>

                    {(editingPart ? editingPart.category : newPart.category) === 'Pojazd' && (
                      <div className="col-span-12 sm:col-span-3">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Typ nadwozia</label>
                        <select value={editingPart ? (editingPart.vehicle_type || 'Van / Bus') : newPart.vehicle_type} onChange={e => editingPart ? setEditingPart({...editingPart, vehicle_type: e.target.value} as any) : setNewPart({...newPart, vehicle_type: e.target.value})} className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer">
                          <option>Van / Bus</option>
                          <option>Osobowy</option>
                          <option>Kombi</option>
                          <option>Podnośnik koszowy</option>
                          <option>Inne</option>
                        </select>
                      </div>
                    )}

                    <div className={`col-span-12 ${(editingPart ? editingPart.category : newPart.category) === 'Pojazd' ? 'sm:col-span-2' : 'sm:col-span-4'}`}>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Status</label>
                      <select value={editingPart ? (editingPart.service_status || 'Sprawny') : newPart.service_status} onChange={e => editingPart ? setEditingPart({...editingPart, service_status: e.target.value} as any) : setNewPart({...newPart, service_status: e.target.value})} className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-xs font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer">
                        <option>Sprawny</option>
                        <option>W serwisie</option>
                        <option>Uszkodzony</option>
                      </select>
                    </div>

                    <div className={`col-span-12 ${(editingPart ? editingPart.category : newPart.category) === 'Pojazd' ? 'sm:col-span-2' : 'sm:col-span-4'}`}>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">{(editingPart ? editingPart.category : newPart.category) === 'Pojazd' ? 'Data Przegladu' : 'Kalibracja'}</label>
                      <input type="date" value={editingPart ? (editingPart.inspection_date || '') : newPart.inspection_date} onChange={e => editingPart ? setEditingPart({...editingPart, inspection_date: e.target.value} as any) : setNewPart({...newPart, inspection_date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-[10px] font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm text-slate-700" />
                    </div>

                    {(editingPart ? editingPart.category : newPart.category) === 'Pojazd' && (
                      <div className="col-span-12 sm:col-span-2">
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Polisa OC/AC</label>
                        <input type="date" value={editingPart ? (editingPart.insurance_date || '') : newPart.insurance_date} onChange={e => editingPart ? setEditingPart({...editingPart, insurance_date: e.target.value} as any) : setNewPart({...newPart, insurance_date: e.target.value})} className="w-full px-3 py-2 border border-slate-200 bg-white rounded-lg text-[10px] font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm text-slate-700" />
                      </div>
                    )}
                  </div>
                )}

                {/* Wiersz 3: J.M, Ilość, Uwagi */}
                <div className="col-span-12 sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">J.M.</label>
                  <select value={(editingPart ? editingPart.category : newPart.category) === 'Pojazd' ? 'szt.' : (editingPart ? editingPart.unit : newPart.unit)} disabled={(editingPart ? editingPart.category : newPart.category) === 'Pojazd'} onChange={e => editingPart ? setEditingPart({...editingPart, unit: e.target.value} as any) : setNewPart({...newPart, unit: e.target.value})} className="w-full px-3 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer disabled:opacity-50">
                    <option>szt.</option>
                    <option>mb</option>
                    <option>kpl.</option>
                  </select>
                </div>

                <div className="col-span-12 sm:col-span-3">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Magazyn (Centrala)</label>
                  <div className="relative">
                    {(() => {
                      const currentCat = editingPart ? editingPart.category : newPart.category;
                      const currentVal = editingPart ? (currentCat === 'Pojazd' ? editingPart.vehicle_plate : editingPart.serial_number) : (currentCat === 'Pojazd' ? newPart.vehicle_plate : newPart.serial_number);
                      const isUnique = Boolean((currentCat === 'Pojazd' || currentCat === 'Narzędzie') && currentVal && currentVal.trim().length > 0);
                      
                      return (
                        <>
                          <input 
                            type="number" 
                            min={isUnique ? "1" : "0"} 
                            max={isUnique ? "1" : undefined}
                            disabled={isUnique}
                            required 
                            value={isUnique ? 1 : (editingPart ? editingPart.main_stock : newPart.main_stock)} 
                            onChange={e => {
                              if (isUnique) return;
                              editingPart ? setEditingPart({...editingPart, main_stock: parseInt(e.target.value) || 0} as any) : setNewPart({...newPart, main_stock: parseInt(e.target.value) || 0});
                            }} 
                            className={`w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-sm font-bold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm text-center ${isUnique ? 'text-slate-400 opacity-60 cursor-not-allowed bg-slate-50' : 'text-slate-800'}`} 
                          />
                          {isUnique && <div className="absolute top-1/2 left-2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-400 animate-pulse" title="Blokada na 1 szt. ze względu na wpisany numer"></div>}
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="col-span-12 sm:col-span-7">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Uwagi / Notatki</label>
                  <textarea rows={1} value={editingPart ? (editingPart.notes || '') : newPart.notes} onChange={e => editingPart ? setEditingPart({...editingPart, notes: e.target.value} as any) : setNewPart({...newPart, notes: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 bg-white rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm resize-none" placeholder="Opcjonalne informacje o sprzęcie..." />
                </div>

              </div>
              
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

      {/* MODAL TWORZENIE ZAKŁADKI CUSTOMOWEJ (WIELOKROTNE TAGI) */}
      {isCustomTabModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setIsCustomTabModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">Stwórz nową zakładkę (Filtr)</h3>
              <button onClick={() => setIsCustomTabModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleSaveCustomTab} className="p-6 space-y-5 bg-slate-50/30">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nazwa zakładki na pasku *</label>
                <input required type="text" value={newCustomTab.name} onChange={e => setNewCustomTab({...newCustomTab, name: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" placeholder="Np. Modele Alpitronic" />
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