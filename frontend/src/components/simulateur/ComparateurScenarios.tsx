import React from 'react';
import { CheckCircle } from 'lucide-react';

interface Props {
  amount: number;
  annualRate: number;
  onSelect?: (duration: number) => void;
  selectedDuration?: number;
}

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-TN', { style: 'currency', currency: 'TND', maximumFractionDigits: 0 }).format(n);

function calcMonthly(capital: number, duration: number, rate: number): number {
  const r = rate / 100 / 12;
  return capital * (r * Math.pow(1 + r, duration)) / (Math.pow(1 + r, duration) - 1);
}

export const ComparateurScenarios: React.FC<Props> = ({ amount, annualRate, onSelect, selectedDuration }) => {
  if (!amount || amount <= 0) return null;

  // Générer 3 durées : courte, moyenne, longue selon le montant
  const getDurations = () => {
    if (amount <= 5000)   return [12, 24, 36];
    if (amount <= 20000)  return [24, 36, 60];
    if (amount <= 50000)  return [36, 60, 84];
    if (amount <= 100000) return [60, 120, 180];
    return [120, 180, 240];
  };

  const durations = getDurations();
  const scenarios = durations.map(d => {
    const monthly = calcMonthly(amount, d, annualRate);
    const totalCost = monthly * d;
    const totalInterest = totalCost - amount;
    return { duration: d, monthly, totalCost, totalInterest };
  });
//badge Moins d'intérêts 
  const minMonthly = Math.min(...scenarios.map(s => s.monthly));

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 bg-blue-500 rounded-full" />
        <p className="text-sm font-semibold text-gray-800">Comparaison des scénarios de remboursement</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {scenarios.map((s, i) => {
          const isSelected = selectedDuration === s.duration;
          const isCheapest = s.monthly === minMonthly;
          const labels = ['Remboursement court', 'Remboursement équilibré', 'Remboursement long'];
          const colors = [
            { border: 'border-orange-300', bg: 'bg-orange-50', badge: 'bg-orange-500', header: 'text-orange-700' },
            { border: 'border-blue-400',   bg: 'bg-blue-50',   badge: 'bg-blue-600',   header: 'text-blue-700' },
            { border: 'border-green-400',  bg: 'bg-green-50',  badge: 'bg-green-600',  header: 'text-green-700' },
          ];
          const c = colors[i];

          return (
            <div
              key={s.duration}
              onClick={() => onSelect?.(s.duration)}
              className={`relative rounded-xl border-2 p-4 transition-all cursor-pointer ${
                isSelected
                  ? `${c.border} ${c.bg} shadow-md scale-[1.02]`
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
              }`}
            >
              {/* Badge sélectionné */}
              {isSelected && (
                <div className="absolute -top-2 -right-2">
                  <div className={`w-6 h-6 ${c.badge} rounded-full flex items-center justify-center`}>
                    <CheckCircle size={14} className="text-white" />
                  </div>
                </div>
              )}

              {/* Durée */}
              <div className="text-center mb-3">
                <span className={`text-2xl font-bold ${c.header}`}>{s.duration}</span>
                <span className="text-sm text-gray-500 ml-1">mois</span>
                <p className="text-xs text-gray-400 mt-0.5">{Math.round(s.duration / 12 * 10) / 10} an{s.duration >= 24 ? 's' : ''}</p>
              </div>

              {/* Mensualité — valeur principale */}
              <div className="text-center bg-white rounded-lg py-3 mb-3 shadow-sm">
                <p className="text-xs text-gray-500 mb-0.5">Mensualité</p>
                <p className={`text-xl font-bold ${c.header}`}>{fmt(s.monthly)}</p>
                <p className="text-xs text-gray-400">/mois</p>
              </div>

              {/* Détails */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Total intérêts</span>
                  <span className="font-semibold text-orange-600">{fmt(s.totalInterest)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Coût total</span>
                  <span className="font-semibold text-gray-800">{fmt(s.totalCost)}</span>
                </div>
              </div>

              {/* Label */}
              <p className="text-center text-xs text-gray-500 mt-3 pt-2 border-t border-gray-100">
                {labels[i]}
              </p>

              {isCheapest && (
                <div className="mt-2 text-center">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                    💸 Moins d'intérêts
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-gray-400 mt-2 text-center">
        Cliquez sur un scénario pour le sélectionner • Taux {annualRate}%
      </p>
    </div>
  );
};
