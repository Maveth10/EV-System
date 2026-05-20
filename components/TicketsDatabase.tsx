import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../app/supabase';

type Ticket = { id: string; station_id: string; technician_id: string | null; ticket_type: string; status: string; priority: string; description: string | null; resolution_notes: string | null; created_at: string; };
type Station = { id: string; name: string; city: string | null; technician: string | null; };
type Technician = { id: string; name: string; car_plate?: string | null; };
type Part = { id: string; sku: string; name: string; unit: string; };
type TechInventory = { id: string; part_id: string; quantity: number; };

const IconAlert = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/></svg>;
const IconCheck = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconTools = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m14.7 6.3-1.17 1.17a3 3 0 0 0-1.63 2.1l-.48 2.39a.4.4 0 0 0 .48.48l2.39-.48a3 3 0 0 0 2.1-1.63L17.7 9.2"/><path d="M10.3 14.7 5 20l-1-1 5.3-5.3"/><path d="m16 4 3 3"/><path d="M14 3h5v5"/><path d="M4 14h5v5"/></svg>;

export default function TicketsDatabase() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [parts, setParts] = useState<Part[]>([]);
  const [techInventory, setTechInventory] = useState<TechInventory[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ACTIVE');

  // Modale
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [activeTicket, setActiveTicket] = useState<Ticket | null>(null);

  // Formularze
  const [newTicket, setNewTicket] = useState({ station_id: '', ticket_type: 'Awaria', priority: 'Normalny', description: '', technician_id: '' });
  const [closingForm, setClosingForm] = useState({ status: 'W toku', resolution_notes: '', part_id: '', part_qty: 1, consumePart: false });

  const fetchData = async () => {
    setIsLoading(true);
    const [tRes, sRes, techRes, pRes] = await Promise.all([
      supabase.from('tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('stations').select('id, name, city, technician').order('name'),
      supabase.from('technicians').select('id, name, car_plate').order('name'),
      supabase.from('parts').select('id, sku, name, unit')
    ]);

    if (tRes.data) setTickets(tRes.data);
    if (sRes.data) setStations(sRes.data);
    if (techRes.data) setTechnicians(techRes.data as Technician[]);
    if (pRes.data) setParts(pRes.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Gdy wybieramy stację w nowym zgłoszeniu, automatycznie sugerujemy opiekuna strefy!
  const handleStationChange = (stationId: string) => {
    const station = stations.find(s => s.id === stationId);
    let suggestedTechId = '';
    if (station && station.technician) {
      const tech = technicians.find(t => t.name === station.technician);
      if (tech) suggestedTechId = tech.id;
    }
    setNewTicket({ ...newTicket, station_id: stationId, technician_id: suggestedTechId });
  };

  // Ładowanie car-stocku wybranego technika przy edycji/zamykaniu zgłoszenia
  useEffect(() => {
    if (activeTicket && activeTicket.technician_id) {
      supabase.from('technician_inventory')
        .select('*')
        .eq('technician_id', activeTicket.technician_id)
        .gt('quantity', 0)
        .then(({ data }) => { if (data) setTechInventory(data); });
    }
  }, [activeTicket]);

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      station_id: newTicket.station_id,
      ticket_type: newTicket.ticket_type,
      priority: newTicket.priority,
      description: newTicket.description || null,
      technician_id: newTicket.technician_id || null,
      status: 'Nowe'
    };

    const { error } = await supabase.from('tickets').insert([payload]);
    if (error) alert(error.message);
    else { setIsNewModalOpen(false); setNewTicket({ station_id: '', ticket_type: 'Awaria', priority: 'Normalny', description: '', technician_id: '' }); fetchData(); }
  };

  const handleUpdateTicketStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket) return;

    // JEŚLI ZAMYKAMY I ROZLICZAMY CZĘŚCI
    if (closingForm.status === 'Zakończone' && closingForm.consumePart && closingForm.part_id) {
      const stockItem = techInventory.find(i => i.part_id === closingForm.part_id);
      if (!stockItem || stockItem.quantity < closingForm.part_qty) {
        alert("Błąd: Technik nie ma tylu części na aucie!");
        return;
      }

      // A: Zdejmij część z auta technika
      await supabase.from('technician_inventory')
        .update({ quantity: stockItem.quantity - closingForm.part_qty })
        .eq('id', stockItem.id);

      // B: Zapisz użycie części w logach magazynu
      await supabase.from('inventory_logs').insert([{
        part_id: closingForm.part_id,
        technician_id: activeTicket.technician_id,
        operation_type: 'WYDANIE', // jako zużycie w teren
        quantity: closingForm.part_qty,
        notes: `Zużyto automatycznie przy zamknięciu zgłoszenia`
      }]);
    }

    // Aktualizacja samego zgłoszenia
    const updatePayload: any = {
      status: closingForm.status,
      resolution_notes: closingForm.resolution_notes || null
    };
    if (closingForm.status === 'Zakończone') updatePayload.closed_at = new Date().toISOString();

    const { error } = await supabase.from('tickets').update(updatePayload).eq('id', activeTicket.id);
    if (error) alert(error.message);
    else { setActiveTicket(null); fetchData(); }
  };

  // Filtrowanie listy
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      if (statusFilter === 'ACTIVE') return t.status !== 'Zakończone';
      if (statusFilter === 'CLOSED') return t.status === 'Zakończone';
      return true;
    });
  }, [tickets, statusFilter]);

  const getStationName = (id: string) => stations.find(s => s.id === id)?.name || 'Nieznana';
  const getTechName = (id: string | null) => id ? technicians.find(t => t.id === id)?.name || 'Nieprzypisany' : 'Nieprzypisany';
  const getPartDetails = (id: string) => parts.find(p => p.id === id);

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-50 z-40 p-6 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto">
        
        {/* NAGŁÓWEK */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-xl font-bold text-slate-800">Zgłoszenia Serwisowe i Zadania</h1>
            <p className="text-xs text-slate-500 mt-0.5">Łącznie zarejestrowano {tickets.length} zadań FSM.</p>
          </div>
          <div className="flex gap-3 items-center">
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="border border-slate-200 bg-white rounded-lg p-2 text-xs font-semibold text-slate-700 cursor-pointer focus:outline-none"
            >
              <option value="ACTIVE">⚡ Aktywne zgłoszenia</option>
              <option value="CLOSED">✅ Zakończone zadania</option>
              <option value="ALL">📋 Wszystkie wpisy</option>
            </select>
            <button onClick={() => setIsNewModalOpen(true)} className="bg-[#58b347] text-white px-4 py-2.5 rounded-lg text-xs font-medium hover:bg-[#499b3a] shadow-sm transition-colors">+ Nowe zgłoszenie</button>
          </div>
        </div>

        {/* TABELA ZGŁOSZEŃ */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 font-bold text-slate-500 uppercase">
              <tr>
                <th className="py-3 px-4">Typ akcji</th>
                <th className="py-3 px-4">Ładowarka</th>
                <th className="py-3 px-4">Opiekun / Pojazd</th>
                <th className="py-3 px-4">Priorytet</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Data utworzenia</th>
                <th className="py-3 px-4 text-center">Obsługa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">Ładowanie rejestru zgłoszeń...</td></tr> : null}
              {filteredTickets.length === 0 && !isLoading ? <tr><td colSpan={7} className="p-8 text-center text-slate-400">Brak zgłoszeń w tej kategorii.</td></tr> : null}
              
              {filteredTickets.map(t => {
                const isClosed = t.status === 'Zakończone';
                return (
                  <tr key={t.id} className={`hover:bg-slate-50/40 transition-colors ${isClosed ? 'opacity-60 bg-slate-50/20' : ''}`}>
                    <td className="py-3 px-4 font-bold">
                      <span className={`px-2 py-0.5 rounded border ${
                        t.ticket_type === 'Awaria' ? 'bg-red-50 text-red-700 border-red-100' :
                        t.ticket_type === 'Przegląd' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                        t.ticket_type === 'Uruchomienie' ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-slate-50 text-slate-700 border-slate-100'
                      }`}>{t.ticket_type}</span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{getStationName(t.station_id)}</td>
                    <td className="py-3 px-4 font-medium text-slate-600">{getTechName(t.technician_id)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-500">{t.priority}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        t.status === 'Nowe' ? 'bg-slate-100 text-slate-600' :
                        t.status === 'W toku' ? 'bg-blue-100 text-blue-700' :
                        t.status === 'Oczekuje na części' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                      }`}>{t.status}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-400 font-mono">{new Date(t.created_at).toLocaleDateString()} {new Date(t.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                    <td className="py-3 px-4 text-center">
                      <button 
                        onClick={() => { setActiveTicket(t); setClosingForm({ status: t.status, resolution_notes: t.resolution_notes || '', part_id: '', part_qty: 1, consumePart: false }); }}
                        className="bg-slate-50 border border-slate-200 text-slate-700 hover:bg-green-50 hover:text-[#58b347] hover:border-green-200 px-3 py-1.5 rounded transition-all font-medium"
                      >
                        {isClosed ? 'Podgląd' : 'Zarządzaj'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOWE ZGŁOSZENIE (DYSPOZYTOR) */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><IconAlert /> Otwórz zgłoszenie / Przydziel zadanie</h3>
              <button onClick={() => setIsNewModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateTicket} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-600 mb-1">Wybierz stację ładowania</label>
                <select required value={newTicket.station_id} onChange={e => handleStationChange(e.target.value)} className="w-full border border-slate-200 rounded-lg p-2.5 bg-slate-50 font-medium focus:outline-none">
                  <option value="">-- Wybierz ładowarkę z systemu --</option>
                  {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.city || 'Brak miasta'})</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-slate-600 mb-1">Typ zlecenia (Akcja)</label>
                  <select value={newTicket.ticket_type} onChange={e => setNewTicket({...newTicket, ticket_type: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 bg-white">
                    <option>Awaria</option><option>Przegląd</option><option>Uruchomienie</option><option>Zlecenie jakościowe</option><option>Naprawa odpłatna</option>
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-slate-600 mb-1">SLA / Priorytet</label>
                  <select value={newTicket.priority} onChange={e => setNewTicket({...newTicket, priority: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 bg-white font-bold">
                    <option>Niski</option><option>Normalny</option><option>Wysoki</option><option>Krytyczny</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Przypisany Technik mobilny (Sugerowany na podstawie strefy)</label>
                <select value={newTicket.technician_id} onChange={e => setNewTicket({...newTicket, technician_id: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 bg-white">
                  <option value="">-- Brak (Zostaw w puli nieprzypisanych) --</option>
                  {technicians.map(t => <option key={t.id} value={t.id}>{t.name} {t.car_plate ? `[${t.car_plate}]` : ''}</option>)}
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-600 mb-1">Opis usterki / Uwagi dyspozytora</label>
                <textarea rows={3} value={newTicket.description} onChange={e => setNewTicket({...newTicket, description: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none" placeholder="Opisz powód zgłoszenia..." />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsNewModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-200 text-xs">Anuluj</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-medium py-2.5 rounded-lg hover:bg-[#499b3a] text-xs shadow-sm">Utwórz zadanie</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ZARZĄDZANIE / ZAMYKANIE ZGŁOSZENIA (Z AUTOMATEM MAGAZYNOWYM) */}
      {activeTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Zgłoszenie: {activeTicket.ticket_type}</h3>
                <p className="text-[10px] text-slate-400 font-medium mt-0.5">Dla ładowarki: {getStationName(activeTicket.station_id)}</p>
              </div>
              <button onClick={() => setActiveTicket(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleUpdateTicketStatus} className="p-5 space-y-4 text-xs">
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-slate-600 italic">
                <strong className="block text-[10px] uppercase font-bold text-slate-400 not-italic mb-1">Opis pierwotny:</strong>
                {activeTicket.description || 'Brak opisu dodatkowego.'}
              </div>

              {activeTicket.status !== 'Zakończone' ? (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block font-medium text-slate-600 mb-1">Zmień etap zadania</label>
                      <select value={closingForm.status} onChange={e => setClosingForm({...closingForm, status: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 bg-white font-bold">
                        <option value="Nowe">Nowe</option>
                        <option value="W toku">W toku</option>
                        <option value="Oczekuje na części">Oczekuje na części</option>
                        <option value="Zakończone">Zakończone (Naprawiono)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-600 mb-1">Serwisant w terenie</label>
                      <input disabled type="text" value={getTechName(activeTicket.technician_id)} className="w-full border border-slate-100 bg-slate-50 rounded-lg p-2 font-semibold text-slate-500" />
                    </div>
                  </div>

                  {/* KULODPORNY AUTOMAT ROZLICZANIA CAR-STOCKU AUTA */}
                  {closingForm.status === 'Zakończone' && activeTicket.technician_id && (
                    <div className="bg-orange-50/60 border border-orange-100 p-3.5 rounded-xl space-y-3">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id="consumePart" 
                          checked={closingForm.consumePart} 
                          onChange={e => setClosingForm({...closingForm, consumePart: e.target.checked})} 
                          className="rounded text-orange-500 focus:ring-orange-500 w-3.5 h-3.5 cursor-pointer"
                        />
                        <label htmlFor="consumePart" className="font-bold text-orange-800 cursor-pointer select-none">Odpisz użytą część z auta technika</label>
                      </div>
                      
                      {closingForm.consumePart && (
                        <div className="grid grid-cols-3 gap-2 pt-1 animate-fadeIn">
                          <div className="col-span-2">
                            <label className="block text-[10px] font-bold text-orange-700 mb-1">Części na stanie tego pojazdu:</label>
                            <select required={closingForm.consumePart} value={closingForm.part_id} onChange={e => setClosingForm({...closingForm, part_id: e.target.value})} className="w-full border border-orange-200 rounded p-1.5 bg-white text-[11px]">
                              <option value="">-- Wybierz część z bagażnika --</option>
                              {techInventory.map(item => {
                                const p = getPartDetails(item.part_id);
                                return <option key={item.id} value={item.part_id}>{p?.name} (Dostępne: {item.quantity} {p?.unit})</option>
                              })}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold text-orange-700 mb-1">Ilość zużyta:</label>
                            <input type="number" min="1" required={closingForm.consumePart} value={closingForm.part_qty} onChange={e => setClosingForm({...closingForm, part_qty: parseInt(e.target.value) || 1})} className="w-full border border-orange-200 rounded p-1 text-center font-bold" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block font-medium text-slate-600 mb-1">Raport z naprawy / Notatka końcowa</label>
                    <textarea required={closingForm.status === 'Zakończone'} rows={3} value={closingForm.resolution_notes} onChange={e => setClosingForm({...closingForm, resolution_notes: e.target.value})} className="w-full border border-slate-200 rounded-lg p-2 focus:outline-none" placeholder="Wpisz, co zostało zrobione..." />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setActiveTicket(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-200 text-xs">Anuluj</button>
                    <button type="submit" className="flex-1 bg-[#58b347] text-white font-medium py-2.5 rounded-lg hover:bg-[#499b3a] text-xs shadow-sm flex items-center justify-center gap-1"><IconCheck /> Zapisz zmiany</button>
                  </div>
                </>
              ) : (
                // WIDOK PODGLĄDU DLA ZAKOŃCZONEGO ARCHIWALNEGO ZGŁOSZENIA
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div><span className="text-slate-400 block font-bold text-[10px]">STATUS:</span> <strong className="text-green-600 font-bold">ZAKOŃCZONE</strong></div>
                    <div><span className="text-slate-400 block font-bold text-[10px]">ZAMKNĄŁ:</span> <strong>{getTechName(activeTicket.technician_id)}</strong></div>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-500 uppercase text-[10px] mb-1">Oficjalny raport technika:</label>
                    <div className="bg-green-50/40 border border-green-100 text-green-900 p-3 rounded-lg font-medium whitespace-pre-wrap">{activeTicket.resolution_notes || 'Brak raportu.'}</div>
                  </div>
                  <button type="button" onClick={() => setActiveTicket(null)} className="w-full bg-slate-100 text-slate-700 font-medium py-2.5 rounded-lg hover:bg-slate-200 text-xs">Zamknij podgląd</button>
                </div>
              )}

            </form>
          </div>
        </div>
      )}
    </div>
  );
}