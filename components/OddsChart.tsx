
import type { FC } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface OddsChartProps {
  opening: number | null;
  current: number | null;
}

const OddsChart: FC<OddsChartProps> = ({ opening, current }) => {
  if (!Number.isFinite(opening) && !Number.isFinite(current)) return <div className="h-16 w-32" />;

  const data = [
    { time: 'Opening', odds: opening },
    { time: 'Current', odds: current },
  ];

  return (
    <div className="h-16 w-32">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line 
            type="monotone" 
            dataKey="odds" 
            stroke={current < opening ? "#10b981" : "#ef4444"} 
            strokeWidth={2} 
            dot={false} 
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default OddsChart;
