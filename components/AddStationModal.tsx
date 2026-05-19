import React, { useState, useEffect } from 'react';
import { supabase } from '../app/supabase';

type AddStationModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialLatLng: { lat: number; lng: number } | null;
  onSuccess: () => void;
};

export default function AddStationModal({
  isOpen,
  onClose,
  initialLatLng,
  onSuccess,
}: AddStationModalProps) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [technician, setTechnician] = useState('');
  const [status, setStatus] = useState('Działa');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingZone, setIsCheckingZone] = useState(false);

  // AUTOMATYCZNE WYPEŁNIANIE TECHNIKA PO KLIKNIĘCIU NA MAPĘ
  useEffect(() => {
    if (isOpen && initialLatLng) {
      const fetchTechnician = async () => {
        setIsCheckingZone(true);
        const { data, error } = await supabase.rpc('check_zone', {
          p_lat: initialLatLng.lat,
          p_lng: initialLatLng.lng,
        });

        if (!error && data) {
          setTechnician(data); // Wpisujemy technika prosto do inputa!
        } else {
          setTechnician('');
        }
        setIsCheckingZone(false);
      };
      fetchTechnician();
    } else if (!isOpen) {
      // Czyszczenie przy zamykaniu
      setName('');
      setAddress('');
      setTechnician('');
      setStatus('Działa');
    }
  }, [isOpen, initialLatLng]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    let finalLat = initialLatLng?.lat;
    let finalLng = initialLatLng?.lng;
    let finalTech = technician.trim();

    // 1. GEOKODOWANIE (Jeśli wpisujemy z palca adres)
    if (!finalLat || !finalLng) {
      if (!address) {
        alert('Podaj adres lub kliknij prawym przyciskiem na mapę!');
        setIsSubmitting(false);
        return;
      }

      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            address
          )}`
        );
        const data = await res.json();

        if (data && data.length > 0) {
          finalLat = parseFloat(data[0].lat);
          finalLng = parseFloat(data[0].lon);

          // Jeśli pole technika jest nadal puste, sprawdźmy strefę w tle przed zapisem!
          if (finalTech === '') {
            const { data: techData } = await supabase.rpc('check_zone', {
              p_lat: finalLat,
              p_lng: finalLng,
            });
            if (techData) finalTech = techData;
          }
        } else {
          alert('Nie udało się odnaleźć tego adresu na mapie.');
          setIsSubmitting(false);
          return;
        }
      } catch (error) {
        alert('Błąd połączenia z serwerem mapowym.');
        setIsSubmitting(false);
        return;
      }
    }

    const locationString = `POINT(${finalLng} ${finalLat})`;

    // 2. ZAPIS DO BAZY
    // UWAGA: CELOWO NIE WYSYŁAMY lat I lng, BO BAZA GENERUJE JE SAMA Z location!
    const { error } = await supabase.from('stations').insert([
      {
        name,
        status,
        technician: finalTech === '' ? 'Brak' : finalTech, // Manualnie wpisany lub ściągnięty z obszaru
        address: address || 'Brak (Dodano z mapy)',
        location: locationString,
      },
    ]);

    setIsSubmitting(false);

    if (error) {
      console.error('Błąd Supabase:', error);
      alert(`Błąd podczas zapisu: ${error.message}`);
    } else {
      onSuccess();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-800">
            Nowa Stacja Ładowania
          </h3>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Nazwa stacji *
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="np. Vyrai Hub Gdynia"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Adres
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="np. Gdynia, Abrahama 44"
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg relative">
            <label className="block text-xs font-bold text-blue-800 uppercase tracking-wide mb-1">
              Przypisany technik
            </label>
            <input
              type="text"
              value={technician}
              onChange={(e) => setTechnician(e.target.value)}
              placeholder="Wpisz ręcznie lub zlokalizuj..."
              className={`w-full px-4 py-2 bg-white border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm transition-colors ${
                isCheckingZone ? 'bg-blue-100 animate-pulse' : ''
              }`}
            />
            {initialLatLng && technician && !isCheckingZone && (
              <span className="absolute right-6 top-9 text-xs text-green-600 font-bold bg-green-100 px-2 py-1 rounded-md">
                ✓ Wykryto strefę
              </span>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
              Status startowy *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Działa">🟢 Działa</option>
              <option value="Awaria">🔴 Awaria</option>
            </select>
          </div>

          <button
            disabled={isSubmitting || isCheckingZone}
            type="submit"
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-4 hover:bg-blue-700 transition-colors disabled:bg-slate-400 shadow-md"
          >
            {isSubmitting ? 'Trwa zapis...' : 'Zapisz Stację'}
          </button>
        </form>
      </div>
    </div>
  );
}
