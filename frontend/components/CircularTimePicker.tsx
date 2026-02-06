
import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

interface CircularTimePickerProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  label: string;
}

const CircularTimePicker: React.FC<CircularTimePickerProps> = ({ value, onChange, onClose, label }) => {
  const [hour, setHour] = useState(parseInt(value.split(':')[0]) || 0);
  const [minute, setMinute] = useState(parseInt(value.split(':')[1]) || 0);
  const [view, setView] = useState<'hours' | 'minutes'>('hours');

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 12 }, (_, i) => i * 5);

  const handleSave = () => {
    const formattedHour = hour.toString().padStart(2, '0');
    const formattedMinute = minute.toString().padStart(2, '0');
    onChange(`${formattedHour}:${formattedMinute}`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-[320px] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col items-center p-8 border border-slate-100">
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-6">{label}</h3>
        
        {/* Display */}
        <div className="flex items-center gap-2 mb-8">
          <button 
            onClick={() => setView('hours')}
            className={`text-5xl font-black transition-colors ${view === 'hours' ? 'text-rose-600' : 'text-slate-200'}`}
          >
            {hour.toString().padStart(2, '0')}
          </button>
          <span className="text-4xl font-black text-slate-200">:</span>
          <button 
            onClick={() => setView('minutes')}
            className={`text-5xl font-black transition-colors ${view === 'minutes' ? 'text-rose-600' : 'text-slate-200'}`}
          >
            {minute.toString().padStart(2, '0')}
          </button>
        </div>

        {/* Clock Face */}
        <div className="relative w-64 h-64 bg-slate-50 rounded-full border border-slate-100 shadow-inner flex items-center justify-center">
          <div className="absolute w-1 h-1 bg-rose-600 rounded-full z-10"></div>
          
          {view === 'hours' ? (
            hours.map((h) => {
              const angle = (h * 15) - 90; // 360 / 24 = 15 deg per hour
              const isOuter = h >= 12;
              const radius = isOuter ? 105 : 70;
              const x = Math.cos(angle * (Math.PI / 180)) * radius;
              const y = Math.sin(angle * (Math.PI / 180)) * radius;
              
              return (
                <button
                  key={h}
                  onClick={() => { setHour(h); setView('minutes'); }}
                  className={`absolute w-8 h-8 rounded-full text-[10px] font-black transition-all flex items-center justify-center
                    ${hour === h ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-200'}
                  `}
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                >
                  {h}
                </button>
              );
            })
          ) : (
            <>
              {Array.from({ length: 60 }, (_, m) => {
                const angle = (m * 6) - 90;
                const radius = 100;
                const x = Math.cos(angle * (Math.PI / 180)) * radius;
                const y = Math.sin(angle * (Math.PI / 180)) * radius;
                
                if (m % 5 === 0) {
                  return (
                    <button
                      key={m}
                      onClick={() => setMinute(m)}
                      className={`absolute w-8 h-8 rounded-full text-[10px] font-black transition-all flex items-center justify-center z-20
                        ${minute === m ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-200'}
                      `}
                      style={{ transform: `translate(${x}px, ${y}px)` }}
                    >
                      {m}
                    </button>
                  );
                }
                return null;
              })}
              {/* Discrete line for minutes between 5s */}
              <input 
                type="range" min="0" max="59" value={minute} 
                onChange={(e) => setMinute(parseInt(e.target.value))}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
            </>
          )}

          {/* Hand Indicator */}
          <div 
            className="absolute bg-rose-200/50 origin-bottom rounded-full transition-all duration-300"
            style={{ 
              bottom: '50%', 
              left: '50%',
              width: '2px', 
              height: view === 'hours' ? (hour >= 12 ? '105px' : '70px') : '100px',
              transform: `translateX(-50%) rotate(${view === 'hours' ? (hour * 15) : (minute * 6)}deg)`
            }}
          >
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 bg-rose-600 rounded-full"></div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex w-full gap-4 mt-10">
          <button onClick={onClose} className="flex-1 py-4 bg-slate-50 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 transition-all">Batal</button>
          <button onClick={handleSave} className="flex-1 py-4 bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-rose-600 transition-all shadow-xl flex items-center justify-center gap-2">
            <Check size={14} /> Pilih
          </button>
        </div>
      </div>
    </div>
  );
};

export default CircularTimePicker;
