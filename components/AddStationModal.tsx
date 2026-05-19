import React, { useState, useEffect } from 'react';
import { supabase } from '../app/supabase';

type AddStationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialLatLng: { lat: number; lng: number } | null;
  onSuccess: () => void;
  editingStation?: any;
};

export default function AddStationModal({ isOpen, onClose, initialLatLng, onSuccess, editingStation }: AddStationModalProps) {
  const isEditMode = !!editingStation;

  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [model, setModel] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [status, setStatus] = useState('Działa');
  const [technician, setTechnician] = useState('');
  
  const [country, setCountry] = useState('Polska');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingZone, setIsCheckingZone] = useState(false);

  // Zamykanie na ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && editingStation) {
      setName(editingStation.name || '');
      setClient(editingStation.client || '');
      setModel(editingStation.model || '');
      setInspectionDate(editingStation.inspection_date || '');
      setStatus(editingStation.status || 'Działa');
      setTechnician(editingStation.technician || '');
      setCountry(editingStation.country || 'Polska');
      setCity(editingStation.city || '');
      setStreet(editingStation.street || '');
      setAdditionalInfo(editingStation.additional_info || '');
    } else if (isOpen && initialLatLng) {
      const fetchTechnician = async () => {
        setIsCheckingZone(true);
        const { data, error } = await supabase.rpc('check_zone', { p_lat: initialLatLng.lat, p_lng: initialLatLng.lng });
        if (!error && data) setTechnician(data.split(',')[0]);
        else setTechnician('');
        setIsCheckingZone(false);
      };
      fetchTechnician();
    } else if (!isOpen) {
      setName(''); setClient(''); setModel(''); setInspectionDate(''); 
      setCountry('Polska'); setCity(''); setStreet(''); setAdditionalInfo(''); setTechnician(''); setStatus('Działa');
    }
  }, [isOpen, initialLatLng, editingStation]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalLat = initialLatLng?.lat;
    let finalLng = initialLatLng?.lng;
    let finalTech = technician.trim();

    if (!finalLat || !finalLng) {
      const isAddressSame = isEditMode && editingStation.city === city && editingStation.street === street && editingStation.country === country;
      
      if (isAddressSame && editingStation.lat && editingStation.lng) {
        finalLat = editingStation.lat;
        finalLng = editingStation.lng;
      } else {
        if (!city || !street) {
          alert('Podaj przynajmniej miasto i ulicę lub wskaż lokalizację na mapie.');
          setIsSubmitting(false); return;
        }
        const fullAddress = `${street}, ${city}, ${country}`;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullAddress)}`);
          const data = await res.json();
          if (data && data.length > 0) {
            finalLat = parseFloat(data[0].lat); finalLng = parseFloat(data[0].lon);
            if (finalTech === '' && !isEditMode) {
               const { data: techData } = await supabase.rpc('check_zone', { p_lat: finalLat, p_lng: finalLng });
               if (techData) finalTech = techData.split(',')[0];
            }
          } else {
            alert('Brak wyników wyszukiwania dla podanego adresu.');
            setIsSubmitting(false); return;
          }
        } catch (error) { alert('Błąd usługi geokodowania.'); setIsSubmitting(false); return; }
      }
    }

    const payload = {
      name, client, model, inspection_date: inspectionDate || null, status,
      technician: finalTech === '' ? null : finalTech,
      country, city, street, additional_info: additionalInfo,
      location: `POINT(${finalLng} ${finalLat})`
    };

    let dbError;
    if (isEditMode) {
      const { error } = await supabase.from('stations').update(payload).eq('id', editingStation.id);
      dbError = error;
    } else {
      const { error } = await supabase.from('stations').insert([payload]);
      dbError = error;
    }

    setIsSubmitting(false);
    if (dbError) alert(`Błąd zapisu: ${dbError.message}`);
    else { onSuccess(); onClose(); }
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
      onClick={onClose} // Zamykanie po kliknięciu w tło
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()} // Blokada zamykania przy kliknięciu w okno
      >
        <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 className="text-sm font-semibold text-slate-800">
            {isEditMode ? 'Edycja stacji' : 'Rejestracja nowej stacji'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
        </div>

        <div className="overflow-y-auto p-5 shrink">
          <form id="station-form" onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Identyfikator stacji *</label>
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:border-blue-500 outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Klient / Partner</label>
                <input type="text" value={client} onChange={(e) => setClient(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:border-blue-500 outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Model ładowarki</label>
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:border-blue-500 outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Data przeglądu</label>
                <input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:border-blue-500 outline-none" />
              </div>
            </div>

            <hr className="border-slate-100" />

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Lokalizacja {initialLatLng && <span className="text-green-600 lowercase normal-case ml-2">(Pobrano z mapy)</span>}</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Kraj</label>
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:border-blue-500 outline-none" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Miasto *</label>
                  <input required={!initialLatLng && !isEditMode} type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:border-blue-500 outline-none" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ulica i numer *</label>
                  <input required={!initialLatLng && !isEditMode} type="text" value={street} onChange={(e) => setStreet(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:border-blue-500 outline-none" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Dodatkowe info (np. kod bramy)</label>
                  <input type="text" value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:border-blue-500 outline-none" />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1 relative">
                <label className="block text-xs font-medium text-slate-600 mb-1">Główny technik</label>
                <input type="text" value={technician} onChange={(e) => setTechnician(e.target.value)} className={`w-full px-3 py-2 border rounded text-sm focus:border-blue-500 outline-none ${isCheckingZone ? 'bg-slate-100' : 'border-slate-200'}`} />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-medium text-slate-600 mb-1">Status techniczny *</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:border-blue-500 outline-none bg-white">
                  <option value="Działa">Działa</option>
                  <option value="Awaria">Awaria</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        <div className="p-5 border-t border-slate-200 bg-slate-50 shrink-0">
          <button form="station-form" disabled={isSubmitting || isCheckingZone} type="submit" className="w-full bg-blue-600 text-white font-medium py-2.5 rounded text-sm hover:bg-blue-700 transition-colors disabled:bg-slate-400 shadow-sm">
            {isSubmitting ? 'Przetwarzanie danych...' : (isEditMode ? 'Zapisz zmiany' : 'Zapisz do bazy')}
          </button>
        </div>
      </div>
    </div>
  );
}