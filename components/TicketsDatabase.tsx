'use client';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../app/supabase';

// --- TYPY DANYCH ---
type Ticket = { id: string; ticket_code: string; station_id: string; technician_id: string | null; ticket_type: string; status: string; priority: string; description: string | null; resolution_notes: string | null; created_at: string; };
type Station = { id: string; name: string; city: string | null; technician: string | null; client: string | null; lat: number | null; lng: number | null; };
type Technician = { id: string; name: string; car_plate?: string | null; };
type Part = { id: string; sku: string; name: string; unit: string; };
type TechInventory = { id: string; part_id: string; quantity: number; };
type Client = { id: string; name: string; sla_hours: number; };

// --- IKONY ---
const IconClock = () => <svg className="w-3.5 h-3.5 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconKanban = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M8 3v18"/><path d="M16 3v18"/></svg>;
const IconList = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IconSync = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>;
const IconCheck = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconAlert = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconPlus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconSettings = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
const IconCheckCircle = () => <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>;
const IconTrendingUp = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>;
const IconCalendar = () => <svg className="w-4 h-4 text-[#58b347]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconSearch = () => <svg className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>;
const IconInfo = () => <svg className="w-5 h-5 inline-block text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>;
const IconTruck = () => <svg className="w-3.5 h-3.5 inline-block mr-1 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 17h4V5H2v12h3"/><path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5"/><path d="M14 17h1"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/></svg>;

// --- FUNKCJA MATEMATYCZNA: OBLICZANIE ODLEGŁOŚCI GPS (Haversine) ---
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Promień Ziemi w km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// --- PARSER CSV ---
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

interface TicketsDatabaseProps {
  isSidebarHovered?: boolean;
}

