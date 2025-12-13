
import React from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Tooltip } from 'recharts';
import { SongConcept } from '../types';

interface VisualizerProps {
  data: SongConcept['moodAnalysis'];
}

const Visualizer: React.FC<VisualizerProps> = ({ data }) => {
  const chartData = [
    { subject: 'Energy', A: data.energy, fullMark: 100 },
    { subject: 'Valence', A: data.valence, fullMark: 100 },
    { subject: 'Danceability', A: data.danceability, fullMark: 100 },
    { subject: 'Acousticness', A: data.acousticness, fullMark: 100 },
    { subject: 'Instrumental', A: data.instrumentalness, fullMark: 100 },
  ];

  return (
    <div className="w-full h-80 bg-gradient-to-br from-musaix-card to-black rounded-2xl border border-white/10 p-6 relative overflow-hidden group shadow-2xl">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-musaix-accent/5 blur-[50px] rounded-full pointer-events-none group-hover:bg-musaix-accent/10 transition-colors duration-700"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-musaix-cyan/5 blur-[40px] rounded-full pointer-events-none group-hover:bg-musaix-cyan/10 transition-colors duration-700"></div>
      
      <div className="flex justify-between items-center mb-4 relative z-10">
        <h3 className="text-white/90 text-xs font-mono uppercase tracking-widest flex items-center gap-2 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-musaix-accent animate-pulse shadow-[0_0_8px_#d009e2]"></span>
          Audio Profile
        </h3>
        <span className="text-[10px] text-musaix-cyan font-mono border border-musaix-cyan/20 bg-musaix-cyan/5 px-2 py-0.5 rounded-full flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-musaix-cyan"></span>
          LIVE
        </span>
      </div>

      <div className="w-full h-[calc(100%-2rem)]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={chartData}>
            <defs>
              <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#d009e2" stopOpacity={0.7}/>
                <stop offset="100%" stopColor="#0693e3" stopOpacity={0.3}/>
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            <PolarGrid 
              gridType="polygon" 
              stroke="#ffffff" 
              strokeOpacity={0.08} 
            />
            
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ 
                fill: '#9ca3af', 
                fontSize: 11, 
                fontFamily: 'JetBrains Mono', 
                fontWeight: 500,
                dy: 4 
              }} 
            />
            
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={false} 
              axisLine={false} 
            />
            
            <Radar
              name="Track Profile"
              dataKey="A"
              stroke="#d009e2"
              strokeWidth={2}
              fill="url(#radarFill)"
              fillOpacity={1}
              isAnimationActive={true}
              animationDuration={1500}
              animationEasing="ease-out"
              filter="url(#glow)"
            />
            
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(15, 15, 22, 0.95)', 
                border: '1px solid rgba(255, 255, 255, 0.1)', 
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(8px)',
                padding: '12px'
              }}
              itemStyle={{ color: '#fff', fontSize: '13px', fontFamily: 'Inter', fontWeight: 500 }}
              cursor={false}
              labelStyle={{ display: 'none' }}
              formatter={(value: number) => [<span className="text-musaix-accent font-mono">{value}/100</span>, 'Score']}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default Visualizer;
