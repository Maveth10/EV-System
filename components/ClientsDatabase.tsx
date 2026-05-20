import React, { useState, useEffect } from 'react';
import { supabase } from '../app/supabase';

type Client = { id: string; name: string; contact_person: string | null; email: string | null; phone: string | null; sla_hours: number; notes: string | null; };
type Station = { id: string; client: string | null; };

const IconBuilding = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/></svg>;
const IconPlus = () => <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const IconMail = () => <svg className="w-3.5 h-3.5 inline mr-1 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>;
const IconPhone = () => <svg className="w-3.5 h-3.5 inline mr-1 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>;

export default function ClientsDatabase() {
  const [clients, setClients] = useState<Client[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const [newClient, setNewClient] = useState({ name: '', contact_person: '', email: '', phone: '', sla_hours: 48, notes: '' });

  const fetchData = async () => {
    setIsLoading(true);
    const [cRes, sRes] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('stations').select('id, client')
    ]);

    if (cRes.data) setClients(cRes.data);
    if (sRes.data) setStations(sRes.data);
    setIsLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('clients').insert([newClient]);
    if (error) {
      alert(`Błąd: ${error.message}`);
    } else {
      setIsAddModalOpen(false);
      setNewClient({ name: '', contact_person: '', email: '', phone: '', sla_hours: 48, notes: '' });
      fetchData();
    }
  };

  const getStationCount = (clientName: string) => {
    return stations.filter(s => s.client === clientName).length;
  };

  return (
    <div className="absolute inset-0 left-[72px] bg-slate-50 z-40 p-8 overflow-y-auto">
      <div className="max-w-[1200px] mx-auto">
        
        {/* Nagłówek */}
        <div className="flex justify-between items-end mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <IconBuilding /> Baza Klientów i Sieci (CRM)
            </h1>
            <p className="text-sm text-slate-500 mt-1">Zarządzaj partnerami biznesowymi oraz warunkami SLA dla stacji.</p>
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-[#58b347] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-[#499b3a] flex items-center gap-2 shadow-sm transition-colors"
          >
            <IconPlus /> Dodaj Klienta
          </button>
        </div>

        {/* Lista Klientów */}
        {isLoading ? (
          <div className="flex justify-center p-12 text-slate-400 font-medium">Ładowanie bazy klientów...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map(client => {
              const stationCount = getStationCount(client.name);
              return (
                <div key={client.id} className="bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                  <div className="p-5 border-b border-slate-100 flex-1">
                    <div className="flex justify-between items-start mb-3">
                      <h3 className="font-bold text-slate-800 text-lg leading-tight pr-4">{client.name}</h3>
                      <span className="bg-slate-100 text-slate-600 font-mono text-[10px] px-2 py-1 rounded font-bold shrink-0">
                        SLA: {client.sla_hours}h
                      </span>
                    </div>
                    
                    <div className="space-y-2 mt-4 text-sm text-slate-600">
                      <p className="font-medium text-slate-800 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">👤</div>
                        {client.contact_person || 'Brak osoby decyzyjnej'}
                      </p>
                      {client.phone && <p className="truncate"><IconPhone /> {client.phone}</p>}
                      {client.email && <p className="truncate"><IconMail /> <a href={`mailto:${client.email}`} className="hover:text-[#58b347]">{client.email}</a></p>}
                    </div>

                    {client.notes && (
                      <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-lg text-xs text-yellow-800 italic">
                        {client.notes}
                      </div>
                    )}
                  </div>
                  
                  <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center">
                    <div className="text-xs font-medium text-slate-500">
                      Obsługiwane ładowarki: <strong className={stationCount > 0 ? "text-[#58b347] text-sm" : "text-slate-400"}>{stationCount}</strong>
                    </div>
                    <button className="text-[#58b347] text-xs font-bold hover:underline">Edytuj</button>
                  </div>
                </div>
              )
            })}
            
            {clients.length === 0 && (
              <div className="col-span-full text-center p-12 bg-white border border-slate-200 rounded-xl text-slate-400">
                Baza klientów jest pusta. Dodaj pierwszego partnera!
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL: DODAJ KLIENTA */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4" onClick={() => setIsAddModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Nowy Partner Biznesowy</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleAddClient} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nazwa Sieci / Klienta (Musi być identyczna jak na mapie stacji) *</label>
                <input required value={newClient.name} onChange={e => setNewClient({...newClient, name: e.target.value})} type="text" placeholder="np. OMV Slovensko, S.r.o" className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347]" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Osoba kontaktowa</label>
                  <input value={newClient.contact_person} onChange={e => setNewClient({...newClient, contact_person: e.target.value})} type="text" placeholder="Imię i nazwisko" className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Czas reakcji SLA (Godziny)</label>
                  <input required value={newClient.sla_hours} onChange={e => setNewClient({...newClient, sla_hours: parseInt(e.target.value) || 0})} type="number" min="1" className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347] font-bold text-[#58b347]" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Telefon</label>
                  <input value={newClient.phone} onChange={e => setNewClient({...newClient, phone: e.target.value})} type="tel" placeholder="+48..." className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347]" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Adres e-mail</label>
                  <input value={newClient.email} onChange={e => setNewClient({...newClient, email: e.target.value})} type="email" placeholder="kontakt@firma.pl" className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347]" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Notatki dyspozytorskie (Opcjonalnie)</label>
                <textarea rows={2} value={newClient.notes} onChange={e => setNewClient({...newClient, notes: e.target.value})} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:outline-none focus:border-[#58b347]" placeholder="Specjalne instrukcje dotyczące tego klienta..." />
              </div>
              <div className="pt-4 flex gap-2">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 bg-slate-100 text-slate-700 font-medium py-2.5 rounded hover:bg-slate-200 transition-colors text-sm">Anuluj</button>
                <button type="submit" className="flex-1 bg-[#58b347] text-white font-medium py-2.5 rounded hover:bg-[#499b3a] transition-colors text-sm shadow-sm">Zapisz Klienta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}