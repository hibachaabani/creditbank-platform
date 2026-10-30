import React, { useState } from 'react';

interface Props {
  capital: number;
  duration: number;
  annualRate: number;
}

// Format pour l'axe Y — valeur exacte arrondie
const fmtShort = (n: number) =>
  new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(Math.round(n));

// Format exact pour le tooltip (ex: 1 952 TND)
const fmtExact = (n: number) =>
  new Intl.NumberFormat('fr-TN', { maximumFractionDigits: 0 }).format(Math.round(n));

export const GraphiqueAmortissement: React.FC<Props> = ({ capital, duration, annualRate }) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; mois: number; restant: number; interets: number } | null>(null);

  if (!capital || capital <= 0 || duration <= 0) return null;

  // Calculer le tableau d'amortissement 
  const r = annualRate / 100 / 12;
  const M = capital * (r * Math.pow(1 + r, duration)) / (Math.pow(1 + r, duration) - 1);
  const points: { mois: number; restant: number; interetsCumules: number }[] = [];
  let restant = capital;
  let interetsCumules = 0;

  // Prendre max 60 points pour lisibilité
  const step = Math.max(1, Math.floor(duration / 60));
  for (let mois = 0; mois <= duration; mois++) {
    if (mois % step === 0 || mois === duration) {
      points.push({ mois, restant: Math.max(0, restant), interetsCumules });
    }
    if (mois < duration) {
      const interets = restant * r;
      interetsCumules += interets;
      restant -= (M - interets);
    }
  }

  // Dimensions SVG
  const W = 500;
  const H = 220;
  const padL = 70;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const chartW = W - padL - padR;
  const chartH = H - padT - padB;

  const maxY = capital;
  const toX = (mois: number) => padL + (mois / duration) * chartW;
  const toY = (val: number) => padT + chartH - (val / maxY) * chartH;

  // Lignes pour capital restant
  const capitalPath = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${toX(p.mois)},${toY(p.restant)}`
  ).join(' ');

  // Zone remplie capital
  const capitalArea = capitalPath +
    ` L${toX(duration)},${padT + chartH} L${padL},${padT + chartH} Z`;

  // Lignes intérêts cumulés (normalisé sur maxY)
  const maxInterets = points[points.length - 1].interetsCumules;
  const interetsPath = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'}${toX(p.mois)},${toY((p.interetsCumules / Math.max(maxInterets, 1)) * capital * 0.5)}`
  ).join(' ');

  // Labels axe Y
  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  // Labels axe X
  const xStep = duration <= 60 ? 12 : duration <= 120 ? 24 : 60;
  const xTicks: number[] = [];
  for (let m = 0; m <= duration; m += xStep) xTicks.push(m);
  if (!xTicks.includes(duration)) xTicks.push(duration);

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1 h-5 bg-purple-500 rounded-full" />
        <p className="text-sm font-semibold text-gray-800">Évolution du capital restant</p>
      </div>

      {/* Légende */}
      <div className="flex items-center gap-5 mb-2 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-2 rounded-full bg-blue-500 opacity-60" />
          Capital restant à rembourser
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 bg-orange-500" />
          Intérêts cumulés (indicatif)
        </div>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full rounded-xl border border-gray-200 bg-white"
          onMouseLeave={() => setTooltip(null)}
        >
          {/* Grille horizontale */}
          {yTicks.map(t => (
            <g key={t}>
              <line
                x1={padL} y1={toY(t * maxY)}
                x2={padL + chartW} y2={toY(t * maxY)}
                stroke="#f0f0f0" strokeWidth="1"
              />
              <text
                x={padL - 5} y={toY(t * maxY) + 4}
                textAnchor="end" fontSize="9" fill="#9ca3af"
              >
                {fmtShort(t * maxY)}
              </text>
            </g>
          ))}

          {/* Zone capital */}
          <path d={capitalArea} fill="#3b82f6" fillOpacity="0.15" />

          {/* Ligne capital */}
          <path d={capitalPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />

          {/* Ligne intérêts */}
          <path d={interetsPath} fill="none" stroke="#f97316" strokeWidth="1.5" strokeDasharray="4 2" />

          {/* Axe X */}
          {xTicks.map(m => (
            <g key={m}>
              <text
                x={toX(m)} y={H - 8}
                textAnchor="middle" fontSize="9" fill="#9ca3af"
              >
                {m === 0 ? 'Début' : m === duration ? 'Fin' : `M${m}`}
              </text>
              <line
                x1={toX(m)} y1={padT + chartH}
                x2={toX(m)} y2={padT + chartH + 4}
                stroke="#e5e7eb" strokeWidth="1"
              />
            </g>
          ))}

          {/* Axe gauche */}
          <line x1={padL} y1={padT} x2={padL} y2={padT + chartH} stroke="#e5e7eb" strokeWidth="1" />

          {/* Zone interactive invisible pour tooltip */}
          {points.map(p => (
            <rect
              key={p.mois}
              x={toX(p.mois) - 10} y={padT}
              width={20} height={chartH}
              fill="transparent"
              onMouseEnter={() => setTooltip({
                x: toX(p.mois),
                y: toY(p.restant),
                mois: p.mois,
                restant: p.restant,
                interets: p.interetsCumules,
              })}
            />
          ))}

          {/* Tooltip amélioré */}
          {tooltip && (() => {
            const txAnchor = tooltip.x > W - 145 ? tooltip.x - 140 : tooltip.x + 8;
            const tyAnchor = Math.max(padT, Math.min(tooltip.y - 10, padT + chartH - 70));
            const cx = txAnchor + 68;
            const rembourse = capital - tooltip.restant;
            const pct = Math.round((rembourse / capital) * 100);
            return (
              <g>
                {/* Ligne verticale */}
                <line
                  x1={tooltip.x} y1={padT}
                  x2={tooltip.x} y2={padT + chartH}
                  stroke="#6366f1" strokeWidth="1" strokeDasharray="3 2"
                />
                {/* Point sur la courbe */}
                <circle cx={tooltip.x} cy={tooltip.y} r="5" fill="white" stroke="#3b82f6" strokeWidth="2" />

                {/* Bulle */}
                <rect
                  x={txAnchor} y={tyAnchor}
                  width={136} height={72} rx="8"
                  fill="white" stroke="#e5e7eb" strokeWidth="1"
                  style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.12))' }}
                />

                {/* En-tête — Mois */}
                <rect x={txAnchor} y={tyAnchor} width={136} height={20} rx="8" fill="#6366f1" />
                <rect x={txAnchor} y={tyAnchor + 12} width={136} height={8} fill="#6366f1" />
                <text x={cx} y={tyAnchor + 14} textAnchor="middle" fontSize="10" fontWeight="700" fill="white">
                  Mois {tooltip.mois} — {pct}% remboursé
                </text>

                {/* Capital restant */}
                <text x={txAnchor + 8} y={tyAnchor + 34} fontSize="9" fill="#6b7280">Capital restant</text>
                <text x={txAnchor + 128} y={tyAnchor + 34} textAnchor="end" fontSize="9" fontWeight="700" fill="#3b82f6">
                  {fmtExact(tooltip.restant)} TND
                </text>

                {/* Capital remboursé */}
                <text x={txAnchor + 8} y={tyAnchor + 48} fontSize="9" fill="#6b7280">Remboursé</text>
                <text x={txAnchor + 128} y={tyAnchor + 48} textAnchor="end" fontSize="9" fontWeight="700" fill="#10b981">
                  {fmtExact(rembourse)} TND
                </text>

                {/* Intérêts cumulés */}
                <text x={txAnchor + 8} y={tyAnchor + 62} fontSize="9" fill="#6b7280">Intérêts payés</text>
                <text x={txAnchor + 128} y={tyAnchor + 62} textAnchor="end" fontSize="9" fontWeight="700" fill="#f97316">
                  {fmtExact(tooltip.interets)} TND
                </text>
              </g>
            );
          })()}
        </svg>
      </div>

      <p className="text-xs text-gray-400 mt-1.5 text-center">
        Passez la souris sur le graphique pour voir les détails par mois
      </p>
    </div>
  );
};
