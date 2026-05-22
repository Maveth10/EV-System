import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../app/supabase';

// --- TYPY DANYCH ---
type Ticket = { id: string; ticket_code: string; station_id: string; technician_id: string | null; ticket_type: string; status: string; priority: string; description: string | null; resolution_notes: string | null; created_at: string; };
type Station = { id: string; name: string; city: string | null; technician: string | null; client: string | null; lat: number | null; lng: number | null; };
type Technician = { id: string; name: string; car_plate?: string | null; };
type Part = { id: string; sku: string; name: string; unit: string; };
type TechInventory = { id: string; part_id: string; quantity: number; };
type Client = { id: string; name: string; sla_hours: number; };

// --- IKONY ---
const IconClock = () => <svg className="w-3.5 h-3.5 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
const IconKanban = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><path d="M8 3v18"/><path d="M16 3v18"/></svg>;
const IconList = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>;
const IconSync = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/></svg>;
const IconCheck = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconAlert = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>;
const IconPlus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;

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

export default function TicketsDatabase() {
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('kanban');
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [techInventory, setTechInventory] = useState<TechInventory[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);
  const [closingForm, setClosingForm] = useState({ status: 'W toku', resolution_notes: '', part_id: '', part_qty: 1, consumePart: false });

  // Stany dla skanera arkusza
  const [sheetUrl, setSheetUrl] = useState(() => localStorage.getItem('ekoen_tickets_sheet_url') || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Stany dla manualnego dodawania zgłoszenia
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newTicket, setNewTicket] = useState({ station_id: '', ticket_type: 'Awaria', priority: 'Normalny', description: '', technician_id: '' });

  const [draggedTicketId, setDraggedTicketId] = useState<string | null>(null);

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
  }, [stations.length, technicians.length]);

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
    // Generowanie kodu dla zgłoszeń z systemu, by uniknąć konfliktów z arkuszem Google
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

  const getSlaInfo = (createdAt: string, stationId: string, status: string) => {
    if (status === 'Zakończone') return { label: 'Zakończone', hoursLeft: 9999, style: 'bg-slate-100 text-slate-500 border-slate-200' };

    const station = stations.find(s => s.id === stationId);
    const client = clients.find(c => c.name === station?.client);
    const slaHours = client?.sla_hours || 48;

    const createdTime = new Date(createdAt).getTime();
    const deadline = createdTime + (slaHours * 3600000);
    const timeLeft = (deadline - Date.now()) / 3600000;

    if (timeLeft < 0) {
      return { label: `Po terminie! (${Math.abs(Math.round(timeLeft))}h)`, hoursLeft: timeLeft, style: 'bg-red-50 text-red-700 border-red-300 ring-2 ring-red-500 animate-pulse' };
    }
    if (timeLeft < 12) {
      return { label: `Pilne! ${Math.floor(timeLeft)}h`, hoursLeft: timeLeft, style: 'bg-orange-50 text-orange-700 border-orange-300 ring-1 ring-orange-400' };
    }
    return { label: `Zostało ${Math.floor(timeLeft)}h`, hoursLeft: timeLeft, style: 'bg-white text-slate-600 border-slate-200' };
  };

  const sortedAndFilteredTickets = useMemo(() => {
    const base = tickets.filter(t => {
      if (statusFilter === 'ACTIVE') return t.status !== 'Zakończone';
      if (statusFilter === 'CLOSED') return t.status === 'Zakończone';
      return true;
    });

    return base.sort((a, b) => {
      const slaA = getSlaInfo(a.created_at, a.station_id, a.status);
      const slaB = getSlaInfo(b.created_at, b.station_id, b.status);
      return slaA.hoursLeft - slaB.hoursLeft;
    });
  }, [tickets, statusFilter, stations, clients]);

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

  const TicketCard = ({ t }: { t: Ticket }) => {
    const sla = getSlaInfo(t.created_at, t.station_id, t.status);
    const station = stations.find(s => s.id === t.station_id);

    let typeBg = 'bg-slate-50/60';
    if (t.ticket_type === 'Awaria') typeBg = 'bg-red-50/40 border-red-200';
    else if (t.ticket_type === 'Przegląd') typeBg = 'bg-blue-50/40 border-blue-200';
    else if (t.ticket_type === 'Uruchomienie') typeBg = 'bg-purple-50/40 border-purple-200';
    else if (t.ticket_type === 'Zlecenie jakościowe') typeBg = 'bg-orange-50/40 border-orange-200';

    return (
      <div 
        draggable={t.status !== 'Zakończone'}
        onDragStart={(e) => onDragStart(e, t.id)}
        onClick={() => { setActiveTicket(t); setClosingForm({ status: t.status, resolution_notes: t.resolution_notes || '', part_id: '', part_qty: 1, consumePart: false }); }}
        className={`border p-3.5 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer relative overflow-hidden group border-slate-200 ${typeBg} ${sla.hoursLeft < 12 && t.status !== 'Zakończone' ? 'ring-2 ring-red-400 animate-pulse' : ''}`}
      >
        <div className="flex justify-between items-start mb-2">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded-md border ${sla.style}`}>
            <IconClock /> {sla.label}
          </span>
          <span className="text-[9px] font-mono font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">{t.ticket_code}</span>
        </div>
        
        <h4 className="font-bold text-slate-800 text-xs leading-tight mb-0.5 truncate">{station?.name || 'Stacja'}</h4>
        <p className="text-[10px] text-slate-400 font-medium truncate mb-2">{t.ticket_type} • {station?.client}</p>
        
        <div className="flex justify-between items-center pt-2 border-t border-slate-100">
          <span className="text-[9px] font-bold text-slate-500 uppercase">{t.status}</span>
          <span className="text-[9px] font-bold text-slate-400 font-mono">{t.priority}</span>
        </div>
      </div>
    );
  };

  const kanbanColumns = [null, ...technicians];

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-50 z-40 p-6 flex flex-col h-full overflow-hidden">
      
      {/* PANEL STEROWANIA */}
      <div className="max-w-[1600px] w-full mx-auto flex justify-between items-end mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            Dyspozytornia Regionalna FSM
            {isSyncing && <span className="text-xs bg-green-100 text-[#58b347] px-2 py-1 rounded-full animate-spin">🔄</span>}
          </h1>
          <p className="text-sm text-slate-500 mt-1">Zlecenia pobierają się automatycznie z Arkusza Google i rozdzielają po strefach techników.</p>
        </div>
        <div className="flex gap-3 items-center">
          
          <button 
            onClick={() => handleScanSheet()} 
            disabled={isSyncing || !sheetUrl}
            className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center gap-1.5 shadow-sm disabled:opacity-40"
          >
            <IconSync /> {isSyncing ? 'Skanowanie...' : 'Skanuj Arkusz teraz'}
          </button>

          <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className="bg-white border border-slate-200 text-slate-600 px-3 py-2 rounded-lg text-xs font-bold hover:bg-slate-50 shadow-sm">⚙️ Link</button>

          <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
            <button onClick={() => setViewMode('kanban')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${viewMode === 'kanban' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><IconKanban /> Tablica</button>
            <button onClick={() => setViewMode('list')} className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-colors ${viewMode === 'list' ? 'bg-slate-100 text-slate-800' : 'text-slate-400 hover:text-slate-600'}`}><IconList /> Lista</button>
          </div>

          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border border-slate-200 bg-white rounded-lg p-2 text-xs font-semibold text-slate-700 cursor-pointer shadow-sm focus:outline-none">
            <option value="ACTIVE">⚡ Poukładane po SLA (Aktywne)</option>
            <option value="CLOSED">✅ Zakończone zadania</option>
            <option value="ALL">📋 Wszystkie</option>
          </select>

          {/* Przycisk dodawania manualnego */}
          <button onClick={() => setIsNewModalOpen(true)} className="bg-[#58b347] text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-[#499b3a] flex items-center gap-1.5 shadow-sm transition-all">
            <IconPlus /> Dodaj ręcznie
          </button>
        </div>
      </div>

      {isSettingsOpen && (
        <div className="max-w-[1600px] w-full mx-auto mb-4 bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex items-center gap-4 animate-fadeIn shrink-0">
          <div className="flex-1">
            <label className="block text-xs font-bold text-slate-600 mb-1">Link udostępniania Arkusza Google ze zleceniami:</label>
            <input type="url" value={sheetUrl} onChange={e => setSheetUrl(e.target.value)} className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:outline-none focus:border-[#58b347]" placeholder="https://docs.google.com/spreadsheets/d/..." />
          </div>
          <button onClick={() => { setIsSettingsOpen(false); handleScanSheet(); }} className="bg-[#58b347] text-white font-bold px-4 py-2 rounded text-xs mt-5 hover:bg-[#499b3a]">Zapisz i Skanuj</button>
        </div>
      )}

      {/* GŁÓWNY WIDOK */}
      <div className="max-w-[1600px] w-full mx-auto flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-400 font-medium">Synchronizacja bazy...</div>
        ) : (
          <>
            {viewMode === 'kanban' && (
              <div className="flex gap-4 h-full overflow-x-auto pb-4 px-1 snap-x scrollbar-thin scrollbar-thumb-slate-300">
                {kanbanColumns.map((tech) => {
                  const techTickets = sortedAndFilteredTickets.filter(t => tech ? t.technician_id === tech.id : t.technician_id === null);
                  return (
                    <div 
                      key={tech ? tech.id : 'unassigned'} 
                      className={`min-w-[280px] max-w-[280px] bg-slate-100/40 border border-slate-200 rounded-2xl flex flex-col snap-center ${!tech ? 'bg-orange-50/20 border-orange-100' : ''}`}
                      onDragOver={onDragOver}
                      onDrop={(e) => onDrop(e, tech ? tech.id : null)}
                    >
                      <div className={`p-3.5 border-b border-slate-200 flex justify-between items-center ${!tech ? 'bg-orange-100/40 rounded-t-2xl' : 'bg-slate-50 rounded-t-2xl'}`}>
                        <div>
                          <h3 className="font-bold text-slate-700 text-xs truncate leading-none">{tech ? tech.name : '🚨 Nierozdzielone strefą'}</h3>
                          {tech && <span className="text-[9px] text-slate-400 font-mono mt-1 block">{tech.car_plate || 'Brak pojazdu'}</span>}
                        </div>
                        <span className="bg-white border text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">{techTickets.length}</span>
                      </div>
                      <div className="p-3 flex-1 overflow-y-auto space-y-3 scrollbar-hide bg-white/40">
                        {techTickets.map(t => <TicketCard key={t.id} t={t} />)}
                        {techTickets.length === 0 && <div className="text-center text-xs text-slate-400 py-12 italic border-2 border-dashed border-slate-200 rounded-xl bg-white/50">Brak zadań w toku</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {viewMode === 'list' && (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase sticky top-0 z-10">
                    <tr>
                      <th className="py-3 px-4">Kod</th>
                      <th className="py-3 px-4">Typ akcji</th>
                      <th className="py-3 px-4">Ładowarka / Klient</th>
                      <th className="py-3 px-4">Opiekun strefy</th>
                      <th className="py-3 px-4">Czas SLA (Priorytet)</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-center">Obsługa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {sortedAndFilteredTickets.map(t => {
                      const sla = getSlaInfo(t.created_at, t.station_id, t.status);
                      const station = stations.find(s => s.id === t.station_id);
                      return (
                        <tr key={t.id} className="hover:bg-slate-50/50">
                          <td className="py-3 px-4 font-mono font-bold text-slate-400">{t.ticket_code}</td>
                          <td className="py-3 px-4 font-bold">{t.ticket_type}</td>
                          <td className="py-3 px-4"><div className="font-bold text-slate-800">{station?.name}</div><div className="text-[10px] text-slate-500">{station?.client}</div></td>
                          <td className="py-3 px-4 font-medium text-slate-600">{getTechName(t.technician_id)}</td>
                          <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded border font-bold text-[10px] ${sla.style}`}>{sla.label}</span></td>
                          <td className="py-3 px-4 font-bold uppercase text-[10px]">{t.status}</td>
                          <td className="py-3 px-4 text-center">
                            <button onClick={() => { setActiveTicket(t); setClosingForm({ status: t.status, resolution_notes: t.resolution_notes || '', part_id: '', part_qty: 1, consumePart: false }); }} className="bg-white border border-slate-200 hover:border-[#58b347] text-slate-700 hover:text-[#58b347] px-3 py-1.5 rounded font-medium shadow-sm transition-colors text-[11px]">Zarządzaj</button>
                          </td>
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

      {/* MODAL: TWORZENIE RĘCZNEGO ZGŁOSZENIA (Awaryjne) */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 animate-fadeIn">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><IconAlert /> Dodaj zlecenie systemowe</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleCreateManualTicket} className="p-6 space-y-5 text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1.5">Wybierz stację ładowania</label>
                <select required value={newTicket.station_id} onChange={e => handleStationChange(e.target.value)} className="w-full border-2 border-slate-200 rounded-lg p-3 bg-slate-50 focus:bg-white focus:border-[#58b347] focus:ring-4 focus:ring-[#58b347]/20 transition-all outline-none font-medium">
                  <option value="">-- Wyszukaj i wybierz --</option>
                  {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.city || 'Brak miasta'})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Typ usterki</label>
                  <select value={newTicket.ticket_type} onChange={e => setNewTicket({...newTicket, ticket_type: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 bg-white focus:border-[#58b347] outline-none">
                    <option>Awaria</option><option>Przegląd</option><option>Uruchomienie</option><option>Zlecenie jakościowe</option><option>Naprawa odpłatna</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Priorytet SLA</label>
                  <select value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2.5 bg-white font-bold text-slate-800 focus:border-[#58b347] outline-none">
                    <option>Niski</option><option>Normalny</option><option>Wysoki</option><option className="text-red-600">Krytyczny</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <label className="block font-bold text-slate-700 flex justify-between items-center">
                  Przypisanie technika (Dispatch)
                  {isAutoAssignedFromZone && (
                    <span className="text-[#58b347] bg-green-100 text-[10px] px-2 py-0.5 rounded font-black tracking-wide border border-green-200">✓ AUTO-PRZYPISANIE ZE STREFY</span>
                  )}
                </label>
                
                {/* WIDGET ASYSTENTA AI */}
                {newTicket.station_id && getClosestTechnicianSuggestion(newTicket.station_id) && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex gap-3 items-start animate-fadeIn">
                    <div className="text-lg mt-0.5">💡</div>
                    <div>
                      <strong className="block mb-0.5">Sugestia Dyspozytora AI:</strong>
                      Zaraz obok jest <strong>{getClosestTechnicianSuggestion(newTicket.station_id)?.technician}</strong>. 
                      Aktualnie obsługuje zgłoszenie na stacji <em>{getClosestTechnicianSuggestion(newTicket.station_id)?.stationName}</em> (ok. {getClosestTechnicianSuggestion(newTicket.station_id)?.distance} km).
                      <button type="button" onClick={() => setNewTicket({...newTicket, technician_id: getClosestTechnicianSuggestion(newTicket.station_id)!.technicianId!})} className="block mt-1.5 font-bold text-blue-600 hover:underline">Przypisz do niego zadanie</button>
                    </div>
                  </div>
                )}

                <select value={newTicket.technician_id} onChange={e => setNewTicket({...newTicket, technician_id: e.target.value})} className={`w-full border rounded-lg p-2.5 outline-none transition-colors ${isAutoAssignedFromZone ? 'border-[#58b347] bg-green-50 focus:border-[#58b347]' : 'border-slate-300 bg-white focus:border-blue-500'}`}>
                  <option value="">-- Zostaw w puli nieprzypisanych (Kanban) --</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name} {t.car_plate ? `[${t.car_plate}]` : ''}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Uwagi dla serwisu w terenie</label>
                <textarea rows={3} value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})} className="w-full border border-slate-200 rounded-lg p-3 focus:border-[#58b347] outline-none" placeholder="Co zgłosił klient? Jakie części mogą być potrzebne?" />
              </div>

              <div className="flex gap-3 pt-3">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="flex-1 bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors">Odrzuć</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-bold py-3 rounded-xl hover:bg-[#499b3a] shadow-lg shadow-green-600/30 transition-all">Utwórz zadanie</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ZARZĄDZANIE / ZAMYKANIE ZGŁOSZENIA */}
      {activeTicket && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-slate-800 px-6 py-4 flex justify-between items-center text-white">
              <div>
                <h3 className="font-bold text-sm">{activeTicket.ticket_code} • {activeTicket.ticket_type}</h3>
                <p className="text-xs text-slate-400 mt-0.5">{getStationName(activeTicket.station_id)}</p>
              </div>
              <button onClick={() => setActiveTicket(null)} className="text-slate-400 hover:text-white transition-colors">✕</button>
            </div>
            
            <form onSubmit={handleUpdateTicketStatus} className="p-6 space-y-5 text-sm">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-700 italic text-xs">
                <strong className="block text-[10px] uppercase font-bold text-slate-400 not-italic mb-1">Opis problemu:</strong>
                {activeTicket.description || 'Brak dodatkowego opisu usterki.'}
              </div>

              {activeTicket.status !== 'Zakończone' ? (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5">Zmień etap zadania</label>
                    <select value={closingForm.status} onChange={e => setClosingForm({...closingForm, status: e.target.value})} className="w-full border-2 border-slate-200 rounded-lg p-3 bg-white font-bold text-slate-800 outline-none focus:border-[#58b347]">
                      <option value="Nowe">Nowe (Oczekuje na akcję)</option>
                      <option value="W toku">W toku (Technik działa)</option>
                      <option value="Oczekuje na części">Oczekuje na części (Zdiagnozowano)</option>
                      <option value="Zakończone">Zakończone (Naprawiono)</option>
                    </select>
                  </div>

                  {closingForm.status === 'Zakończone' && activeTicket.technician_id && (
                    <div className="bg-orange-50/80 border border-orange-200 p-4 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" id="consumePart" checked={closingForm.consumePart} onChange={e => setClosingForm({...closingForm, consumePart: e.target.checked})} className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4 cursor-pointer" />
                        <label htmlFor="consumePart" className="font-bold text-orange-800 cursor-pointer select-none">Zużyto części z auta technika</label>
                      </div>
                      
                      {closingForm.consumePart && (
                        <div className="grid grid-cols-3 gap-3 pt-2">
                          <div className="col-span-2">
                            <select required={closingForm.consumePart} value={closingForm.part_id} onChange={e => setClosingForm({...closingForm, part_id: e.target.value})} className="w-full border border-orange-300 rounded-lg p-2 bg-white text-xs outline-none">
                              <option value="">Wybierz z bagażnika...</option>
                              {techInventory.map(item => {
                                const p = getPartDetails(item.part_id);
                                return <option key={item.id} value={item.part_id}>{p?.name} (Dostępne: {item.quantity})</option>
                              })}
                            </select>
                          </div>
                          <div>
                            <input type="number" min="1" required={closingForm.consumePart} value={closingForm.part_qty} onChange={e => setClosingForm({...closingForm, part_qty: parseInt(e.target.value) || 1})} className="w-full border border-orange-300 rounded-lg p-2 text-center font-bold text-xs outline-none" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block font-medium text-slate-600 mb-1.5">Raport zamknięcia</label>
                    <textarea required={closingForm.status === 'Zakończone'} rows={3} value={closingForm.resolution_notes} onChange={e => setClosingForm({...closingForm, resolution_notes: e.target.value})} className="w-full border border-slate-200 rounded-lg p-3 outline-none focus:border-[#58b347]" placeholder="Wpisz krótki raport końcowy..." />
                  </div>

                  <div className="flex gap-3 pt-3">
                    <button type="submit" className="w-full bg-[#58b347] text-white font-bold py-3 rounded-xl hover:bg-[#499b3a] shadow-lg flex items-center justify-center gap-2"><IconCheck /> Zapisz i zaktualizuj stację</button>
                  </div>
                </>
              ) : (
                <div className="space-y-5">
                  <div className="bg-green-50 p-4 rounded-xl border border-green-200">
                    <span className="text-green-800 block font-black mb-1">✅ ZAKOŃCZONE</span>
                    <span className="text-xs text-green-700">Naprawił: {getTechName(activeTicket.technician_id)}</span>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1.5">Raport technika:</label>
                    <div className="bg-slate-50 border border-slate-200 text-slate-800 p-4 rounded-xl font-medium whitespace-pre-wrap text-xs leading-relaxed">{activeTicket.resolution_notes || 'Brak raportu.'}</div>
                  </div>
                  <button type="button" onClick={() => setActiveTicket(null)} className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200">Zamknij podgląd</button>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
}