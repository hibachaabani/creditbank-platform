import React from 'react';

interface Props {
  score: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
}

const riskConfig = {
  LOW:       { label: 'Risque faible',      color: '#22c55e', bg: 'bg-green-50',  border: 'border-green-200' },
  MEDIUM:    { label: 'Risque modéré',      color: '#f59e0b', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  HIGH:      { label: 'Risque élevé',       color: '#f97316', bg: 'bg-orange-50', border: 'border-orange-200' },
  VERY_HIGH: { label: 'Risque très élevé',  color: '#ef4444', bg: 'bg-red-50',    border: 'border-red-200' },
};

export const ScoreGauge: React.FC<Props> = ({ score, riskLevel }) => {
  const config = riskConfig[riskLevel];
  const angle = (score / 1000) * 180 - 90; // -90° à 90°
  const r = 80;
  const cx = 100;
  const cy = 100;

  // Arc de fond (demi-cercle)
  const arcPath = (startAngle: number, endAngle: number, color: string) => {
    const s = (startAngle * Math.PI) / 180;
    const e = (endAngle * Math.PI) / 180;
    const x1 = cx + r * Math.cos(s);
    const y1 = cy + r * Math.sin(s);
    const x2 = cx + r * Math.cos(e);
    const y2 = cy + r * Math.sin(e);
    return <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`} stroke={color} strokeWidth="16" fill="none" strokeLinecap="round" />;
  };

  // Aiguille
  const needleAngle = ((score / 1000) * 180 + 180) * (Math.PI / 180);
  const nx = cx + 65 * Math.cos(needleAngle);
  const ny = cy + 65 * Math.sin(needleAngle);

  return (
    <div className={`rounded-xl border p-6 ${config.bg} ${config.border}`}>
      <div className="flex flex-col items-center">
        <svg viewBox="0 0 200 120" className="w-52 h-32">
          {/* Arcs colorés */}
          {arcPath(180, 225, '#22c55e')}
          {arcPath(225, 270, '#f59e0b')}
          {arcPath(270, 315, '#f97316')}
          {arcPath(315, 360, '#ef4444')}
          {/* Aiguille */}
          <line x1={cx} y1={cy} x2={nx} y2={ny}
            stroke={config.color} strokeWidth="3" strokeLinecap="round" />
          <circle cx={cx} cy={cy} r="5" fill={config.color} />
        </svg>

        <div className="text-center -mt-4">
          <p className="text-5xl font-bold" style={{ color: config.color }}>{score}</p>
          <p className="text-sm text-gray-500 mt-1">sur 1000</p>
          <div className={`mt-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium`}
            style={{ backgroundColor: config.color + '20', color: config.color }}>
            {config.label}
          </div>
        </div>
      </div>
    </div>
  );
};
