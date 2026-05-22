'use client';
import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../app/supabase';

// --- TYPY ---
type CalendarEvent = { id: string; start_time: string; end_time: string; title: string; event_type: string; technician_id: string | null; ticket_id: string | null; };
type Ticket = { id: string; ticket_code: string; station_id: string; technician_id: string | null; ticket_type: string; status: string; priority: string; created_at: string; };
type Station = { id: string; name: string; city: string | null; client: string | null; };
type Technician = { id: string; name: string; color?: string; };
type Client = { id: string; name: string; sla_hours: number; };

// --- IKONY ---
const IconChevronLeft = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>;
const IconChevronRight = () => <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>;
const IconCalendar = () => <svg className="w-4 h-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
const IconTrash = () => <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconFilter = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>;
const IconSearch = () => <svg className="w-4 h-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>;

const WEEKDAYS = ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'];
const MONTHS = ['Styczeń', 'Luty', 'Marzec', 'Kwiecień', 'Maj', 'Czerwiec', 'Lipiec', 'Sierpień', 'Wrzesień', 'Październik', 'Listopad', 'Grudzień'];

// Pełna doba od 00:00 do 24:00 w skokach co pół godziny (łącznie 48 slotów)
const GENERATED_SLOTS = Array.from({ length: 49 }, (_, i) => i * 0.5);

const addDays = (dateStr: string | Date, days: number) => {
  const d = new Date(dateStr); d.setDate(d.getDate() + days); return d;
};
const getMonday = (d: Date) => {
  const date = new Date(d); const day = date.getDay(); const diff = date.getDate() - day + (day === 0 ? -6 : 1); return new Date(date.setDate(diff));
};

