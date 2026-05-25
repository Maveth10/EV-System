'use client';
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../app/supabase';

type AddStationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialLatLng: { lat: number; lng: number } | null;
  onSuccess: () => void;
  editingStation?: any;
};

const IconCheck = () => <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconChevronDown = () => <svg className="w-4 h-4 text-slate-500 transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>;

// Autorski zielony checkbox
const CustomCheckbox = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <div 
    onClick={(e) => { e.stopPropagation(); onChange(); }}
    className={`w-4 h-4 rounded-[4px] flex items-center justify-center cursor-pointer transition-colors duration-200 ${checked ? 'bg-[#58b347] border-[#58b347]' : 'border border-slate-300 bg-white hover:border-[#58b347]/50'}`}
  >
    {checked && <IconCheck />}
  </div>
);

export default function AddStationModal({ isOpen, onClose, initialLatLng, onSuccess, editingStation }: AddStationModalProps) {
  const isEditMode = !!editingStation;

  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [model, setModel] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [status, setStatus] = useState('Brak akcji');
  
  // Przechowywanie list w postaci tablic zaznaczonych elementów
  const [selectedTechs, setSelectedTechs] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  
  // Słowniki dociągane dynamicznie z bazy danych
  const [availableTechs, setAvailableTechs] = useState<string[]>([]);
  const [availableRegions, setAvailableRegions] = useState<string[]>([]);

  const [country, setCountry] = useState('Polska');
  const [city, setCity] = useState('');
  const [street, setStreet] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingZone, setIsCheckingZone] = useState(false);

  // Stany otwarcia dropdownów wielokrotnego wyboru
  const [isTechDropdownOpen, setIsTechDropdownOpen] = useState(false);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);
  
  const techDropdownRef = useRef<HTMLDivElement>(null);
  const regionDropdownRef = useRef<HTMLDivElement>(null);

  // Zamknięcie okien na Escape i kliknięcie na zewnątrz dropdownów
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (techDropdownRef.current && !techDropdownRef.current.contains(e.target as Node)) setIsTechDropdownOpen(false);
      if (regionDropdownRef.current && !regionDropdownRef.current.contains(e.target as Node)) setIsRegionDropdownOpen(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Pobieranie bazy techników i regionów w celu nakarmienia Multiselecta
  useEffect(() => {
    const fetchDictionaries = async () => {
      const [techRes, regRes] = await Promise.all([
        supabase.from('technicians').select('name'),
        supabase.from('regions').select('name')
      ]);
      if (techRes.data) setAvailableTechs(techRes.data.map(t => t.name).filter(Boolean));
      if (regRes.data) setAvailableRegions(regRes.data.map(r => r.name).filter(Boolean));
    };

    if (isOpen) {
      fetchDictionaries();
    }
  }, [isOpen]);

  // Inicjalizacja danych (Edycja / Nowy punkt / RPC na strefy)
  useEffect(() => {
    if (isOpen && editingStation) {
      setName(editingStation.name || '');
      setClient(editingStation.client || '');
      setModel(editingStation.model || '');
      setInspectionDate(editingStation.inspection_date || '');
      setStatus(editingStation.status || 'Brak akcji');
      setCountry(editingStation.country || 'Polska');
      setCity(editingStation.city || '');
      setStreet(editingStation.street || '');
      setAdditionalInfo(editingStation.additional_info || '');
      
      // Parsowanie wartości wielokrotnych (zabezpieczenie przecinków)
      const parseField = (field: string | null) => field ? field.split(',').map(s => s.trim()).filter(Boolean) : [];
      setSelectedTechs(parseField(editingStation.technician));
      setSelectedRegions(parseField(editingStation.region));
    } else if (isOpen && initialLatLng) {
      const autoDetermineZone = async () => {
        setIsCheckingZone(true);
        try {
          const { data, error } = await supabase.rpc('check_zone', { p_lat: initialLatLng.lat, p_lng: initialLatLng.lng });
          if (!error && data) {
            // Zakładamy, że rpc zwraca dopasowane nazwy po przecinku lub pojedynczą nazwę
            const foundNames = data.split(',').map((s: string) => s.trim()).filter(Boolean);
            setSelectedTechs(foundNames);
          }
        } catch (err) {
          console.error(err);
        }
        setIsCheckingZone(false);
      };
      autoDetermineZone();
    } else if (!isOpen) {
      setName(''); setClient(''); setModel(''); setInspectionDate(''); 
      setCountry('Polska'); setCity(''); setStreet(''); setAdditionalInfo('');
      setSelectedTechs([]); setSelectedRegions([]); setStatus('Brak akcji');
    }
  }, [isOpen, initialLatLng, editingStation]);

  if (!isOpen) return null;

  const handleToggleTech = (tech: string) => {
    if (selectedTechs.includes(tech)) {
      setSelectedTechs(selectedTechs.filter(t => t !== tech));
    } else {
      setSelectedTechs([...selectedTechs, tech]);
    }
  };

  const handleToggleRegion = (reg: string) => {
    if (selectedRegions.includes(reg)) {
      setSelectedRegions(selectedRegions.filter(r => r !== reg));
    } else {
      setSelectedRegions([...selectedRegions, reg]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalLat = initialLatLng?.lat;
    let finalLng = initialLatLng?.lng;
    
    // Pobieramy to, co użytkownik przeklikał w multiselekcie
    let finalTech = selectedTechs.join(', ');
    let finalRegion = selectedRegions.join(', ');

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
          } else {
            alert('Brak wyników wyszukiwania dla podanego adresu.');
            setIsSubmitting(false); return;
          }
        } catch (error) { alert('Błąd usługi geokodowania.'); setIsSubmitting(false); return; }
      }
    }

    // Jeśli to nowa stacja i użytkownik nie wybrał nikogo ręcznie, odpytujemy bazę o wszystkich techników w strefie
    if (finalTech === '' && !isEditMode) {
      try {
        const { data: techData } = await supabase.rpc('check_zone', { p_lat: finalLat, p_lng: finalLng });
        if (techData) {
          // ZMIANA: Zapisujemy cały ciąg znaków z bazy, nie odcinamy przez .split(',')[0]
          finalTech = techData; 
        }
      } catch (err) {
        console.error("Błąd RPC technika:", err);
      }
    }

    const payload = {
      name, 
      client, 
      model, 
      inspection_date: inspectionDate || null, 
      status,
      technician: finalTech === '' ? null : finalTech,
      region: finalRegion === '' ? null : finalRegion,
      country, 
      city, 
      street, 
      additional_info: additionalInfo,
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
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-white/60 flex flex-col max-h-[90vh] animate-slideUp" onClick={(e) => e.stopPropagation()}>
        
        {/* Nagłówek modala */}
        <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex justify-between items-center shrink-0">
          <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800">
            {isEditMode ? 'Edycja parametrów stacji' : 'Rejestracja nowego punktu w sieci'}
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">✕</button>
        </div>

        <div className="overflow-y-auto p-6 flex-1">
          <form id="station-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Metadane podstawowe */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Identyfikator stacji *</label>
                <input required type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 outline-none transition-all shadow-sm" placeholder="np. PL-0043" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Klient / Partner</label>
                <input type="text" value={client} onChange={(e) => setClient(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 outline-none transition-all shadow-sm" placeholder="np. InPost" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Model ładowarki</label>
                <input type="text" value={model} onChange={(e) => setModel(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 outline-none transition-all shadow-sm" placeholder="np. Alpitronic HYC300" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Data przeglądu UDT</label>
                <input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 outline-none transition-all shadow-sm text-slate-700" />
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Lokalizacja geograficzna */}
            <div>
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center justify-between">
                Geolokalizacja {initialLatLng && <span className="text-[#58b347] lowercase normal-case font-bold bg-green-50 px-2.5 py-0.5 rounded-md border border-green-100">Pobrano koordynaty z mapy</span>}
              </h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Kraj</label>
                  <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:border-[#58b347] outline-none shadow-sm" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Miasto *</label>
                  <input required={!initialLatLng && !isEditMode} type="text" value={city} onChange={(e) => setCity(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:border-[#58b347] outline-none shadow-sm" placeholder="np. Warszawa" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Ulica i numer *</label>
                  <input required={!initialLatLng && !isEditMode} type="text" value={street} onChange={(e) => setStreet(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:border-[#58b347] outline-none shadow-sm" placeholder="np. Towarowa 22" />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Dodatkowe info logistyczne</label>
                  <input type="text" value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold focus:border-[#58b347] outline-none shadow-sm" placeholder="np. wjazd od tyłu, szlaban kod 123" />
                </div>
              </div>
            </div>

            <hr className="border-slate-100" />

            {/* Przypisania operacyjne (Nowy Multiselect) */}
            <div className="grid grid-cols-2 gap-4">
              
              {/* Multiselect: Opiekunowie */}
              <div className="col-span-2 sm:col-span-1 relative" ref={techDropdownRef}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Opiekunowie / Technicy Mobilni</label>
                <div 
                  onClick={() => setIsTechDropdownOpen(!isTechDropdownOpen)} 
                  className={`w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold flex items-center justify-between cursor-pointer bg-white shadow-sm min-h-[42px] ${isCheckingZone ? 'bg-slate-50 opacity-60' : ''}`}
                >
                  <span className="truncate text-slate-700">
                    {selectedTechs.length > 0 ? selectedTechs.join(', ') : 'Wybierz opiekunów...'}
                  </span>
                  <IconChevronDown />
                </div>
                
                {isTechDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-2xl z-50 p-2 max-h-48 overflow-y-auto space-y-1 animate-fadeIn">
                    {availableTechs.map((tech) => (
                      <div 
                        key={tech} 
                        onClick={() => handleToggleTech(tech)}
                        className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <CustomCheckbox checked={selectedTechs.includes(tech)} onChange={() => handleToggleTech(tech)} />
                        <span className="text-xs font-bold text-slate-700 select-none">{tech}</span>
                      </div>
                    ))}
                    {availableTechs.length === 0 && <div className="p-3 text-center text-xs font-medium text-slate-400">Brak techników w bazie</div>}
                  </div>
                )}
              </div>

              {/* Multiselect: Regiony */}
              <div className="col-span-2 sm:col-span-1 relative" ref={regionDropdownRef}>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Przypisane Strefy / Regiony</label>
                <div 
                  onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)} 
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-semibold flex items-center justify-between cursor-pointer bg-white shadow-sm min-h-[42px]"
                >
                  <span className="truncate text-slate-700">
                    {selectedRegions.length > 0 ? selectedRegions.join(', ') : 'Wybierz regiony...'}
                  </span>
                  <IconChevronDown />
                </div>
                
                {isRegionDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1.5 bg-white/95 backdrop-blur-xl border border-slate-200 rounded-xl shadow-2xl z-50 p-2 max-h-48 overflow-y-auto space-y-1 animate-fadeIn">
                    {availableRegions.map((reg) => (
                      <div 
                        key={reg} 
                        onClick={() => handleToggleRegion(reg)}
                        className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <CustomCheckbox checked={selectedRegions.includes(reg)} onChange={() => handleToggleRegion(reg)} />
                        <span className="text-xs font-bold text-slate-700 select-none">{reg}</span>
                      </div>
                    ))}
                    {availableRegions.length === 0 && <div className="p-3 text-center text-xs font-medium text-slate-400">Brak zdefiniowanych regionów</div>}
                  </div>
                )}
              </div>

              {/* Wybór Akcji / Statusu */}
              <div className="col-span-2 sm:col-span-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Aktualna akcja / Zadanie *</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm font-bold focus:border-[#58b347] focus:ring-1 focus:ring-[#58b347]/30 outline-none bg-white shadow-sm cursor-pointer text-slate-800">
                  <option value="Brak akcji">Brak akcji (Zielony)</option>
                  <option value="Uruchomienie">Uruchomienie (Fioletowy)</option>
                  <option value="Przegląd">Przegląd (Niebieski)</option>
                  <option value="Awaria">Awaria (Czerwony)</option>
                  <option value="Zlecenie jakościowe">Zlecenie jakościowe (Pomarańczowy)</option>
                  <option value="Naprawa odpłatna">Naprawa odpłatna (Bursztynowy)</option>
                </select>
              </div>
            </div>
          </form>
        </div>

        {/* Guzik zapisu */}
        <div className="p-6 border-t border-slate-200 bg-slate-50/80 shrink-0">
          <button form="station-form" disabled={isSubmitting || isCheckingZone} type="submit" className="w-full bg-[#58b347] text-white font-bold py-3 rounded-xl text-sm hover:bg-[#499b3a] transition-all disabled:bg-slate-300 shadow-sm shadow-[#58b347]/10">
            {isSubmitting ? 'Komunikacja z bazą danych...' : (isEditMode ? 'Zatwierdź modyfikacje stacji' : 'Zarejestruj stację w systemie')}
          </button>
        </div>
      </div>
    </div>
  );
}