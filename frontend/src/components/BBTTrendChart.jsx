import React from 'react';

export default function BBTTrendChart({ bbtData = [] }) {
  const xTicks = [1, 5, 10, 14, 20, 25, 28]; 
  const yTicks = [97.0, 97.5, 98.0, 98.5, 99.0];

  const getX = (day) => {
    const minX = 1;
    const maxX = bbtData.length > 0 ? Math.max(28, ...bbtData.map(d => d.dayOfCycle)) : 28;
    return 45 + ((day - minX) / (maxX - minX)) * (500 - 45 - 20);
  };

  const getY = (temp) => {
    const temps = bbtData.map(d => d.temp);
    const minT = bbtData.length > 0 ? Math.min(97.0, ...temps) - 0.2 : 96.8;
    const maxT = bbtData.length > 0 ? Math.max(99.0, ...temps) + 0.2 : 99.2;
    return 165 - ((temp - minT) / (maxT - minT)) * (165 - 20); // y range from 20 to 165
  };

  return (
    <div className="md:col-span-8 flex flex-col gap-4 w-full">
      <div>
        <h3 className="font-handwriting text-black text-4xl font-black uppercase tracking-wide leading-none mb-1">
          basal body temp trend
        </h3>
        <p className="font-handwriting text-black/60 text-xl">
          Cycle Days (D) vs Waking Temperature (°F)
        </p>
      </div>

      <div className="w-full bg-white/70 border border-black/10 rounded-[2.5rem] p-6 shadow-inner relative min-h-[240px] flex items-center justify-center">
        <svg viewBox="0 0 500 200" className="w-full h-full overflow-visible">
          {/* Grid Lines & Y ticks */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line x1={45} y1={getY(tick)} x2={480} y2={getY(tick)} stroke="rgba(0,0,0,0.07)" strokeDasharray="3,3" />
              <text x={12} y={getY(tick) + 4} className="font-sans text-[10px] font-bold fill-black/40">{tick.toFixed(1)}°</text>
            </g>
          ))}

          {/* X Axis ticks */}
          {xTicks.map((tick, idx) => (
            <g key={idx}>
              <line x1={getX(tick)} y1={20} x2={getX(tick)} y2={165} stroke="rgba(0,0,0,0.03)" />
              <text x={getX(tick)} y={185} textAnchor="middle" className="font-sans text-[10px] font-bold fill-black/40">D{tick}</text>
            </g>
          ))}

          {/* Biphasic Shift Baseline (dashed red line) */}
          <line x1={45} y1={getY(97.8)} x2={480} y2={getY(97.8)} stroke="rgba(220,38,38,0.25)" strokeWidth={1.5} strokeDasharray="4,4" />
          <text x={330} y={getY(97.8) - 4} className="font-handwriting text-lg fill-red-500/70 font-semibold">luteal shift baseline (97.8°F)</text>

          {/* Connected Temperature Trend Line */}
          {bbtData.length > 1 && (
            <path
              d={bbtData.map((d, idx) => `${idx === 0 ? 'M' : 'L'} ${getX(d.dayOfCycle)} ${getY(d.temp)}`).join(' ')}
              fill="none"
              stroke="var(--color-selene-brown)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Temperature Data Dots */}
          {bbtData.map((d, idx) => (
            <g key={idx} className="group/dot cursor-pointer">
              <circle
                cx={getX(d.dayOfCycle)}
                cy={getY(d.temp)}
                r={4.5}
                fill="#1e2722"
                stroke="white"
                strokeWidth={2}
              />
              <title>{`Day ${d.dayOfCycle}: ${d.temp}°F (${new Date(d.dateStr).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'})})`}</title>
            </g>
          ))}

          {/* Empty state overlay inside SVG if no logs exist */}
          {bbtData.length === 0 && (
            <foreignObject x={45} y={20} width={435} height={145}>
              <div className="w-full h-full flex flex-col items-center justify-center text-center p-4">
                <p className="font-handwriting text-black/60 text-2xl font-bold leading-tight">
                  No Basal Body Temperature logs found for this cycle.
                </p>
                <p className="font-handwriting text-black/40 text-lg italic mt-1 leading-snug">
                  Record waking temp daily to visualize the biphasic shift indicating ovulation.
                </p>
              </div>
            </foreignObject>
          )}
        </svg>
      </div>
    </div>
  );
}
