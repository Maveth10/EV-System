'use client';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '../app/supabase';

// --- TYPY DANYCH ---
type Client = { id: string; name: string; contact_person: string | null; email: string | null; phone: string | null; sla_hours: number; notes: string | null; color: string | null; };
type Station = { id: string; name: string; city: string | null; client: string | null; technician: string | null; status: string; };
type SearchQuery = { id: string; text: string; logic: 'AND' | 'OR' | 'NOT' };
type CustomTabEq = { id: string; name: string; filterQueries: SearchQuery[] };

// --- KLASY DLA SCROLLBARA ---
const customScrollbarClasses = "[&::-webkit-scrollbar]:w-2.5 [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-track]:bg-slate-100/50 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[#58b347]/40 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-[#58b347]/80";

// --- IKONY ---
const IconBuilding = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>;
const IconPlus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconMail = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const IconPhone = () => <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;
const IconSearch = () => <svg className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;
const IconTrash = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconEdit = () => <svg className="w-3.5 h-3.5 inline-block mr-1 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;
const IconClock = () => <svg className="w-3.5 h-3.5 inline-block mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconEvStation = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 6v16"/><path d="M7 6v16"/><path d="M2 10h20"/><path d="M2 14h20"/></svg>;
const IconChevronDown = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>;
const IconChevronUp = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>;
const IconMapPin = () => <svg className="w-3.5 h-3.5 inline mr-1 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconDownload = () => <svg className="w-4 h-4 inline-block mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>;
const IconAlertTriangle = () => <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconReport = () => <svg className="w-3.5 h-3.5 inline-block mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" x2="8" y1="13" y2="13"/><line x1="16" x2="8" y1="17" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>;
const IconCheckCircle = () => <svg className="w-5 h-5 inline-block" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconCopy = () => <svg className="w-3 h-3 inline-block ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>;
const IconCheck = () => <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconSync = () => <svg className="w-4 h-4 inline-block mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>;
const IconFilter = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;

// --- FUNKCJE POMOCNICZE (AGRESYWNY ODKURZACZ) ---
const normalizeClientName = (name: string | null) => {
  if (!name) return '';
  // Usuwa wszystkie niewidzialne znaki nowej linii, tabulatory i redukuje potrójne/podwójne spacje do 1
  return name.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
};

