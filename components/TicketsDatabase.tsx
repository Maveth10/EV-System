import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../app/supabase';

export type Ticket = {
  id: string;
  ticket_no: string;
  station_name: string;
  status: string;
  priority: string;
  technician: string | null;
  description: string | null;
  created_at: string;
};

type SortConfig = { key: keyof Ticket; direction: 'asc' | 'desc' } | null;

const IconSort = () => <svg className="w-3 h-3 inline-block ml-1 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>;
const IconTrash = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>;
const IconEdit = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>;

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'Nowe': return 'bg-blue-50 text-blue-700 border-blue-100';
    case 'W trakcie': return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Oczekuje na części': return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'Zamknięte': return 'bg-green-50 text-green-700 border-green-100';
    default: return 'bg-slate-50 text-slate-700 border-slate-200';
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'Krytyczny': return 'text-red-600 font-bold';
    case 'Wysoki': return 'text-orange-600 font-semibold';
    case 'Średni': return 'text-yellow-600';
    default: return 'text-slate-500';
  }
};

export default function TicketsDatabase() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stations, setStations] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Modale
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState<Ticket | null>(null);

  // Stan nowego ticketu
  const [newTicket, setNewTicket] = useState({
    station_name: '', priority: 'Średni', technician: '', description: ''
  });

  const fetchData = async () => {
    setIsLoading(true);
    const [tktRes, statRes, techRes] = await Promise.all([
      supabase.from('tickets').select('*').order('created_at', { ascending: false }),
      supabase.from('stations').select('name'),
      supabase.from('technicians').select('name')
    ]);

    if (tktRes.data) setTickets(tktRes.data);
    if (statRes.data) setStations(statRes.data);
    if (techRes.data) setTechnicians(techRes.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  // Obsługa ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsAddModalOpen(false);
        setEditingTicket(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSort = (key: keyof Ticket) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

  const sortedTickets = useMemo(() => {
    if (!sortConfig) return tickets;
    return [...tickets].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [tickets, sortConfig]);

  const toggleSelectAll = () => {
    if (selectedIds.length === tickets.length) setSelectedIds([]);
    else setSelectedIds(tickets.map(t => t.id));
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) setSelectedIds(selectedIds.filter(selId => selId !== id));
    else setSelectedIds([...selectedIds, id]);
  };

  const deleteSelected = async () => {
    if (!confirm(`Na pewno usunąć wybrane zgłoszenia (${selectedIds.length})?`)) return;
    const { error } = await supabase.from('tickets').delete().in('id', selectedIds);
    if (error) alert('Błąd usuwania: ' + error.message);
    else { setSelectedIds([]); fetchData(); }
  };

  const handleAddTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicket.station_name) return alert('Wybierz stację ładowania.');

    const ticketNo = `TKT-${Math.floor(1000 + Math.random() * 9000)}`;
    const { error } = await supabase.from('tickets').insert([{
      ticket_no: ticketNo,
      station_name: newTicket.station_name,
      priority: newTicket.priority,
      technician: newTicket.technician || null,
      description: newTicket.description || null,
      status: 'Nowe'
    }]);

    if (error) alert('Błąd zapisu zgłoszenia: ' + error.message);
    else {
      setIsAddModalOpen(false);
      setNewTicket({ station_name: '', priority: 'Średni', technician: '', description: '' });
      fetchData();
    }
  };

  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTicket) return;

    const { error } = await supabase.from('tickets')
      .update({
        status: editingTicket.status,
        priority: editingTicket.priority,
        technician: editingTicket.technician || null,
        description: editingTicket.description || null
      })
      .eq('id', editingTicket.id);

    if (error) alert('Błąd aktualizacji: ' + error.message);
    else { setEditingTicket(null); fetchData(); }
  };

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-50 z-40 p-8 overflow-y-auto">
      <div className="max-w-[1400px] mx-auto flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Aktualne zgłoszenia awarii</h1>
          <p className="text-sm text-slate-500 mt-1">Zarządzaj usterkami, wsparciem technicznym i statusami prac serwisowych ({tickets.length} zgłoszeń)</p>
        </div>
        <div className="flex gap-3">
          {selectedIds.length > 0 && (
            <button onClick={deleteSelected} className="bg-white border border-red-200 text-red-600 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-red-50 flex items-center gap-2 shadow-sm transition-colors">
              <IconTrash /> Usuń wybrane ({selectedIds.length})
            </button>
          )}
          <button onClick={() => setIsAddModalOpen(true)} className="bg-[#58b347] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#499b3a] flex items-center gap-2 shadow-sm transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Zgłoś problem
          </button>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 w-24 text-left"><input type="checkbox" checked={selectedIds.length === tickets.length && tickets.length > 0} onChange={toggleSelectAll} className="rounded text-[#58b347] focus:ring-[#58b347]" /></th>
                <th onClick={() => handleSort('ticket_no')} className="p-4 cursor-pointer hover:bg-slate-100">Nr zgłoszenia <IconSort /></th>
                <th onClick={() => handleSort('station_name')} className="p-4 cursor-pointer hover:bg-slate-100">Stacja ładowania <IconSort /></th>
                <th onClick={() => handleSort('priority')} className="p-4 cursor-pointer hover:bg-slate-100">Priorytet <IconSort /></th>
                <th className="p-4">Opis usterki</th>
                <th onClick={() => handleSort('technician')} className="p-4 cursor-pointer hover:bg-slate-100">Przypisany technik <IconSort /></th>
                <th onClick={() => handleSort('created_at')} className="p-4 cursor-pointer hover:bg-slate-100">Data utworzenia <IconSort /></th>
                <th onClick={() => handleSort('status')} className="p-4 cursor-pointer hover:bg-slate-100">Status <IconSort /></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400 text-sm">Ładowanie rejestru zgłoszeń...</td></tr>
              ) : tickets.length === 0 ? (
                <tr><td colSpan={8} className="p-8 text-center text-slate-400 text-sm">Wszystkie ładowarki Ekoen działają poprawnie. Brak aktywnych zgłoszeń.</td></tr>
              ) : (
                sortedTickets.map(ticket => (
                  <tr key={ticket.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(ticket.id) ? 'bg-green-50/20' : ''}`}>
                    <td className="p-4">
                      <div className="flex items-center gap-4">
                        <input type="checkbox" checked={selectedIds.includes(ticket.id)} onChange={() => toggleSelect(ticket.id)} className="rounded text-[#58b347] focus:ring-[#58b347]" />
                        <button onClick={() => setEditingTicket(ticket)} className="text-slate-400 hover:text-[#58b347] transition-colors" title="Edytuj zgłoszenie"><IconEdit /></button>
                      </div>
                    </td>
                    <td className="p-4 font-mono font-bold text-slate-800 text-sm">{ticket.ticket_no}</td>
                    <td className="p-4 font-semibold text-slate-700 text-sm">{ticket.station_name}</td>
                    <td className="p-4 text-sm"><span className={getPriorityColor(ticket.priority)}>{ticket.priority}</span></td>
                    <td className="p-4 text-slate-600 text-sm max-w-xs truncate" title={ticket.description || ''}>{ticket.description || '-'}</td>
                    <td className="p-4 text-slate-700 text-sm font-medium">{ticket.technician || <span className="text-slate-400 italic">Nieprzypisany</span>}</td>
                    <td className="p-4 text-slate-500 text-sm font-mono">{ticket.created_at}</td>
                    <td className="p-4">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold border ${getStatusBadge(ticket.status)}`}>
                        {ticket.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: NOWE ZGŁOSZENIE AWARYJNE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setIsAddModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800">Ręczne zgłoszenie awarii infrastruktury</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddTicket} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Stacja ładowania *</label>
                <select required value={newTicket.station_name} onChange={(e) => setNewTicket({...newTicket, station_name: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347] bg-white">
                  <option value="">-- Wybierz stację z bazy --</option>
                  {stations.map((s, idx) => <option key={idx} value={s.name}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Priorytet</label>
                  <select value={newTicket.priority} onChange={(e) => setNewTicket({...newTicket, priority: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347] bg-white">
                    <option value="Niski">Niski</option>
                    <option value="Średni">Średni</option>
                    <option value="Wysoki">Wysoki</option>
                    <option value="Krytyczny">Krytyczny</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Serwisant dyspozycyjny</label>
                  <select value={newTicket.technician} onChange={(e) => setNewTicket({...newTicket, technician: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347] bg-white">
                    <option value="">Wybierz technika (opcjonalnie)</option>
                    {technicians.map((t, idx) => <option key={idx} value={t.name}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Opis usterki / kody błędów</label>
                <textarea rows={3} value={newTicket.description} onChange={(e) => setNewTicket({...newTicket, description: e.target.value})} placeholder="np. Komunikat błędu na ekranie: Error code 12. Brak autoryzacji transakcji." className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347] resize-none" />
              </div>
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded text-sm hover:bg-slate-200">Anuluj</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-medium py-2.5 rounded text-sm hover:bg-[#499b3a]">Zgłoś awarię</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MASYWNA EDYCJA / ZMIANA STATUSU ZGŁOSZENIA */}
      {editingTicket && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setEditingTicket(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-slate-200" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-slate-800">Aktualizacja zlecenia serwisowego {editingTicket.ticket_no}</h3>
              <button onClick={() => setEditingTicket(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleEditSave} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Status zlecenia</label>
                  <select value={editingTicket.status} onChange={(e) => setEditingTicket({...editingTicket, status: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347] bg-white">
                    <option value="Nowe">Nowe</option>
                    <option value="W trakcie">W trakcie</option>
                    <option value="Oczekuje na części">Oczekuje na części</option>
                    <option value="Zamknięte">Zamknięte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Priorytet usterki</label>
                  <select value={editingTicket.priority} onChange={(e) => setEditingTicket({...editingTicket, priority: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347] bg-white">
                    <option value="Niski">Niski</option>
                    <option value="Średni">Średni</option>
                    <option value="Wysoki">Wysoki</option>
                    <option value="Krytyczny">Krytyczny</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Przekaż zlecenie do serwisu</label>
                <select value={editingTicket.technician || ''} onChange={(e) => setEditingTicket({...editingTicket, technician: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347] bg-white">
                  <option value="">Brak przydziału (Serwis wolny)</option>
                  {technicians.map((t, idx) => <option key={idx} value={t.name}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Dziennik napraw / Opis usterki</label>
                <textarea rows={3} value={editingTicket.description || ''} onChange={(e) => setEditingTicket({...editingTicket, description: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347] resize-none" />
              </div>
              <div className="pt-2 flex gap-2">
                <button type="button" onClick={() => setEditingTicket(null)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded text-sm hover:bg-slate-200">Anuluj</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-medium py-2.5 rounded text-sm hover:bg-[#499b3a]">Zapisz zmiany</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}