export default function TicketsDatabase({ isSidebarHovered = false }: TicketsDatabaseProps) {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [techInventory, setTechInventory] = useState<TechInventory[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [closingForm, setClosingForm] = useState({ status: 'W toku', resolution_notes: '', part_id: '', part_qty: 1, consumePart: false });

  // --- STANY FILTROWANIA ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [filterClient, setFilterClient] = useState<string>('');
  const [filterCity, setFilterCity] = useState<string>('');
  const [filterRadius, setFilterRadius] = useState<number>(30); // Domyślnie 30km

  // Stany dla skanera arkusza
  const [sheetUrl, setSheetUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Stany dla manualnego dodawania zgłoszenia
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ station_id: '', ticket_type: 'Awaria', priority: 'Normalny', description: '', technician_id: '' });

  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);

  useEffect(() => {
    setSheetUrl(localStorage.getItem('ekoen_tickets_sheet_url') || '');
  }, []);

  // Zasadnicze pobieranie z bazy Supabase
  const loadSupabaseData = async () => {
    const [tRes, sRes, techRes, pRes, cRes] = await Promise.all([
      supabase.from('tickets').select('*'),
      supabase.from('stations').select('id, name, city, technician, client, lat, lng').order('name'),
      supabase.from('technicians').select('id, name, car_plate').order('name'),
      supabase.from('parts').select('id, sku, name, unit'),
      supabase.from('clients').select('id, name, sla_hours')
    ]);

    if (tRes.data) setTickets(tRes.data);
    if (sRes.data) setStations(sRes.data);
    if (techRes.data) setTechnicians(techRes.data);
    if (pRes.data) setParts(pRes.data);
    if (cRes.data) setClients(cRes.data);
  };

  // --- SILNIK SYNC / SCAN ARKUSZA ---
  const handleScanSheet = async (forcedUrl?: string) => {
    const urlToUse = forcedUrl || sheetUrl;
    if (!urlToUse) return;

    const matches = urlToUse.match(/\/d\/([a-zA-Z0-9-_]+)/);
    const spreadsheetId = matches ? matches[1] : null;
    if (!spreadsheetId) return;

    setIsSyncing(true);
    const candidates = ['zgloszenia', 'tickets', 'zadania', 'arkusz1', 'sheet1', 'Arkusz1', 'Sheet1'];
    let csvText = '';

    for (const tab of candidates) {
      try {
        const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`);
        if (res.ok) {
          const text = await res.text();
          if (text && !text.includes('<html') && text.includes(',')) { csvText = text; break; }
        }
      } catch (err) {}
    }

    if (!csvText) {
      try {
        const res = await fetch(`https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`);
        if (res.ok) { const text = await res.text(); if (text && !text.includes('<html')) csvText = text; }
      } catch (err) {}
    }

    if (!csvText) { setIsSyncing(false); return; }

    const delimiter = csvText.split('\n')[0].includes(';') ? ';' : ',';
    const parsedData = parseCSV(csvText, delimiter);
    if (parsedData.length < 2) { setIsSyncing(false); return; }

    const headers = parsedData[0].map(h => h.toLowerCase());
    const getColIndex = (names: string[]) => headers.findIndex(h => names.some(n => h === n || h.includes(n)));

    const idxCode = getColIndex(['kod', 'id_zgloszenia', 'ticket_code', 'numer', 'id']);
    const idxStation = getColIndex(['stacja', 'station', 'ladowarka', 'nazwa stacji']);
    const idxType = getColIndex(['typ', 'type', 'rodzaj', 'akcja']);
    const idxPriority = getColIndex(['priorytet', 'priority', 'sla']);
    const idxDesc = getColIndex(['opis', 'description', 'uwagi']);
    const idxStatus = getColIndex(['status', 'etap']);

    if (idxCode === -1 || idxStation === -1) { setIsSyncing(false); return; }

    const rows = parsedData.slice(1);
    
    for (const row of rows) {
      if (!row[idxCode] || !row[idxStation]) continue;

      const tCode = row[idxCode].toUpperCase();
      const sheetStationName = row[idxStation];

      const matchedStation = stations.find(s => s.name.toLowerCase() === sheetStationName.toLowerCase());
      if (!matchedStation) continue;

      let autoTechId: string | null = null;
      if (matchedStation.technician) {
        const tech = technicians.find(t => t.name === matchedStation.technician);
        if (tech) autoTechId = tech.id;
      }

      const payload = {
        ticket_code: tCode,
        station_id: matchedStation.id,
        technician_id: autoTechId,
        ticket_type: idxType !== -1 && row[idxType] ? row[idxType] : 'Awaria',
        priority: idxPriority !== -1 && row[idxPriority] ? row[idxPriority] : 'Normalny',
        description: idxDesc !== -1 && row[idxDesc] ? row[idxDesc] : null,
        status: idxStatus !== -1 && row[idxStatus] ? row[idxStatus] : 'Nowe'
      };

      await supabase.from('tickets').upsert(payload, { onConflict: 'ticket_code' });
    }

    localStorage.setItem('ekoen_tickets_sheet_url', urlToUse);
    await loadSupabaseData();
    setIsSyncing(false);
  };

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await loadSupabaseData();
      const savedUrl = localStorage.getItem('ekoen_tickets_sheet_url');
      if (savedUrl) {
        await handleScanSheet(savedUrl);
      }
      setIsLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stations.length, technicians.length]);

  // Globalny nasłuch na ESC aby zamknąć modale
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsNewModalOpen(false);
        setActiveTicket(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // --- MANUALNE TWORZENIE ZGŁOSZENIA ---
  const handleStationChange = (stationId: string) => {
    const station = stations.find(s => s.id === stationId);
    let autoTechId = '';
    if (station && station.technician) {
      const tech = technicians.find(t => t.name === station.technician);
      if (tech) autoTechId = tech.id;
    }
    setNewTicket({ ...newTicket, station_id: stationId, technician_id: autoTechId });
  };

  const isAutoAssignedFromZone = useMemo(() => {
    if (!newTicket.station_id || !newTicket.technician_id) return false;
    const s = stations.find(st => st.id === newTicket.station_id);
    const t = technicians.find(tech => tech.id === newTicket.technician_id);
    return s?.technician === t?.name;
  }, [newTicket.station_id, newTicket.technician_id, stations, technicians]);

  const handleCreateManualTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const generatedCode = `SYS-${Math.floor(Math.random() * 100000)}`;

    const payload = {
      ticket_code: generatedCode,
      station_id: newTicket.station_id,
      technician_id: newTicket.technician_id || null,
      ticket_type: newTicket.ticket_type,
      priority: newTicket.priority,
      description: newTicket.description || null,
      status: 'Nowe'
    };

    const { error } = await supabase.from('tickets').insert([payload]);
    if (error) {
      alert(`Błąd tworzenia zadania: ${error.message}`);
    } else {
      setIsNewModalOpen(false);
      setNewTicket({ station_id: '', ticket_type: 'Awaria', priority: 'Normalny', description: '', technician_id: '' });
      loadSupabaseData();
    }
  };

  const getClosestTechnicianSuggestion = (targetStationId: string) => {
    const targetStation = stations.find(s => s.id === targetStationId);
    if (!targetStation || !targetStation.lat || !targetStation.lng) return null;

    const activeTechTickets = tickets.filter(t => t.status !== 'Zakończone' && t.technician_id && t.station_id !== targetStationId);
    
    let closestTechId: string | null = null;
    let minDistance = Infinity;
    let refStationName = '';

    activeTechTickets.forEach(ticket => {
      const s = stations.find(st => st.id === ticket.station_id);
      if (s && s.lat && s.lng) {
        const dist = calculateDistance(targetStation.lat!, targetStation.lng!, s.lat, s.lng);
        if (dist < minDistance) {
          minDistance = dist;
          closestTechId = ticket.technician_id;
          refStationName = s.name;
        }
      }
    });

    if (closestTechId && minDistance < 100) {
      const tech = technicians.find(t => t.id === closestTechId);
      return { technician: tech?.name, technicianId: tech?.id, distance: Math.round(minDistance), stationName: refStationName };
    }
    return null;
  };

  // Ujednolicony i odświeżony design dla SLA
  const getSlaInfo = useCallback((createdAt: string, stationId: string, status: string) => {
    if (status === 'Zakończone') return { label: 'Zakończone', hoursLeft: 9999, style: 'bg-slate-100 text-slate-500 border-slate-200' };

    const station = stations.find(s => s.id === stationId);
    const client = clients.find(c => c.name === station?.client);
    const slaHours = client?.sla_hours || 48;

    const createdTime = new Date(createdAt).getTime();
    const deadline = createdTime + (slaHours * 3600000);
    const timeLeft = (deadline - Date.now()) / 3600000;

    if (timeLeft < 0) {
      return { label: `Po terminie! (${Math.abs(Math.round(timeLeft))}h)`, hoursLeft: timeLeft, style: 'bg-red-50 text-red-600 border-red-200' };
    }
    if (timeLeft < 12) {
      return { label: `Pilne! ${Math.floor(timeLeft)}h`, hoursLeft: timeLeft, style: 'bg-orange-50 text-orange-600 border-orange-200' };
    }
    return { label: `Zostało ${Math.floor(timeLeft)}h`, hoursLeft: timeLeft, style: 'bg-[#58b347]/10 text-[#499b3a] border-[#58b347]/20' };
  }, [stations, clients]);


  // --- DANE DLA FILTRÓW ZAAWANSOWANYCH ---
  const uniqueCitiesWithCoords = useMemo(() => {
    const cities = new Map<string, { lat: number, lng: number }>();
    stations.forEach(s => {
      if (s.city && s.lat && s.lng && !cities.has(s.city)) {
        cities.set(s.city, { lat: s.lat, lng: s.lng });
      }
    });
    return Array.from(cities.entries()).map(([city, coords]) => ({ city, ...coords })).sort((a, b) => a.city.localeCompare(b.city));
  }, [stations]);

  const uniqueClients = useMemo(() => {
    const clientSet = new Set<string>();
    stations.forEach(s => { if (s.client) clientSet.add(s.client); });
    return Array.from(clientSet).sort();
  }, [stations]);

  // Główny silnik filtrowania (Szukajka + Klienci + Odległość + Status)
  const sortedAndFilteredTickets = useMemo(() => {
    let result = tickets.filter(t => {
      if (statusFilter === 'ACTIVE') return t.status !== 'Zakończone';
      if (statusFilter === 'CLOSED') return t.status === 'Zakończone';
      return true;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => {
        const s = stations.find(st => st.id === t.station_id);
        const tech = technicians.find(te => te.id === t.technician_id);
        return t.ticket_code.toLowerCase().includes(q) ||
               t.ticket_type.toLowerCase().includes(q) ||
               s?.name.toLowerCase().includes(q) ||
               s?.client?.toLowerCase().includes(q) ||
               tech?.name.toLowerCase().includes(q);
      });
    }

    if (filterClient) {
      result = result.filter(t => {
        const s = stations.find(st => st.id === t.station_id);
        return s?.client === filterClient;
      });
    }

    if (filterCity) {
      const cityData = uniqueCitiesWithCoords.find(c => c.city === filterCity);
      if (cityData) {
        result = result.filter(t => {
          const s = stations.find(st => st.id === t.station_id);
          if (!s || !s.lat || !s.lng) return false;
          const dist = calculateDistance(cityData.lat, cityData.lng, s.lat, s.lng);
          return dist <= filterRadius;
        });
      }
    }

    return result.sort((a, b) => {
      const slaA = getSlaInfo(a.created_at, a.station_id, a.status);
      const slaB = getSlaInfo(b.created_at, b.station_id, b.status);
      return slaA.hoursLeft - slaB.hoursLeft;
    });
  }, [tickets, statusFilter, searchQuery, filterClient, filterCity, filterRadius, stations, technicians, uniqueCitiesWithCoords, getSlaInfo]);

  // KPI Calculations
  const activeTicketsCount = tickets.filter(t => t.status !== 'Zakończone').length;
  const overdueTicketsCount = tickets.filter(t => t.status !== 'Zakończone' && getSlaInfo(t.created_at, t.station_id, t.status).hoursLeft < 0).length;
  const urgentTicketsCount = tickets.filter(t => t.status !== 'Zakończone' && getSlaInfo(t.created_at, t.station_id, t.status).hoursLeft >= 0 && getSlaInfo(t.created_at, t.station_id, t.status).hoursLeft < 12).length;

  useEffect(() => {
    if (activeTicket && activeTicket.technician_id) {
      supabase.from('technician_inventory').select('*').eq('technician_id', activeTicket.technician_id).gt('quantity', 0)
        .then(({ data }) => { if (data) setTechInventory(data); });
    }
  }, [activeTicket]);

  const handleUpdateTicketStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;

    if (closingForm.status === 'Zakończone' && closingForm.consumePart && closingForm.part_id) {
      const stockItem = techInventory.find(i => i.part_id === closingForm.part_id);
      if (!stockItem || stockItem.quantity < closingForm.part_qty) { alert("Błąd: Technik nie ma tylu części na aucie!"); return; }
      await supabase.from('technician_inventory').update({ quantity: stockItem.quantity - closingForm.part_qty }).eq('id', stockItem.id);
      await supabase.from('inventory_logs').insert([{ part_id: closingForm.part_id, technician_id: activeTicket.technician_id, operation_type: 'WYDANIE', quantity: closingForm.part_qty, notes: `Zużyto przy zamknięciu zgłoszenia` }]);
    }

    const updatePayload: any = { status: closingForm.status, resolution_notes: closingForm.resolution_notes || null };
    if (closingForm.status === 'Zakończone') updatePayload.closed_at = new Date().toISOString();

    const { error } = await supabase.from('tickets').update(updatePayload).eq('id', activeTicket.id);
    if (error) alert(error.message);
    else { setActiveTicket(null); loadSupabaseData(); }
  };

  const onDragStart = (e: React.DragEvent, ticketId: string) => { setDraggedTicketId(ticketId); e.dataTransfer.effectAllowed = "move"; };
  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); };
  const onDrop = async (e: React.DragEvent, targetTechnicianId: string | null) => {
    e.preventDefault(); if (!draggedTicketId) return;
    setTickets(prev => prev.map(t => t.id === draggedTicketId ? { ...t, technician_id: targetTechnicianId } : t));
    setDraggedTicketId(null);
    const { error } = await supabase.from('tickets').update({ technician_id: targetTechnicianId }).eq('id', draggedTicketId);
    if (error) { alert("Błąd zapisu przypisania."); loadSupabaseData(); }
  };

  const getStationName = (id: string) => stations.find(s => s.id === id)?.name || 'Nieznana';
  const getTechName = (id: string | null) => id ? technicians.find(t => t.id === id)?.name || 'Nieprzypisany' : 'Nieprzypisany';
  const getPartDetails = (id: string) => parts.find(p => p.id === id);

  // Zmodernizowana Karta
  const TicketCard = ({ t }: { t: Ticket }) => {
    const sla = getSlaInfo(t.created_at, t.station_id, t.status);
    const station = stations.find(s => s.id === t.station_id);

    return (
      <div 
        draggable={t.status !== 'Zakończone'}
        onDragStart={(e) => onDragStart(e, t.id)}
        onClick={() => { setActiveTicket(t); setClosingForm({ status: t.status, resolution_notes: t.resolution_notes || '', part_id: '', part_qty: 1, consumePart: false }); }}
        className={`bg-white border p-4 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group ${t.status === 'Zakończone' ? 'border-slate-200 opacity-60' : 'border-slate-200 hover:border-[#58b347]/50'}`}
      >
        {/* Delikatny wskaźnik SLA z lewej strony (wodotrysk) */}
        {t.status !== 'Zakończone' && (
           <div className={`absolute left-0 top-0 bottom-0 w-1 ${sla.hoursLeft < 0 ? 'bg-red-500 animate-pulse' : sla.hoursLeft < 12 ? 'bg-orange-500' : 'bg-[#58b347]'}`} />
        )}

        <div className="flex justify-between items-start mb-2.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${sla.style}`}>
            <IconClock /> {sla.label}
          </span>
          <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">{t.ticket_code}</span>
        </div>
        
        <h4 className="font-bold text-slate-800 text-sm leading-tight mb-1 truncate">{station?.name || 'Stacja'}</h4>
        <p className="text-[10px] text-slate-500 font-medium truncate mb-3">{t.ticket_type} • {station?.client}</p>
        
        <div className="flex justify-between items-center pt-2.5 border-t border-slate-100">
          <span className={`text-[9px] font-bold uppercase ${t.status === 'Zakończone' ? 'text-slate-400' : 'text-[#58b347]'}`}>{t.status}</span>
          <span className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${t.priority === 'Krytyczny' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'}`}>{t.priority}</span>
        </div>
      </div>
    );
  };

  const kanbanColumns = [null, ...technicians];

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-100/60 backdrop-blur-2xl border-l border-white/20 z-40 overflow-hidden flex flex-col font-sans transition-all duration-300 ease-out shadow-[-10px_0_30px_rgba(0,0,0,0.05)]">
      
      {/* Pasek nawigacji górnej */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/40 px-6 py-4 flex items-center justify-between shrink-0">
        <div className={`transition-all duration-300 ease-in-out ${isSidebarHovered ? 'ml-[184px]' : 'ml-0'}`}>
          <h1 className="text-xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
            Centrum Zgłoszeń (Helpdesk)
            {isSyncing && <span className="text-[10px] bg-[#58b347]/10 text-[#58b347] border border-[#58b347]/20 px-2 py-0.5 rounded-full animate-pulse uppercase tracking-wider font-bold">Synchronizacja...</span>}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5 font-medium">Dyspozytornia i obsługa SLA.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <button 
            onClick={() => handleScanSheet()} 
            disabled={isSyncing || !sheetUrl}
            className="bg-white border border-slate-200 text-slate-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 shadow-sm disabled:opacity-40 transition-colors"
          >
            <IconSync /> Skanuj zgłoszenia
          </button>

          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="bg-white border border-slate-200 text-slate-400 hover:text-slate-600 px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors"><IconSettings /></button>

          <div className="flex bg-slate-100/50 p-1 rounded-xl border border-slate-200/60 shadow-inner backdrop-blur-md ml-2">
            <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'kanban' ? 'bg-white shadow-sm border border-slate-200 text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}><IconKanban /> Tablica</button>
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white shadow-sm border border-slate-200 text-[#58b347]' : 'text-slate-500 hover:text-slate-700'}`}><IconList /> Lista</button>
          </div>

          <button onClick={() => setIsNewModalOpen(true)} className="bg-[#58b347] text-white border border-[#499b3a] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#499b3a] flex items-center gap-1.5 shadow-sm transition-all ml-2">
            <IconPlus /> Ręczne zlecenie
          </button>
        </div>
      </div>

      {/* Kontener Główny */}
      <div className="flex-1 overflow-hidden relative">
        {isLoading ? (
          <div className="flex w-full h-full items-center justify-center text-sm font-bold text-slate-400">Ładowanie bazy danych...</div>
        ) : (
          <div className="h-full w-full max-w-[1600px] mx-auto p-6 flex flex-col gap-6">
            
            {/* Opcjonalny Panel Ustawień (Wysuwany) */}
            {isSettingsOpen && (
              <div className="w-full bg-white/95 backdrop-blur-sm border border-slate-200 p-5 rounded-2xl shadow-sm flex items-end gap-4 animate-fadeIn shrink-0">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Link Arkusza Google ze zleceniami:</label>
                  <input type="url" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all bg-slate-50" placeholder="https://docs.google.com/spreadsheets/d/..." />
                </div>
                <button onClick={() => { setIsSettingsOpen(false); handleScanSheet(); }} className="bg-slate-800 text-white font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-slate-700 transition-colors shadow-sm">Zapisz konfigurację</button>
              </div>
            )}

            {/* KPI Dashboard */}
            <div className="grid grid-cols-3 gap-6 shrink-0">
              <div className="bg-white/80 backdrop-blur-md border border-white/60 rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Zgłoszenia w toku</p>
                  <p className="text-3xl font-bold text-slate-700">{activeTicketsCount}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                  <IconList />
                </div>
              </div>
              
              <div className={`bg-white/80 backdrop-blur-md border ${urgentTicketsCount > 0 ? 'border-orange-200' : 'border-white/60'} rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between`}>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Zagrożone SLA (&lt; 12h)</p>
                  <p className={`text-3xl font-bold ${urgentTicketsCount > 0 ? 'text-orange-600' : 'text-slate-700'}`}>{urgentTicketsCount}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${urgentTicketsCount > 0 ? 'bg-orange-50 text-orange-500' : 'bg-[#58b347]/10 text-[#58b347]'}`}>
                  <IconClock />
                </div>
              </div>

              <div className={`bg-white/80 backdrop-blur-md border ${overdueTicketsCount > 0 ? 'border-red-200' : 'border-white/60'} rounded-2xl p-5 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex items-center justify-between`}>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Po terminie (Przekroczone SLA)</p>
                  <p className={`text-3xl font-bold ${overdueTicketsCount > 0 ? 'text-red-600 animate-pulse' : 'text-slate-700'}`}>{overdueTicketsCount}</p>
                </div>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${overdueTicketsCount > 0 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'}`}>
                  <IconAlert />
                </div>
              </div>
            </div>

            {/* Pasek Zaawansowanego Filtrowania (Wodotrysk) */}
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4 shrink-0 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <IconSearch />
                <input 
                  type="text" 
                  placeholder="Szukaj (kod, stacja, technik)..." 
                  value={searchQuery} 
                  onChange={e => setSearchQuery(e.target.value)} 
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all bg-white"
                />
              </div>

              <div className="min-w-[150px]">
                <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 cursor-pointer shadow-sm focus:outline-none focus:border-[#58b347]">
                  <option value="ACTIVE">Status: Tylko Aktywne</option>
                  <option value="CLOSED">Status: Tylko Zakończone</option>
                  <option value="ALL">Status: Wszystkie</option>
                </select>
              </div>

              <div className="w-px h-6 bg-slate-200 mx-2"></div>

              <div className="min-w-[150px]">
                <select value={filterClient} onChange={e => setFilterClient(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 cursor-pointer shadow-sm focus:outline-none focus:border-[#58b347]">
                  <option value="">Wszyscy Klienci</option>
                  {uniqueClients.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="min-w-[160px]">
                <select value={filterCity} onChange={e => setFilterCity(e.target.value)} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 cursor-pointer shadow-sm focus:outline-none focus:border-[#58b347]">
                  <option value="">Cała Polska (Bez lokalizacji)</option>
                  {uniqueCitiesWithCoords.map(c => <option key={c.city} value={c.city}>{c.city}</option>)}
                </select>
              </div>

              {filterCity && (
                <div className="min-w-[130px] animate-fadeIn">
                  <select value={filterRadius} onChange={e => setFilterRadius(Number(e.target.value))} className="w-full border border-[#58b347]/40 bg-[#58b347]/5 rounded-xl px-3 py-2 text-xs font-bold text-[#58b347] cursor-pointer shadow-sm focus:outline-none focus:border-[#58b347]">
                    <option value={10}>Promień: 10 km</option>
                    <option value={30}>Promień: 30 km</option>
                    <option value={50}>Promień: 50 km</option>
                    <option value={100}>Promień: 100 km</option>
                    <option value={200}>Promień: 200 km</option>
                  </select>
                </div>
              )}

              {(searchQuery || filterClient || filterCity || statusFilter !== 'ACTIVE') && (
                <button 
                  onClick={() => { setSearchQuery(''); setFilterClient(''); setFilterCity(''); setStatusFilter('ACTIVE'); }} 
                  className="text-[10px] text-slate-400 hover:text-red-500 font-bold uppercase tracking-widest px-2 transition-colors"
                >
                  Wyczyść
                </button>
              )}
            </div>

            {/* WIDOK: KANBAN */}
            {viewMode === 'kanban' && (
              <div className="flex gap-5 h-full overflow-x-auto pb-4 px-1 snap-x scrollbar-thin scrollbar-thumb-slate-300 flex-1">
                {kanbanColumns.map((tech) => {
                  const techTickets = sortedAndFilteredTickets.filter(t => tech ? t.technician_id === tech.id : t.technician_id === null);
                  return (
                    <div 
                      key={tech ? tech.id : 'unassigned'} 
                      className={`min-w-[320px] max-w-[320px] bg-white/40 backdrop-blur-md border border-white/60 rounded-2xl flex flex-col snap-center shadow-sm overflow-hidden ${!tech ? 'ring-1 ring-orange-200/50 bg-orange-50/10' : ''}`}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, tech ? tech.id : null)}
                    >
                      <div className={`p-4 border-b border-slate-100 flex justify-between items-center bg-white/60 shrink-0`}>
                        <div className="flex items-center gap-3">
                          {tech ? (
                            <div className="w-8 h-8 rounded-full bg-[#58b347]/10 flex items-center justify-center text-[#58b347] font-bold text-xs">
                              {tech.name.substring(0, 2).toUpperCase()}
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 font-bold text-xs">
                              !
                            </div>
                          )}
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm truncate leading-tight">{tech ? tech.name : 'Nieprzypisane'}</h3>
                            {tech && <span className="text-[9px] font-bold text-slate-400 font-mono uppercase tracking-wider block mt-0.5">{tech.car_plate ? <><IconTruck /> {tech.car_plate.split(',')[0]}</> : 'Brak pojazdu'}</span>}
                          </div>
                        </div>
                        <span className="bg-white border border-slate-200 text-slate-600 text-xs font-black px-2.5 py-0.5 rounded-lg shadow-sm">{techTickets.length}</span>
                      </div>
                      <div className="p-4 flex-1 overflow-y-auto space-y-3 scrollbar-hide">
                        {techTickets.map(t => <TicketCard key={t.id} t={t} />)}
                        {techTickets.length === 0 && (
                          <div className="text-center text-xs font-bold text-slate-400 py-12 border-2 border-dashed border-slate-200/60 rounded-xl bg-white/30">
                            Pusta strefa
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* WIDOK: LISTA */}
            {viewMode === 'list' && (
              <div className="w-full bg-white/95 backdrop-blur-sm border border-white/60 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden flex-1">
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-4">Kod</th>
                        <th className="px-6 py-4">Typ akcji</th>
                        <th className="px-6 py-4">Ładowarka / Klient</th>
                        <th className="px-6 py-4">Przypisanie</th>
                        <th className="px-6 py-4">Czas SLA</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-center">Akcje</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100/60 text-xs">
                      {sortedAndFilteredTickets.map(t => {
                        const sla = getSlaInfo(t.created_at, t.station_id, t.status);
                        const station = stations.find(s => s.id === t.station_id);
                        return (
                          <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-slate-400 uppercase tracking-wider">{t.ticket_code}</td>
                            <td className="px-6 py-4 font-bold text-slate-700">{t.ticket_type}</td>
                            <td className="px-6 py-4">
                              <div className="font-bold text-slate-800 leading-tight">{station?.name}</div>
                              <div className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{station?.client} {station?.city ? `(${station.city})` : ''}</div>
                            </td>
                            <td className="px-6 py-4 font-bold text-slate-600">{getTechName(t.technician_id)}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-widest ${sla.style}`}>
                                {sla.label}
                              </span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`text-[10px] font-bold uppercase tracking-widest ${t.status === 'Zakończone' ? 'text-slate-400' : 'text-[#58b347]'}`}>
                                {t.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <button 
                                onClick={() => { setActiveTicket(t); setClosingForm({ status: t.status, resolution_notes: t.resolution_notes || '', part_id: '', part_qty: 1, consumePart: false }); }} 
                                className="bg-white border border-slate-200 text-slate-600 hover:text-[#58b347] hover:border-[#58b347] px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors"
                              >
                                Zarządzaj
                              </button>
                            </td>
                          </tr>
                        )
                      })}
                      {sortedAndFilteredTickets.length === 0 && (
                        <tr><td colSpan={7} className="text-center p-12 text-slate-400 font-bold">Brak zgłoszeń spełniających wybrane kryteria wyszukiwania.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* --- MODALE --- */}

      {/* MODAL: TWORZENIE RĘCZNEGO ZGŁOSZENIA */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-slideUp">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-widest flex items-center gap-2">Nowe zgłoszenie operacyjne</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleCreateManualTicket} className="p-6 space-y-5 bg-slate-50/30">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Wybierz stację ładowania *</label>
                <select required value={newTicket.station_id} onChange={e => handleStationChange(e.target.value)} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer">
                  <option value="">-- Wyszukaj z bazy danych --</option>
                  {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.city || 'Brak miasta'})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Typ akcji</label>
                  <select value={newTicket.ticket_type} onChange={e => setNewTicket({...newTicket, ticket_type: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer">
                    <option>Awaria</option>
                    <option>Przegląd</option>
                    <option>Uruchomienie</option>
                    <option>Zlecenie jakościowe</option>
                    <option>Naprawa odpłatna</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Priorytet SLA</label>
                  <select value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-bold text-slate-800 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer">
                    <option>Niski</option>
                    <option>Normalny</option>
                    <option>Wysoki</option>
                    <option className="text-red-600 font-black">Krytyczny</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4 shadow-inner">
                <label className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  Przypisanie (Dispatch)
                  {isAutoAssignedFromZone && (
                    <span className="text-[#58b347] bg-[#58b347]/10 text-[9px] px-2 py-0.5 rounded-md font-black tracking-widest border border-[#58b347]/20">✓ AUTO-PRZYPISANIE Z REJONU</span>
                  )}
                </label>
                
                {newTicket.station_id && getClosestTechnicianSuggestion(newTicket.station_id) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-800 flex gap-3 items-start animate-fadeIn shadow-sm">
                    <div className="text-lg mt-0.5"><IconInfo /></div>
                    <div>
                      <strong className="block mb-1 text-[10px] uppercase tracking-widest text-blue-600">Sztuczna Inteligencja podpowiada:</strong>
                      Zaraz obok jest <strong>{getClosestTechnicianSuggestion(newTicket.station_id)?.technician}</strong>. 
                      Aktualnie obsługuje stację <em>{getClosestTechnicianSuggestion(newTicket.station_id)?.stationName}</em> (ok. {getClosestTechnicianSuggestion(newTicket.station_id)?.distance} km stąd).
                      <button type="button" onClick={() => setNewTicket({...newTicket, technician_id: getClosestTechnicianSuggestion(newTicket.station_id)!.technicianId!})} className="block mt-2 font-bold text-blue-600 hover:text-blue-800 underline transition-colors">Przypisz zadanie do tego technika</button>
                    </div>
                  </div>
                )}

                <select value={newTicket.technician_id} onChange={e => setNewTicket({...newTicket, technician_id: e.target.value})} className={`w-full border rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none transition-all cursor-pointer shadow-sm ${isAutoAssignedFromZone ? 'border-[#58b347] bg-[#58b347]/5 focus:ring-1 focus:ring-[#58b347]/30' : 'border-slate-200 bg-white focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30'}`}>
                  <option value="">-- Pozostaw w puli nieprzypisanych --</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Opis / Uwagi od Klienta</label>
                <textarea rows={3} value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm resize-none" placeholder="Co się stało? Jakie części mogą być potrzebne?" />
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-200 mt-4">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="flex-1 bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors shadow-sm text-xs">Anuluj</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl hover:bg-[#499b3a] shadow-lg shadow-green-600/30 transition-all text-xs">Utwórz zadanie</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ZARZĄDZANIE / ZAMYKANIE ZGŁOSZENIA */}
      {activeTicket && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-slideUp">
            <div className="bg-white px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-mono text-[10px] border border-slate-200">{activeTicket.ticket_code}</span> 
                  {activeTicket.ticket_type}
                </h3>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-wider">{getStationName(activeTicket.station_id)}</p>
              </div>
              <button onClick={() => setActiveTicket(null)} className="text-slate-400 hover:text-slate-700 transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleUpdateTicketStatus} className="p-6 space-y-5 bg-slate-50/30">
              <div className="bg-white p-4 rounded-xl border border-slate-200 text-slate-700 text-sm shadow-sm">
                <strong className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-widest">Treść zgłoszenia klienta:</strong>
                <p className="font-medium italic text-slate-600">{activeTicket.description || 'Brak dodatkowego opisu usterki.'}</p>
              </div>

              {activeTicket.status !== 'Zakończone' ? (
                <>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Zmień status operacyjny</label>
                    <select value={closingForm.status} onChange={e => setClosingForm({...closingForm, status: e.target.value})} className="w-full px-4 py-3 border border-slate-200 bg-white rounded-xl text-sm font-bold text-[#58b347] focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm cursor-pointer">
                      <option value="Nowe">Nowe (Oczekuje na akcję)</option>
                      <option value="W toku">W toku (Technik w drodze / Działa)</option>
                      <option value="Oczekuje na części">Oczekuje na części (Zdiagnozowano)</option>
                      <option value="Zakończone">Zakończone (Naprawiono)</option>
                    </select>
                  </div>

                  {closingForm.status === 'Zakończone' && activeTicket.technician_id && (
                    <div className="bg-orange-50 border border-orange-200 p-5 rounded-xl space-y-4 shadow-sm animate-fadeIn">
                      <div className="flex items-center gap-3">
                        <input type="checkbox" id="consumePart" checked={closingForm.consumePart} onChange={e => setClosingForm({...closingForm, consumePart: e.target.checked})} className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer border-orange-300" />
                        <label htmlFor="consumePart" className="text-xs font-bold text-orange-800 cursor-pointer select-none uppercase tracking-widest">Zużyto materiał z auta technika</label>
                      </div>
                      
                      {closingForm.consumePart && (
                        <div className="grid grid-cols-3 gap-3 pt-2 border-t border-orange-200/50">
                          <div className="col-span-2">
                            <select required={closingForm.consumePart} value={closingForm.part_id} onChange={e => setClosingForm({...closingForm, part_id: e.target.value})} className="w-full border border-orange-300 bg-white rounded-lg p-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-1 focus:ring-orange-400 shadow-sm cursor-pointer">
                              <option value="">Wybierz sprzęt z bagażnika...</option>
                              {techInventory.map(item => {
                                const p = getPartDetails(item.part_id);
                                return <option key={item.id} value={item.part_id}>{p?.name} (Auto: {item.quantity} szt.)</option>
                              })}
                            </select>
                          </div>
                          <div>
                            <input type="number" min="1" required={closingForm.consumePart} value={closingForm.part_qty} onChange={e => setClosingForm({...closingForm, part_qty: parseInt(e.target.value) || 1})} className="w-full border border-orange-300 bg-white rounded-lg p-2.5 text-center font-black text-sm text-slate-800 outline-none focus:ring-1 focus:ring-orange-400 shadow-sm" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Raport techniczny dla bazy</label>
                    <textarea required={closingForm.status === 'Zakończone'} rows={3} value={closingForm.resolution_notes} onChange={e => setClosingForm({...closingForm, resolution_notes: e.target.value})} className="w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:outline-none focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 transition-all shadow-sm resize-none" placeholder="Co dokładnie zrobiono? Jakie były przyczyny?" />
                  </div>

                  <div className="pt-3 border-t border-slate-200 mt-4">
                    <button type="submit" className="w-full bg-[#58b347] text-white font-bold py-3.5 rounded-xl hover:bg-[#499b3a] shadow-sm transition-colors text-xs uppercase tracking-widest flex items-center justify-center gap-2">
                      <IconCheck /> Zaktualizuj system
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-6 pt-2">
                  <div className="bg-[#58b347]/10 p-5 rounded-xl border border-[#58b347]/20 flex flex-col items-center justify-center text-center">
                    <IconCheckCircle />
                    <span className="text-[#499b3a] block font-black uppercase tracking-widest mt-2 mb-1">Zgłoszenie Zamknięte</span>
                    <span className="text-xs font-bold text-slate-500">Realizacja: {getTechName(activeTicket.technician_id)}</span>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Oficjalny Raport:</label>
                    <div className="bg-white border border-slate-200 text-slate-700 p-4 rounded-xl font-medium whitespace-pre-wrap text-sm leading-relaxed shadow-sm">{activeTicket.resolution_notes || 'Brak uwag serwisowych.'}</div>
                  </div>
                  <button type="button" onClick={() => setActiveTicket(null)} className="w-full bg-slate-100 text-slate-700 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors shadow-sm text-xs uppercase tracking-widest">Wróć do listy</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}