const getInitials = (name: string) => {
  if (!name) return '?';
  const cleanName = normalizeClientName(name);
  const parts = cleanName.split(' ');
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

// --- KOMPONENT WYSZUKIWARKI (Pancerny przed utratą focusa) ---
const SearchQueryBuilder = ({ queries, setQueries }: { queries: SearchQuery[], setQueries: (q: SearchQuery[]) => void }) => {
  const addQuery = () => setQueries([...queries, { id: Math.random().toString(), text: '', logic: 'AND' }]);
  const updateQuery = (id: string, updates: Partial<SearchQuery>) => {
    setQueries(queries.map(q => q.id === id ? { ...q, ...updates } : q));
  };
  const removeQuery = (id: string) => {
    setQueries(queries.filter(q => q.id !== id));
  };

  return (
    <div className="flex flex-col gap-2 w-full max-w-2xl animate-fadeIn">
      {queries.map((q, idx) => (
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
              placeholder="Szukaj klienta, emaila, osoby, notatki..."
              className="w-full pl-2 pr-3 py-2 text-xs font-semibold focus:outline-none bg-transparent h-full border-none"
            />
          </div>

          {queries.length > 1 && (
            <button type="button" onClick={() => removeQuery(q.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors shrink-0 flex items-center justify-center h-[38px]" title="Usuń warunek">
              <IconTrash />
            </button>
          )}
        </div>
      ))}
      
      <button 
        type="button"
        onClick={addQuery}
        className="text-[10px] font-bold text-slate-500 hover:text-[#58b347] bg-white border border-slate-200 hover:border-[#58b347]/50 rounded-xl py-2 px-3 w-max flex items-center gap-1.5 transition-colors shadow-sm mt-1"
      >
        <IconPlus /> Dodaj warunek
      </button>
    </div>
  );
};

interface ClientsDatabaseProps {
  isSidebarHovered?: boolean;
}

export default function ClientsDatabase({ isSidebarHovered = false }: ClientsDatabaseProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Modale i Formularze
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [formData, setFormData] = useState({ name: '', contact_person: '', email: '', phone: '', sla_hours: 48, notes: '', color: '#58b347' });

  // Stany wyszukiwania, zakładek i UI
  const [searchQueries, setSearchQueries] = useState<SearchQuery[]>([{ id: 'init', text: '', logic: 'AND' }]);
  const [activeFilter, setActiveFilter] = useState<string>('default_all');
  const [customTabs, setCustomTabs] = useState<CustomTabEq[]>([]);
  
  // Zarządzanie Kolejnością Zakładek
  const defaultTabIds = ['default_all', 'default_stations', 'default_issues', 'default_sla'];
  const [tabOrder, setTabOrder] = useState<string[]>([]);
  
  const [isCustomTabModalOpen, setIsCustomTabModalOpen] = useState(false);
  const [newCustomTab, setNewCustomTab] = useState<{ name: string, filterQueries: SearchQuery[] }>({ name: '', filterQueries: [{ id: 'c_init', text: '', logic: 'AND' }] });

  const [expandedClientIds, setExpandedClientIds] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Drag & Drop Zakładek (Pancerne)
  const draggedTabRef = useRef<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

  const tabsScrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll zakładek na kółko myszy
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

  // Ładowanie zapisanych customowych zakładek oraz kolejności (Order)
  useEffect(() => {
    let parsedCustom: CustomTabEq[] = [];
    const savedTabs = localStorage.getItem('ekoen_clients_custom_tabs');
    if (savedTabs) {
      try { parsedCustom = JSON.parse(savedTabs); setCustomTabs(parsedCustom); } catch (e) {}
    }

    const savedOrder = localStorage.getItem('ekoen_clients_tab_order');
    const expectedIds = [...defaultTabIds, ...parsedCustom.map(t => t.id)];
    
    if (savedOrder) {
      try { 
        let order = JSON.parse(savedOrder);
        // Filtracja (usunięcie sierot i upewnienie się, że wszystkie obecne są na liście)
        const finalOrder = order.filter((id: string) => expectedIds.includes(id));
        expectedIds.forEach(id => { if (!finalOrder.includes(id)) finalOrder.push(id); });
        setTabOrder(finalOrder);
      } catch(e) {
        setTabOrder(expectedIds);
      }
    } else {
      setTabOrder(expectedIds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cichy Fetch Data
  const fetchData = useCallback(async (background = false) => {
    if (!background) setIsLoading(true);
    const [cRes, sRes] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('stations').select('id, name, city, client, technician, status')
    ]);

    if (cRes.data) setClients(cRes.data as Client[]);
    if (sRes.data) setStations(sRes.data);
    if (!background) setIsLoading(false);
  }, []);

  // AUTO-SYNC: Agresywna Deduplikacja + Import z Sieci
  const handleDeduplicateAndSync = async () => {
    setIsSyncing(true);
    setToastMessage('Rozpoczęto analizę i inteligentny import ze Stacji...');

    try {
      const [sRes, cRes] = await Promise.all([
        supabase.from('stations').select('client'),
        supabase.from('clients').select('name')
      ]);

      if (!sRes.data || !cRes.data) return;

      const existingClientNames = cRes.data.map(c => normalizeClientName(c.name).toLowerCase());
      const stationClientNames = sRes.data.map(s => s.client).filter(c => c && c.trim() !== '').map(c => normalizeClientName(c));

      // Słownik nowości (z zachowaniem oryginalnej wielkości liter pierwszego napotkanego)
      const uniqueStationClientsMap = new Map<string, string>();
      stationClientNames.forEach(name => {
        const lower = name.toLowerCase();
        if (!uniqueStationClientsMap.has(lower)) {
          uniqueStationClientsMap.set(lower, name);
        }
      });

      const newClientsToInsert = Array.from(uniqueStationClientsMap.entries())
        .filter(([lower, _]) => !existingClientNames.includes(lower))
        .map(([_, original]) => original);

      if (newClientsToInsert.length > 0) {
        const payloads = newClientsToInsert.map(clientName => ({
          name: clientName,
          sla_hours: 48,
          color: '#58b347'
        }));
        await supabase.from('clients').insert(payloads);
        setToastMessage(`Sukces! Zsynchronizowano ${newClientsToInsert.length} nowych klientów z modułu Sieci.`);
      } else {
        setToastMessage('Baza aktualna. Wszyscy klienci z Sieci posiadają już swoje profile w CRM.');
      }

      await fetchData(true);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      alert(`Błąd podczas dedublikacji/synchronizacji: ${err.message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Inicjowanie danych oraz nasłuchiwanie w czasie rzeczywistym
  useEffect(() => { 
    fetchData(); 

    const channel = supabase.channel('stations-clients-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stations' }, () => {
        fetchData(true);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchData]);

  // Obsługa Klawisza ESC dla Modali
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModalOpen(false);
        setEditingClient(null);
        setIsCustomTabModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopyCode = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setToastMessage(`Skopiowano: ${text}`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Czyszczenie Prawym Przyciskiem Myszy (Tło Obszaru Roboczego)
  const handleRightClickClearFilters = (e: React.MouseEvent) => {
    e.preventDefault();
    setSearchQueries([{ id: Math.random().toString(), text: '', logic: 'AND' }]);
    setActiveFilter('default_all');
  };

  const openAddModal = () => {
    setEditingClient(null);
    setFormData({ name: '', contact_person: '', email: '', phone: '', sla_hours: 48, notes: '', color: '#58b347' });
    setIsModalOpen(true);
  };

  const openEditModal = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
    setFormData({
      name: client.name,
      contact_person: client.contact_person || '',
      email: client.email || '',
      phone: client.phone || '',
      sla_hours: client.sla_hours,
      notes: client.notes || '',
      color: client.color || '#58b347'
    });
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...formData, name: normalizeClientName(formData.name) };
    
    if (editingClient) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id);
      if (error) {
        if (error.message.includes('column "color"')) alert('Dodaj najpierw kolumnę "color" (typu text) do bazy danych Supabase w tabeli "clients".');
        else alert(`Błąd edycji: ${error.message}`);
      } else { setIsModalOpen(false); fetchData(true); }
    } else {
      const { error } = await supabase.from('clients').insert([payload]);
      if (error) {
        if (error.message.includes('column "color"')) alert('Dodaj najpierw kolumnę "color" (typu text) do bazy danych Supabase w tabeli "clients".');
        else alert(`Błąd dodawania: ${error.message}`);
      } else { setIsModalOpen(false); fetchData(true); }
    }
  };

  const handleDeleteClient = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Czy na pewno chcesz bezpowrotnie usunąć tego klienta z bazy? Ostrzeżenie: To może wpłynąć na powiązane z nim stacje!")) return;
    const { error } = await supabase.from('clients').delete().eq('id', id);
    if (error) alert(`Błąd usuwania: ${error.message}`);
    else fetchData(true);
  };

  // --- LOGIKA ZAKŁADEK CUSTOMOWYCH ---
  const handleSaveCustomTab = (e: React.FormEvent) => {
    e.preventDefault();
    const newTab: CustomTabEq = {
      id: Math.random().toString(36).substring(7),
      name: newCustomTab.name,
      filterQueries: newCustomTab.filterQueries.filter(q => q.text.trim() !== '')
    };
    const updatedTabs = [...customTabs, newTab];
    setCustomTabs(updatedTabs);
    
    // Dodaj do Order
    const newOrder = [...tabOrder, newTab.id];
    setTabOrder(newOrder);

    localStorage.setItem('ekoen_clients_custom_tabs', JSON.stringify(updatedTabs));
    localStorage.setItem('ekoen_clients_tab_order', JSON.stringify(newOrder));
    
    setIsCustomTabModalOpen(false);
    setNewCustomTab({ name: '', filterQueries: [{ id: Math.random().toString(), text: '', logic: 'AND' }] });
  };

  const handleDeleteCustomTab = (id: string) => {
    const updatedTabs = customTabs.filter(t => t.id !== id);
    setCustomTabs(updatedTabs);
    
    const newOrder = tabOrder.filter(tId => tId !== id);
    setTabOrder(newOrder);

    localStorage.setItem('ekoen_clients_custom_tabs', JSON.stringify(updatedTabs));
    localStorage.setItem('ekoen_clients_tab_order', JSON.stringify(newOrder));
    
    if (activeFilter === id) setActiveFilter('default_all');
  };

  // --- DRAG AND DROP ZAKŁADEK (WSZYSTKICH) ---
  const handleTabDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
    draggedTabRef.current = id;
    setTimeout(() => setDraggedTabId(id), 0); // Chroni przed usunięciem w trakcie trzymania
  };

  const handleTabDragOver = (e: React.DragEvent) => {
    e.preventDefault(); 
    e.dataTransfer.dropEffect = 'move';
    
    // Auto-Scroll podczas Drag & Drop
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
      localStorage.setItem('ekoen_clients_tab_order', JSON.stringify(newOrder));
    }
    setDraggedTabId(null);
    draggedTabRef.current = null;
  };

  // Eksport do CSV
  const exportToCSV = () => {
    const headers = ['Nazwa Klienta', 'Osoba Kontaktowa', 'Email', 'Telefon', 'SLA (Godziny)', 'Ilość Stacji', 'Sprawność Sieci', 'Notatki'];
    const rows = filteredClients.map(c => {
      const clientStations = stations.filter(s => s.client === c.name);
      const activeCount = clientStations.filter(s => s.status !== 'Awaria').length;
      const totalCount = clientStations.length;
      const healthScore = totalCount === 0 ? 100 : Math.round((activeCount / totalCount) * 100);
      
      return [
        `"${c.name}"`,
        `"${c.contact_person || ''}"`,
        `"${c.email || ''}"`,
        `"${c.phone || ''}"`,
        c.sla_hours,
        totalCount,
        `${healthScore}%`,
        `"${(c.notes || '').replace(/"/g, '""')}"`
      ].join(';');
    });

    const csvContent = [headers.join(';'), ...rows].join('\n');
    const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Klienci_Ekoen_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Obliczenia KPI Globalne
  const avgSla = useMemo(() => clients.length > 0 ? Math.round(clients.reduce((acc, c) => acc + c.sla_hours, 0) / clients.length) : 0, [clients]);
  const totalStationsLinked = useMemo(() => stations.filter(s => s.client).length, [stations]);
  const clientsWithIssues = useMemo(() => {
    let count = 0;
    clients.forEach(c => {
      const clientStations = stations.filter(s => s.client === c.name);
      if (clientStations.some(s => s.status === 'Awaria')) count++;
    });
    return count;
  }, [clients, stations]);

  // Logika Filtrowania Smart Search
  const evaluateCondition = useCallback((c: Client, qText: string) => {
    const lowerQ = qText.toLowerCase().trim();
    if (!lowerQ) return true;
    
    const n = c.name || '';
    const cp = c.contact_person || '';
    const em = c.email || '';
    const ph = c.phone || '';
    const no = c.notes || '';
    
    return n.toLowerCase().includes(lowerQ) ||
           cp.toLowerCase().includes(lowerQ) ||
           em.toLowerCase().includes(lowerQ) ||
           ph.toLowerCase().includes(lowerQ) ||
           no.toLowerCase().includes(lowerQ);
  }, []);

  const filteredClients = useMemo(() => {
    let result = clients;

    // Filtry Kafelkowe
    if (activeFilter === 'default_issues') {
      result = result.filter(c => {
        const clientStations = stations.filter(s => s.client === c.name);
        return clientStations.some(s => s.status === 'Awaria');
      });
    } else if (activeFilter !== 'default_all' && activeFilter !== 'default_stations' && activeFilter !== 'default_sla') {
      // It's a custom tab
      const tabInfo = customTabs.find(c => c.id === activeFilter);
      if (tabInfo) {
        result = result.filter(c => {
          const validQ = tabInfo.filterQueries.filter(q => q.text.trim() !== '');
          if (validQ.length > 0) {
            let match = evaluateCondition(c, validQ[0].text);
            if (validQ[0].logic === 'NOT') match = !match;
            
            for (let i = 1; i < validQ.length; i++) {
              const conditionMet = evaluateCondition(c, validQ[i].text);
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

    // Wyszukiwarka tekstowa
    const validSearchQueries = searchQueries.filter(q => q.text.trim() !== '');
    if (validSearchQueries.length > 0) {
      result = result.filter(c => {
        let match = evaluateCondition(c, validSearchQueries[0].text);
        if (validSearchQueries[0].logic === 'NOT') match = !match;
        
        for (let i = 1; i < validSearchQueries.length; i++) {
          const conditionMet = evaluateCondition(c, validSearchQueries[i].text);
          if (validSearchQueries[i].logic === 'AND') match = match && conditionMet;
          else if (validSearchQueries[i].logic === 'OR') match = match || conditionMet;
          else if (validSearchQueries[i].logic === 'NOT') match = match && !conditionMet;
        }
        return match;
      });
    }

    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, stations, activeFilter, customTabs, searchQueries, evaluateCondition]);

  const getCustomTabCount = useCallback((tabInfo: CustomTabEq) => {
    let res = clients.filter(c => {
      const validQ = tabInfo.filterQueries.filter(q => q.text.trim() !== '');
      if (validQ.length > 0) {
        let match = evaluateCondition(c, validQ[0].text);
        if (validQ[0].logic === 'NOT') match = !match;
        for (let i = 1; i < validQ.length; i++) {
          const conditionMet = evaluateCondition(c, validQ[i].text);
          if (validQ[i].logic === 'AND') match = match && conditionMet;
          else if (validQ[i].logic === 'OR') match = match || conditionMet;
          else if (validQ[i].logic === 'NOT') match = match && !conditionMet;
        }
        if (!match) return false;
      }
      return true;
    });
    return res.length;
  }, [clients, evaluateCondition]);

  const toggleAccordion = (id: string) => {
    setExpandedClientIds(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  // Komponent Koła Postępu (Health Score)
  const HealthRing = ({ score }: { score: number }) => {
    const color = score >= 90 ? 'text-[#58b347]' : score >= 70 ? 'text-orange-500' : 'text-red-500';
    return (
      <div className="relative w-[52px] h-[52px] flex items-center justify-center rounded-full bg-white shadow-sm border border-slate-100 shrink-0 group-hover/acc:scale-105 transition-transform duration-300">
        <svg className="w-full h-full transform -rotate-90">
          <circle cx="26" cy="26" r="22" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
          <circle cx="26" cy="26" r="22" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="138" strokeDashoffset={138 - (138 * score) / 100} className={`${color} drop-shadow-sm transition-all duration-1000 ease-out`} />
        </svg>
        <span className={`absolute text-[11px] font-black ${color}`}>{score}%</span>
      </div>
    );
  };

  // Funkcja renderująca konkretną zakładkę na podstawie jej ID
  const renderTab = (tabId: string) => {
    const isDragged = draggedTabId === tabId;
    const commonClasses = `min-w-[280px] h-[104px] shrink-0 bg-white/80 backdrop-blur-md border rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between cursor-grab active:cursor-grabbing transition-colors relative group ${isDragged ? 'opacity-40 scale-95' : ''}`;
    
    if (tabId === 'default_all') {
      const isActive = activeFilter === 'default_all';
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => setActiveFilter('default_all')} className={`${commonClasses} ${isActive ? 'border-[#58b347] ring-2 ring-[#58b347]/20 bg-[#58b347]/5' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Partnerzy B2B</p>
            <p className="text-3xl font-bold text-slate-700">{clients.length}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-none ${isActive ? 'bg-[#58b347] text-white' : 'bg-[#58b347]/10 text-[#58b347]'}`}><IconBuilding /></div>
        </div>
      );
    }
    
    if (tabId === 'default_stations') {
      const isActive = activeFilter === 'default_stations';
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => setActiveFilter('default_stations')} className={`${commonClasses} ${isActive ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Przypisane Stacje</p>
            <p className="text-3xl font-bold text-slate-700">{totalStationsLinked}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-none ${isActive ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-500'}`}><IconEvStation /></div>
        </div>
      );
    }

    if (tabId === 'default_issues') {
      const isActive = activeFilter === 'default_issues';
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => setActiveFilter(prev => prev === 'default_issues' ? 'default_all' : 'default_issues')} className={`${commonClasses} ${isActive ? 'border-red-500 ring-2 ring-red-500/20 bg-red-50/50' : clientsWithIssues > 0 ? 'border-red-200 hover:bg-red-50/30' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Klienci z Awariami</p>
            <p className={`text-3xl font-bold ${clientsWithIssues > 0 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>{clientsWithIssues}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-none ${clientsWithIssues > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}><IconAlertTriangle /></div>
        </div>
      );
    }

    if (tabId === 'default_sla') {
      const isActive = activeFilter === 'default_sla';
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => setActiveFilter('default_sla')} className={`${commonClasses} ${isActive ? 'border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/50' : 'border-white/60 hover:bg-white'}`}>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Średnie SLA</p>
            <p className="text-3xl font-bold text-slate-700">{avgSla}h</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-none ${isActive ? 'bg-orange-500 text-white' : 'bg-orange-50 text-orange-500'}`}><IconClock /></div>
        </div>
      );
    }

    // Custom Tabs
    const tabInfo = customTabs.find(t => t.id === tabId);
    if (tabInfo) {
      const isActive = activeFilter === tabInfo.id;
      return (
        <div key={tabId} draggable onDragStart={(e) => handleTabDragStart(e, tabId)} onDragOver={handleTabDragOver} onDrop={(e) => handleTabDrop(e, tabId)} onClick={() => setActiveFilter(prev => prev === tabInfo.id ? 'default_all' : tabInfo.id)} className={`${commonClasses} ${isActive ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`}>
          <button onClick={(e) => { e.stopPropagation(); handleDeleteCustomTab(tabId); }} className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10 pointer-events-auto" title="Usuń zakładkę"><IconTrash /></button>
          <div className="pointer-events-none">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{tabInfo.name}</p>
            <p className="text-3xl font-bold text-slate-700">{getCustomTabCount(tabInfo)}</p>
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center pointer-events-none ${isActive ? 'bg-blue-100 text-blue-500' : 'bg-slate-50 text-slate-400'}`}><IconFilter /></div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className={`absolute inset-0 bg-slate-100/60 backdrop-blur-2xl border-l border-white/20 z-40 flex flex-col font-sans transition-[left] duration-300 ease-out shadow-[-10px_0_30px_rgba(0,0,0,0.05)] overflow-hidden ${isSidebarHovered ? 'left-[256px]' : 'left-[72px]'}`}>
      
      {/* Pasek Nawigacji - Sticky */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/40 px-6 py-4 flex items-center justify-between shrink-0 sticky top-0 z-50">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            Baza Klientów (CRM)
            {isSyncing && <span className="text-[10px] bg-[#58b347]/10 text-[#58b347] border border-[#58b347]/20 px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider font-bold shadow-sm">Pobieranie nowości...</span>}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Zarządzaj partnerami biznesowymi i warunkami SLA.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <button 
            onClick={() => handleDeduplicateAndSync()}
            disabled={isSyncing}
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 shadow-sm transition-all shrink-0 h-[38px] disabled:opacity-50"
            title="Kliknij, aby wyszukać nowych klientów w bazie Stacji (Sieci)."
          >
            <IconSync /> Skanuj ze Stacji
          </button>
          <button onClick={exportToCSV} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 shadow-sm transition-all shrink-0 h-[38px]">
            <IconDownload /> Eksportuj CSV
          </button>
          <button onClick={openAddModal} className="bg-[#58b347] text-white border border-[#499b3a] px-4 py-2.5 rounded-xl text-xs font-bold hover:bg-[#499b3a] flex items-center gap-1.5 shadow-sm transition-all shrink-0 h-[38px]">
            <IconPlus /> Dodaj Klienta
          </button>
        </div>
      </div>

      <div className={`flex-1 flex flex-col relative overflow-y-auto ${customScrollbarClasses}`} onContextMenu={handleRightClickClearFilters}>
        {isLoading ? (
          <div className="flex w-full h-[50vh] items-center justify-center text-sm font-bold text-slate-400">Ładowanie bazy danych...</div>
        ) : (
          <div className="w-full max-w-[1400px] mx-auto p-6 flex flex-col gap-6">
            
            {/* KPI Dashboard - Draggable Container */}
            <div ref={tabsScrollRef} className={`flex overflow-x-auto gap-6 pb-2 items-stretch shrink-0 select-none ${customScrollbarClasses}`}>
              
              {tabOrder.map(tabId => renderTab(tabId))}

              {/* Dodaj Nowy Filtr */}
              <div 
                onClick={() => setIsCustomTabModalOpen(true)}
                className="min-w-[150px] h-[104px] shrink-0 bg-white/50 backdrop-blur-md border-2 border-dashed border-slate-300 hover:border-[#58b347] rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:text-[#58b347] cursor-pointer transition-all group"
              >
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm mb-1.5 group-hover:scale-110 transition-transform">
                  <IconPlus />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-center">Nowy Filtr</span>
              </div>
            </div>

            {/* Smart Search */}
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row gap-5 shrink-0 items-start z-10">
              <div className="flex-1 w-full relative z-20">
                <SearchQueryBuilder queries={searchQueries} setQueries={setSearchQueries} />
              </div>
              <div className="flex gap-3 items-center shrink-0 w-full md:w-auto mt-auto flex-wrap z-10">
                {(searchQueries.some(q => q.text.trim() !== '') || activeFilter !== 'default_all') && (
                  <button 
                    onClick={() => { setSearchQueries([{ id: Math.random().toString(), text: '', logic: 'AND' }]); setActiveFilter('default_all'); }} 
                    className="w-full bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-slate-500 hover:text-red-500 text-[10px] font-bold uppercase tracking-widest px-3 py-2.5 rounded-xl transition-colors shadow-sm h-[38px]"
                  >
                    Wyczyść Filtry
                  </button>
                )}
              </div>
            </div>

            {/* Akordeony Klientów (Zintegrowane Super-Karty) */}
            <div className="flex flex-col gap-4 min-h-max pb-12">
              {filteredClients.length === 0 ? (
                <div className="text-center p-12 text-slate-400 font-bold bg-white/50 rounded-2xl border border-dashed border-slate-300">
                  Brak klientów spełniających wybrane kryteria wyszukiwania.
                </div>
              ) : (
                filteredClients.map(client => {
                  const clientStations = stations.filter(s => s.client === client.name);
                  const activeCount = clientStations.filter(s => s.status !== 'Awaria').length;
                  const totalCount = clientStations.length;
                  const healthScore = totalCount === 0 ? 100 : Math.round((activeCount / totalCount) * 100);
                  
                  const isOpen = expandedClientIds.includes(client.id);

                  return (
                    <div key={client.id} className="bg-white border border-slate-200 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden group/acc transition-colors">
                      <button 
                        onClick={() => toggleAccordion(client.id)}
                        style={{ backgroundColor: `hsla(${Math.max(0, Math.min(100, healthScore * 1.04))}, 70%, 45%, ${isOpen ? 0.08 : 0.03})` }}
                        className={`w-full px-6 py-5 hover:brightness-[0.96] flex justify-between items-center transition-all shrink-0 ${isOpen ? 'border-b border-black/5' : ''}`}
                      >
                        <div className="flex flex-col md:flex-row items-center gap-5 w-full flex-1 pr-6 overflow-hidden">
                          
                          {/* LEWA STRONA (max 50%) - Nazwa Firmy i Awatar */}
                          <div className="flex items-center gap-4 w-full md:w-1/2 shrink-0 md:pr-4 md:border-r border-slate-200/50">
                            <div 
                              className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white font-extrabold text-xl shadow-sm border-2 border-white ring-1 ring-black/5 shrink-0`}
                              style={{ backgroundColor: client.color || '#58b347' }}
                            >
                              {getInitials(client.name)}
                            </div>
                            <h3 className="font-extrabold text-slate-800 text-base lg:text-lg leading-tight group-hover/acc:text-[#58b347] transition-colors w-full whitespace-normal break-words text-left">
                              {client.name}
                            </h3>
                          </div>

                          {/* ŚRODKOWA STRONA - Dane kontaktowe i SLA */}
                          <div className="flex flex-col items-start justify-center gap-2 w-full md:w-1/2 mt-3 md:mt-0">
                            
                            <div className="flex items-center gap-3">
                              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-widest flex items-center gap-1.5 shadow-sm ${client.contact_person ? 'bg-white text-slate-600 border-slate-200' : 'bg-white/50 text-slate-400 border-slate-200/50 italic'}`}>
                                <div className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[8px] not-italic">👤</div>
                                {client.contact_person ? client.contact_person : 'Brak os. decyzyjnej'}
                              </span>
                              <span className="text-[10px] font-black bg-white border border-slate-200 text-slate-500 px-2.5 py-1 rounded-md uppercase tracking-widest flex items-center gap-1.5 shadow-sm">
                                <IconClock /> SLA: <span className={client.sla_hours <= 24 ? "text-red-500" : "text-[#58b347]"}>{client.sla_hours}h</span>
                              </span>
                            </div>

                            <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-500 group/links">
                              {client.phone ? (
                                <span onClick={(e) => handleCopyCode(e, client.phone!)} className="flex items-center gap-2 hover:text-[#58b347] cursor-pointer transition-colors group">
                                  <div className="p-1 bg-white rounded border border-slate-200 text-slate-400 group-hover:text-[#58b347] group-hover:border-[#58b347]/30 transition-colors flex items-center justify-center"><IconPhone /></div> 
                                  {client.phone} <IconCopy />
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 text-slate-400">
                                  <div className="p-1 bg-white/50 rounded border border-slate-200/50 opacity-50 flex items-center justify-center"><IconPhone /></div> Brak telefonu
                                </span>
                              )}
                              {client.email ? (
                                <span onClick={(e) => handleCopyCode(e, client.email!)} className="flex items-center gap-2 hover:text-[#58b347] cursor-pointer transition-colors group">
                                  <div className="p-1 bg-white rounded border border-slate-200 text-slate-400 group-hover:text-[#58b347] group-hover:border-[#58b347]/30 transition-colors flex items-center justify-center"><IconMail /></div> 
                                  {client.email} <IconCopy />
                                </span>
                              ) : (
                                <span className="flex items-center gap-2 text-slate-400">
                                  <div className="p-1 bg-white/50 rounded border border-slate-200/50 opacity-50 flex items-center justify-center"><IconMail /></div> Brak adresu e-mail
                                </span>
                              )}
                            </div>
                            
                          </div>
                        </div>

                        {/* PRAWA STRONA - Kółko KPI */}
                        <div className="flex items-center gap-6 shrink-0 pl-6 border-l border-slate-200/50 self-center h-full min-h-[60px]">
                          <div className="flex flex-col items-center justify-center" title={`Sprawność Sieci: Uptime floty klienta wynosi ${healthScore}%`}>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Sprawność Sieci</span>
                            <HealthRing score={healthScore} />
                          </div>
                          <span className={`p-2 rounded-xl transition-all duration-300 border bg-white shadow-sm ${isOpen ? 'text-slate-600 border-slate-300' : 'text-slate-400 border-slate-200 group-hover/acc:border-slate-300 group-hover/acc:text-slate-500'}`}>
                            {isOpen ? <IconChevronUp /> : <IconChevronDown />}
                          </span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="flex flex-col w-full bg-slate-50/50 overflow-hidden">
                          
                          {/* Mini-Dashboard Analytics & Command Bar */}
                          <div className="px-6 py-4 bg-white border-b border-slate-100 flex flex-wrap justify-between items-center gap-4">
                            <div className="flex items-center gap-6">
                              {/* Wskaźniki techniczne */}
                              <div className="flex flex-col justify-center">
                                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 flex items-center gap-1"><IconEvStation /> Sprawność Sieci</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-32 h-2.5 bg-red-100 rounded-full overflow-hidden flex shadow-inner border border-slate-200/50">
                                    <div className="bg-[#58b347] h-full" style={{ width: `${healthScore}%` }}></div>
                                  </div>
                                  <span className="text-xs font-black text-slate-700">{activeCount} / {totalCount} Działa</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Przykładowe Akcje Biznesowe */}
                              <button onClick={(e) => { e.stopPropagation(); alert('Wysłano alert mailowy!'); }} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-slate-50 hover:text-orange-500 hover:border-orange-300 transition-colors flex items-center gap-1.5 shadow-sm">
                                <IconAlertTriangle /> Wyślij Alert
                              </button>
                              
                              <div className="w-px h-6 bg-slate-200 mx-2"></div>
                              
                              <button onClick={(e) => openEditModal(client, e)} className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-blue-500 hover:border-blue-200 hover:bg-blue-50 rounded-lg shadow-sm transition-colors" title="Edytuj dane klienta"><IconEdit /></button>
                              <button onClick={(e) => handleDeleteClient(client.id, e)} className="p-1.5 bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 rounded-lg shadow-sm transition-colors" title="Usuń klienta trwale"><IconTrash /></button>
                            </div>
                          </div>

                          {client.notes && (
                            <div className="px-6 py-3 bg-yellow-50/50 border-b border-yellow-100 flex gap-3 items-start shadow-inner">
                              <span className="text-lg mt-0.5 text-yellow-600 drop-shadow-sm">📌</span>
                              <div>
                                <p className="text-[9px] font-bold text-yellow-600 uppercase tracking-widest mb-0.5">Notatki dyspozytorskie (Wewnętrzne)</p>
                                <p className="text-xs font-medium text-yellow-800 italic leading-relaxed">{client.notes}</p>
                              </div>
                            </div>
                          )}

                          <div className="bg-slate-100/80 px-6 py-2.5 text-[9px] font-extrabold text-slate-500 uppercase tracking-widest flex items-center gap-2 shadow-sm shrink-0 border-b border-slate-200 mt-2">
                            <IconEvStation /> Infrastruktura stacji ładowania ({totalCount})
                          </div>
                          
                          <div className="bg-white w-full overflow-x-auto">
                            {totalCount === 0 ? (
                              <div className="text-center p-8 text-xs font-bold text-slate-400">Brak stacji przypisanych do tego klienta. Skonfiguruj przypisania w module Sieci.</div>
                            ) : (
                              <table className="w-full text-left min-w-[800px]">
                                <thead>
                                  <tr className="bg-slate-50/50 text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                                    <th className="px-6 py-3 w-[40%]">Nazwa stacji</th>
                                    <th className="px-6 py-3 w-[20%]">Lokalizacja</th>
                                    <th className="px-6 py-3 w-[20%]">Technik (Rejon)</th>
                                    <th className="px-6 py-3 w-[20%] text-right">Status na dziś</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100/60 text-xs">
                                  {clientStations.map(station => (
                                    <tr key={station.id} className="hover:bg-slate-50/80 transition-colors group/row">
                                      <td className="px-6 py-3 font-bold text-slate-800 leading-tight group-hover/row:text-[#58b347] transition-colors">{station.name}</td>
                                      <td className="px-6 py-3 font-bold text-slate-500 flex items-center gap-1.5"><IconMapPin /> {station.city || 'Nieznana'}</td>
                                      <td className="px-6 py-3 font-bold text-slate-600">{station.technician || 'Nieprzypisany'}</td>
                                      <td className="px-6 py-3 text-right">
                                        <span className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold border uppercase tracking-widest shadow-sm ${station.status === 'Aktywna' ? 'bg-[#58b347]/10 text-[#499b3a] border-[#58b347]/20' : station.status === 'Awaria' ? 'bg-red-50 text-red-600 border-red-200 animate-pulse shadow-sm' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                          {station.status}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}
      </div>

      {/* --- WODOTRYSK TOAST --- */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-slate-800 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-2 animate-slideUp border border-slate-700 pointer-events-none">
          <IconCheckCircle />
          <span className="text-xs font-bold uppercase tracking-widest">{toastMessage}</span>
        </div>
      )}

      {/* MODAL: TWORZENIE ZAKŁADKI CUSTOMOWEJ --- */}
      {isCustomTabModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setIsCustomTabModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-slideUp" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">Stwórz nową zakładkę (Filtr)</h3>
              <button onClick={() => setIsCustomTabModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleSaveCustomTab} className="p-6 space-y-5 bg-slate-50/30">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Nazwa zakładki na pasku *</label>
                <input required type="text" value={newCustomTab.name} onChange={e => setNewCustomTab({...newCustomTab, name: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" placeholder="Np. Klienci z Pomorza" />
              </div>

              <div className="bg-white p-5 border border-slate-200 rounded-xl space-y-3 shadow-sm">
                <label className="block text-[10px] font-bold uppercase tracking-widest text-[#58b347]">Warunki Filtrowania (Szukajka)</label>
                <p className="text-[10px] text-slate-400 mb-3 leading-relaxed border-b border-slate-100 pb-3">
                  Każde pole to osobny warunek. Możesz używać wykluczeń lub łączyć wiele kryteriów.
                </p>
                {/* Wrzucamy nasz pancerny komponent! */}
                <SearchQueryBuilder queries={newCustomTab.filterQueries} setQueries={(q) => setNewCustomTab({...newCustomTab, filterQueries: q})} />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200 mt-4">
                <button type="button" onClick={() => setIsCustomTabModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-xs uppercase tracking-widest">Anuluj</button>
                <button type="submit" disabled={!newCustomTab.name} className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl hover:bg-[#499b3a] disabled:opacity-50 shadow-sm transition-all text-xs uppercase tracking-widest">Zapisz zakładkę na stałe</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: DODAJ / EDYTUJ KLIENTA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-fadeIn" onClick={() => setIsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden border border-slate-200 animate-slideUp" onClick={e => e.stopPropagation()}>
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center shrink-0">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <IconBuilding /> {editingClient ? 'Edytuj Kartę Klienta' : 'Nowy Partner Biznesowy'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors bg-slate-50 hover:bg-slate-100 rounded-lg p-2 shadow-sm border border-slate-200">✕</button>
            </div>
            
            <form onSubmit={handleSaveClient} className={`p-6 space-y-5 bg-slate-50/30 max-h-[75vh] overflow-y-auto ${customScrollbarClasses}`}>
              
              {/* Sekcja Główna */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[#58b347]/5 rounded-bl-[100px] pointer-events-none"></div>
                
                <div className="flex gap-4 items-start relative z-10">
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-[#58b347] mb-1.5">Nazwa Sieci / Klienta *</label>
                    <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} type="text" placeholder="np. OMV Slovensko, S.r.o" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-inner" />
                    <p className="text-[9px] font-bold text-orange-500 mt-2 uppercase tracking-widest flex items-center gap-1">
                      <IconAlertTriangle /> Musi być identyczna jak w arkuszu zgłoszeń CRM, aby integracja SLA zadziałała.
                    </p>
                  </div>
                  <div className="shrink-0">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Kolor (Hex)</label>
                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-sm h-[46px] w-[60px]">
                      <input type="color" value={formData.color} onChange={e => setFormData({...formData, color: e.target.value})} className="w-full h-full rounded cursor-pointer border-0 p-0 bg-transparent" title="Wybierz unikalny kolor klienta" />
                    </div>
                  </div>
                </div>
                
                <div className="relative z-10 w-1/2">
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5 flex items-center gap-1.5"><IconClock /> Czas reakcji SLA *</label>
                  <div className="relative">
                    <input required value={formData.sla_hours} onChange={e => setFormData({...formData, sla_hours: parseInt(e.target.value) || 0})} type="number" min="1" className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-lg font-black text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">godzin</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-5">
                {/* Kontakty */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 border-b border-slate-100 pb-2 mb-3 flex items-center gap-1.5"><IconBuilding /> Reprezentant</h4>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Osoba kontaktowa</label>
                    <input value={formData.contact_person} onChange={e => setFormData({...formData, contact_person: e.target.value})} type="text" placeholder="Imię i nazwisko" className="w-full border border-slate-200 bg-white rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Telefon</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2"><IconPhone /></div>
                      <input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} type="tel" placeholder="+48..." className="w-full border border-slate-200 bg-white rounded-xl pl-9 pr-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Adres e-mail</label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 -translate-y-1/2"><IconMail /></div>
                      <input value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} type="email" placeholder="kontakt@firma.pl" className="w-full border border-slate-200 bg-white rounded-xl pl-9 pr-4 py-2.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm" />
                    </div>
                  </div>
                </div>

                {/* Notatki */}
                <div className="bg-yellow-50/50 p-5 rounded-xl border border-yellow-200 shadow-sm flex flex-col">
                  <h4 className="text-[10px] font-bold uppercase tracking-widest text-yellow-600 border-b border-yellow-200/50 pb-2 mb-3">Wewnętrzne</h4>
                  <div className="flex-1 flex flex-col">
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-yellow-700 mb-1.5">Notatki dyspozytorskie</label>
                    <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="w-full flex-1 border border-yellow-300 bg-white rounded-xl px-4 py-3 text-xs font-medium text-slate-700 focus:outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500/30 transition-all shadow-sm resize-none" placeholder="Specjalne instrukcje dotyczące tego klienta, specyfika wjazdu na obiekt, procedury SLA..." />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-3 border-t border-slate-200 mt-6">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-xs uppercase tracking-widest">Anuluj</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-bold py-3.5 rounded-xl hover:bg-[#499b3a] transition-all text-xs shadow-sm uppercase tracking-widest flex items-center justify-center gap-2">
                  {editingClient ? <IconCheck /> : <IconPlus />} {editingClient ? 'Zapisz Zmiany' : 'Utwórz Klienta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}