export default function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date()); 
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedTechId, setSelectedTechId] = useState<string>('ALL');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [sortMode, setSortMode] = useState<'SLA' | 'NEW'>('SLA');

  const [isLoading, setIsLoading] = useState(true);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [dragState, setDragState] = useState<{ type: 'NEW' | 'MOVE' | 'RESIZE', payloadId: string } | null>(null);

  // Referencja do kontenera z przewijaniem, żeby ustawić auto-scroll na 07:00
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    setIsLoading(true);
    const [eventsRes, ticketsRes, statRes, techRes, clientsRes] = await Promise.all([
      supabase.from('calendar_events').select('*'),
      supabase.from('tickets').select('*').neq('status', 'Zakończone'),
      supabase.from('stations').select('id, name, city, client'),
      supabase.from('technicians').select('id, name, color'),
      supabase.from('clients').select('id, name, sla_hours')
    ]);

    if (eventsRes.data) setEvents(eventsRes.data);
    if (ticketsRes.data) setTickets(ticketsRes.data);
    if (statRes.data) setStations(statRes.data);
    if (techRes.data) setTechnicians(techRes.data);
    if (clientsRes.data) setClients(clientsRes.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // AUTO-SCROLL do 07:00 rano po załadowaniu kalendarza
  useEffect(() => {
    if (viewMode !== 'month' && scrollContainerRef.current) {
      // 7 godzin * 80px (wysokość jednej godziny) = 560px
      setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 7 * 80;
        }
      }, 50); // Minimalne opóźnienie dla pewności, że DOM wyrenderował siatkę
    }
  }, [viewMode, isLoading]);

  // --- INTERAKCJE DRAG / DROP / RESIZE ---
  const handleDragStart = (e: React.DragEvent, type: 'NEW' | 'MOVE' | 'RESIZE', id: string) => {
    e.dataTransfer.effectAllowed = 'move';
    setDragState({ type, payloadId: id });
  };

  const handleDrop = async (e: React.DragEvent, targetDate: Date, hourValue: number) => {
    e.preventDefault();
    if (!dragState) return;

    const startTime = new Date(targetDate);
    const mins = hourValue % 1 === 0 ? 0 : 30;
    startTime.setHours(Math.floor(hourValue), mins, 0, 0);

    if (dragState.type === 'NEW') {
      const ticket = tickets.find(t => t.id === dragState.payloadId);
      if (!ticket) return;
      const station = stations.find(s => s.id === ticket.station_id);
      
      const endTime = new Date(startTime.getTime() + 2 * 3600000); // Domyślnie 2h

      const newEvent = {
        title: `${ticket.ticket_code} - ${station?.name || 'Stacja'}`,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        event_type: ticket.ticket_type === 'Awaria' ? 'repair' : 'inspection',
        technician_id: selectedTechId !== 'ALL' ? selectedTechId : ticket.technician_id,
        ticket_id: ticket.id
      };

      const { error } = await supabase.from('calendar_events').insert([newEvent]);
      if (error) alert(error.message);
      else fetchData();

    } else if (dragState.type === 'MOVE') {
      const event = events.find(ev => ev.id === dragState.payloadId);
      if (!event) return;

      const duration = new Date(event.end_time).getTime() - new Date(event.start_time).getTime();
      const newEndTime = new Date(startTime.getTime() + duration);

      setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, start_time: startTime.toISOString(), end_time: newEndTime.toISOString() } : ev));
      await supabase.from('calendar_events').update({ start_time: startTime.toISOString(), end_time: newEndTime.toISOString() }).eq('id', event.id);

    } else if (dragState.type === 'RESIZE') {
      const event = events.find(ev => ev.id === dragState.payloadId);
      if (!event) return;

      const proposedEndTime = new Date(startTime.getTime() + 30 * 60000);
      const currentStartTime = new Date(event.start_time);
      const durationMs = proposedEndTime.getTime() - currentStartTime.getTime();

      if (durationMs < 30 * 60000) { alert('Minimalny czas trwania usterki/przeglądu to 30 minut.'); setDragState(null); return; }
      if (durationMs > 24 * 3600000) { alert('Maksymalny czas trwania pojedynczego slotu w kalendarzu wynosi 24 godziny.'); setDragState(null); return; }

      setEvents(prev => prev.map(ev => ev.id === event.id ? { ...ev, end_time: proposedEndTime.toISOString() } : ev));
      await supabase.from('calendar_events').update({ end_time: proposedEndTime.toISOString() }).eq('id', event.id);
    }
    setDragState(null);
  };

  const handleDeleteEvent = async (e: React.MouseEvent, eventId: string) => {
    e.stopPropagation();
    if (!confirm('Usunąć planowaną wizytę z kalendarza? Zgłoszenie pozostanie bezpieczne na liście do ponownego zaplanowania.')) return;
    setEvents(prev => prev.filter(ev => ev.id !== eventId));
    await supabase.from('calendar_events').delete().eq('id', eventId);
  };

  const getSlaHoursLeft = (createdAt: string, stationId: string) => {
    const station = stations.find(s => s.id === stationId);
    const client = clients.find(c => c.name === station?.client);
    const slaHours = client?.sla_hours || 48;
    return ((new Date(createdAt).getTime() + (slaHours * 3600000)) - Date.now()) / 3600000;
  };

  const filteredTickets = useMemo(() => {
    let t = tickets.filter(tick => !events.some(e => e.ticket_id === tick.id));
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      t = t.filter(tick => {
        const s = stations.find(st => st.id === tick.station_id);
        return tick.ticket_code.toLowerCase().includes(q) || s?.name.toLowerCase().includes(q) || s?.city?.toLowerCase().includes(q) || s?.client?.toLowerCase().includes(q);
      });
    }
    return t.sort((a, b) => {
      if (sortMode === 'SLA') return getSlaHoursLeft(a.created_at, a.station_id) - getSlaHoursLeft(b.created_at, b.station_id);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tickets, events, searchQuery, sortMode, stations]);

  const daysToRender = useMemo(() => {
    if (viewMode === 'day') return [currentDate];
    if (viewMode === 'week') {
      const mon = getMonday(currentDate);
      return Array.from({ length: 7 }, (_, i) => addDays(mon, i));
    }
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const startOffset = firstDay === 0 ? 6 : firstDay - 1;
    const startCalendarDate = addDays(new Date(year, month, 1), -startOffset);
    return Array.from({ length: 42 }, (_, i) => addDays(startCalendarDate, i));
  }, [currentDate, viewMode]);

  const goPrev = () => setCurrentDate(addDays(currentDate, viewMode === 'day' ? -1 : viewMode === 'week' ? -7 : -30));
  const goNext = () => setCurrentDate(addDays(currentDate, viewMode === 'day' ? 1 : viewMode === 'week' ? 7 : 30));
  const goToday = () => setCurrentDate(new Date());

  const getTechColor = (id: string | null) => technicians.find(t => t.id === id)?.color || '#94a3b8';

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-50 z-40 p-6 flex gap-6 h-full overflow-hidden">
      
      {/* PANEL LEWY: BACKLOG ZGŁOSZEŃ */}
      <div className="w-80 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col shrink-0 overflow-hidden">
        <div className="bg-slate-800 p-4 text-white">
          <h2 className="font-bold flex items-center gap-2"><IconFilter /> Filtr Zgłoszeń</h2>
          <p className="text-xs text-slate-400 mt-1">Lista zadań oczekujących na wyznaczenie terminu.</p>
        </div>
        <div className="p-3 border-b border-slate-200 space-y-3 bg-slate-50">
          <div className="relative">
            <div className="absolute left-3 top-2.5"><IconSearch /></div>
            <input type="text" placeholder="Szukaj stacji (np. QP-...) lub miasta" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:border-[#58b347]" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setSortMode('SLA')} className={`flex-1 py-1.5 text-xs font-bold rounded-md border ${sortMode === 'SLA' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-white text-slate-600 border-slate-200'}`}>⚠️ Pilne wg SLA</button>
            <button onClick={() => setSortMode('NEW')} className={`flex-1 py-1.5 text-xs font-bold rounded-md border ${sortMode === 'NEW' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-white text-slate-600 border-slate-200'}`}>🆕 Najnowsze</button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-slate-50/50 scrollbar-hide">
          {filteredTickets.map(ticket => {
            const station = stations.find(s => s.id === ticket.station_id);
            const tech = technicians.find(t => t.id === ticket.technician_id);
            const slaLeft = Math.round(getSlaHoursLeft(ticket.created_at, ticket.station_id));
            return (
              <div key={ticket.id} draggable onDragStart={(e) => handleDragStart(e, 'NEW', ticket.id)} className="bg-white border border-slate-200 p-3 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:border-[#58b347] hover:shadow-md transition-all">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">{ticket.ticket_code}</span>
                  <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${slaLeft < 12 ? 'bg-red-50 text-red-600 border-red-200 animate-pulse' : 'bg-green-50 text-green-700 border-green-200'}`}>SLA: {slaLeft}h</span>
                </div>
                <h4 className="font-bold text-slate-800 text-xs leading-tight">{station?.name || 'Stacja'}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5 mb-2 truncate">{station?.city || 'Nieznane miasto'}</p>
                <div className="text-[10px] text-slate-500 font-medium bg-slate-50 p-1.5 rounded border border-slate-100 flex justify-between">
                  <span>Opiekun: <strong>{tech?.name || 'Brak'}</strong></span>
                  <span className={`font-bold uppercase ${ticket.ticket_type === 'Awaria' ? 'text-red-500' : 'text-blue-500'}`}>{ticket.ticket_type}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* PANEL PRAWY: HARMONOGRAM */}
      <div className="flex-1 flex flex-col min-w-0 bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden relative">
        
        {/* Pasek kontrolny */}
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 text-xl">👨‍🔧</div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Filtruj zespół:</label>
              <select value={selectedTechId} onChange={e => setSelectedTechId(e.target.value)} className="text-sm font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer">
                <option value="ALL">Wszyscy technicy mobilni</option>
                {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button onClick={() => setViewMode('day')} className={`px-3 py-1.5 text-xs font-bold rounded ${viewMode === 'day' ? 'bg-white shadow-sm text-[#58b347]' : 'text-slate-500'}`}>Dzień</button>
              <button onClick={() => setViewMode('week')} className={`px-3 py-1.5 text-xs font-bold rounded ${viewMode === 'week' ? 'bg-white shadow-sm text-[#58b347]' : 'text-slate-500'}`}>Tydzień</button>
              <button onClick={() => setViewMode('month')} className={`px-3 py-1.5 text-xs font-bold rounded ${viewMode === 'month' ? 'bg-white shadow-sm text-[#58b347]' : 'text-slate-500'}`}>Miesiąc</button>
            </div>
            <h2 className="text-lg font-black text-slate-800 w-56 text-center capitalize">
              {currentDate.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric', day: viewMode === 'day' ? 'numeric' : undefined })}
            </h2>
            <div className="flex items-center bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
              <button onClick={goPrev} className="p-2 hover:bg-slate-50 text-slate-600 transition-colors border-r border-slate-200"><IconChevronLeft /></button>
              <button onClick={goToday} className="px-4 py-2 font-bold text-xs text-slate-700 hover:bg-slate-50 transition-colors">DZIŚ</button>
              <button onClick={goNext} className="p-2 hover:bg-slate-50 text-slate-600 transition-colors border-l border-slate-200"><IconChevronRight /></button>
            </div>
          </div>
        </div>

        {/* --- STRUKTURA SIATKI W ZALEŻNOŚCI OD WIDOKU --- */}
        <div className="flex-1 overflow-y-auto flex bg-slate-50 relative" ref={scrollContainerRef}>
          
          {viewMode === 'month' ? (
            /* WIDOK: PEŁNY MIESIĄC (SIATKA DNI 7x6) */
            <div className="w-full h-full flex flex-col min-h-[600px]">
              <div className="grid grid-cols-7 bg-slate-100 border-b border-slate-200 shrink-0 text-center py-2 text-[10px] font-black text-slate-500 uppercase sticky top-0 z-20">
                {WEEKDAYS.map(d => <div key={d}>{d}</div>)}
              </div>
              <div className="flex-1 grid grid-cols-7 grid-rows-6 text-xs bg-white">
                {daysToRender.map((dateObj, idx) => {
                  const dateStr = dateObj.toISOString().split('T')[0];
                  const isCurrentMonth = dateObj.getMonth() === currentDate.getMonth();
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  
                  const dayEvents = events.filter(e => {
                    if (!e.start_time) return false;
                    const matchesDate = e.start_time.split('T')[0] === dateStr;
                    const matchesTech = selectedTechId === 'ALL' || e.technician_id === selectedTechId;
                    return matchesDate && matchesTech;
                  });

                  return (
                    <div key={idx} onDragOver={e => e.preventDefault()} onDrop={e => handleDrop(e, dateObj, 8)} className={`border-r border-b border-slate-100 p-1 flex flex-col min-h-[90px] ${!isCurrentMonth ? 'bg-slate-50/50 opacity-40' : ''}`}>
                      <div className="flex justify-end p-1">
                        <span className={`w-5 h-5 flex items-center justify-center font-bold text-[11px] rounded-full ${isToday ? 'bg-[#58b347] text-white shadow' : 'text-slate-700'}`}>{dateObj.getDate()}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1 max-h-[75px] scrollbar-hide">
                        {dayEvents.map(e => (
                          <div key={e.id} onClick={() => alert(`${e.title}\nCzas: ${new Date(e.start_time).toLocaleTimeString()} - ${new Date(e.end_time).toLocaleTimeString()}`)} className="text-[9px] px-1 py-0.5 rounded shadow-sm border truncate font-bold text-slate-800 cursor-pointer hover:scale-[1.02] transition-transform" style={{ backgroundColor: `${getTechColor(e.technician_id)}20`, borderColor: getTechColor(e.technician_id) }}>
                            {e.title.split('-')[0]}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            /* WIDOK: DZIEŃ / TYDEŃ (PIONOWA SIATKA Z LINIAMI 30 MINUT) */
            <>
              {/* Oś Czasu (Y) - Skala 00:00 - 24:00 */}
              <div className="w-16 shrink-0 border-r border-slate-200 bg-white sticky left-0 z-20">
                <div className="h-10 border-b border-slate-200 sticky top-0 bg-white z-30"></div>
                {GENERATED_SLOTS.slice(0, -1).map(slot => {
                  const isWholeHour = slot % 1 === 0;
                  return (
                    <div key={slot} className={`h-10 border-b border-slate-100 flex items-start justify-end pr-2 pt-1 text-[10px] font-bold text-slate-400 ${isWholeHour ? 'bg-slate-50/30' : 'opacity-40 font-normal'}`}>
                      {isWholeHour ? `${String(slot).padStart(2, '0')}:00` : `${String(Math.floor(slot)).padStart(2, '0')}:30`}
                    </div>
                  );
                })}
              </div>

              {/* Siatka Kolumnowa */}
              <div className="flex-1 flex">
                {daysToRender.map((dateObj, dIdx) => {
                  const dateStr = dateObj.toISOString().split('T')[0];
                  const isToday = dateStr === new Date().toISOString().split('T')[0];
                  
                  const dayEvents = events.filter(e => {
                    if (!e.start_time) return false;
                    const matchesDate = e.start_time.split('T')[0] === dateStr;
                    const matchesTech = selectedTechId === 'ALL' || e.technician_id === selectedTechId;
                    return matchesDate && matchesTech;
                  });

                  return (
                    <div key={dIdx} className="flex-1 border-r border-slate-200 min-w-[130px] relative">
                      
                      {/* Nagłówek Dnia */}
                      <div className={`h-10 border-b border-slate-200 flex flex-col items-center justify-center sticky top-0 z-30 ${isToday ? 'bg-green-50' : 'bg-white'}`}>
                        <span className={`text-[9px] font-bold uppercase ${isToday ? 'text-[#58b347]' : 'text-slate-400'}`}>{WEEKDAYS[dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1].slice(0, 3)}</span>
                        <span className={`text-xs font-black ${isToday ? 'text-[#58b347]' : 'text-slate-800'}`}>{dateObj.getDate()}</span>
                      </div>

                      {/* Dropzony i Linie Pomocnicze (Półgodzinne od 00:00 do 24:00) */}
                      <div className="relative">
                        {GENERATED_SLOTS.slice(0, -1).map(slot => {
                          const isWholeHour = slot % 1 === 0;
                          return (
                            <div 
                              key={slot} 
                              className={`h-10 border-b transition-colors hover:bg-green-50/40 ${isWholeHour ? 'border-slate-200 border-solid' : 'border-slate-200 border-dashed'}`}
                              onDragOver={e => e.preventDefault()}
                              onDrop={e => handleDrop(e, dateObj, slot)}
                            />
                          );
                        })}

                        {/* Rendering Kafelków Zadań */}
                        {dayEvents.map(event => {
                          const sDate = new Date(event.start_time);
                          const eDate = new Date(event.end_time);
                          
                          // Matematyka pikseli: blok 30 minut (slot) = 40px wysokości, czyli 1 godzina = 80px. Start od 00:00.
                          const startHour = sDate.getHours() + (sDate.getMinutes() / 60);
                          const durationHours = (eDate.getTime() - sDate.getTime()) / 3600000;
                          
                          const topOffset = startHour * 80;
                          const height = durationHours * 80;
                          
                          const techColor = getTechColor(event.technician_id);

                          return (
                            <div 
                              key={event.id}
                              draggable
                              onDragStart={e => handleDragStart(e, 'MOVE', event.id)}
                              className="absolute left-1 right-2 rounded-xl border shadow-sm p-2 flex flex-col justify-between group hover:z-30 transition-all hover:shadow-md bg-white"
                              style={{ 
                                top: `${topOffset}px`, 
                                height: `${height}px`,
                                borderColor: techColor,
                                borderLeftWidth: '5px',
                                boxShadow: `0 4px 6px -1px ${techColor}20`
                              }}
                            >
                              <div>
                                <div className="flex justify-between items-start">
                                  <div className="text-[10px] font-black text-slate-800 leading-tight truncate pr-4">{event.title}</div>
                                  <button onClick={e => handleDeleteEvent(e, event.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-slate-100 rounded p-0.5 transition-opacity">
                                    <IconTrash />
                                  </button>
                                </div>
                                <div className="text-[9px] text-slate-400 font-mono mt-0.5">
                                  {sDate.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})} - {eDate.toLocaleTimeString('pl-PL',{hour:'2-digit',minute:'2-digit'})}
                                </div>
                              </div>

                              {/* WYDAJNY UCHWYT RESIZE (Dolna krawędź kafelka) */}
                              <div 
                                draggable
                                onDragStart={e => { e.stopPropagation(); handleDragStart(e, 'RESIZE', event.id); }}
                                className="h-2 bg-slate-200/40 hover:bg-slate-300 border-t border-slate-200 cursor-row-resize rounded-b-lg flex items-center justify-center -mx-2 -mb-2 transition-colors"
                                title="Przeciągnij by wydłużyć/skrócić"
                              >
                                <div className="w-6 h-0.5 bg-slate-400 rounded-full"></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                    </div>
                  );
                })}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}