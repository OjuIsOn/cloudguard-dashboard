'use client';

import { useState, useMemo } from 'react';
import { Pie } from '@visx/shape';
import { Group } from '@visx/group';
import { Text } from '@visx/text';
import { animated, useSpring } from '@react-spring/web';
import { ResourceType } from '@/models/resourceGroup';

// Extend ResourceType to include a `color` field
type ChartApp = ResourceType & { color: string };

// Define a list of colors (you can add more or use a color generator)
const colorPalette = [
  '#0033ad', // deep blue
  '#00ffbd', // aqua
  '#F7931A', // bitcoin orange
  '#ffa600', // amber
  '#f95d6a', // coral
  '#2f4b7c', // navy
  '#665191', // purple
  '#a05195', // magenta
  '#d45087', // raspberry
  '#ff7c43', // orange-peach
  '#1f77b4', // muted blue
  '#aec7e8', // light blue
  '#2ca02c', // forest green
  '#98df8a', // mint
  '#ffbb78', // light orange
  '#8c564b', // brown
  '#e377c2', // pink
  '#7f7f7f', // gray
  '#bcbd22', // olive
  '#17becf', // cyan
];


const APath = animated('path');

// 👇 Accept props properly
export default function Home({ coins }: { coins: ResourceType[] }) {
  const [active, setActive] = useState<ChartApp | null>(null);
  const size = 400;
  const half = size / 2;

  // 💡 Attach colors to each coin deterministically
  const chartData: ChartApp[] = useMemo(
    () =>
      coins.map((c, i) => ({
        ...c,
        color: colorPalette[i % colorPalette.length],
      })),
    [coins]
  );

  return (
    <div >
        <main className="flex items-center justify-center py-8">    
      <svg width={size} height={size} xmlns="http://www.w3.org/2000/svg">
        <Group top={half} left={half}>
          <Pie
            data={chartData}
            pieValue={(d) => typeof d.budget === 'number' ? d.budget : 0}
            outerRadius={half}
            innerRadius={({ data }) =>
              half - (active && active.name === data.name ? 12 : 8)
            }
            padAngle={0.02}
          >
            {(pie) =>
              pie.arcs.map((arc, i) => {
                const springs = useSpring({
                  from: { angle: arc.startAngle },
                  to: { angle: arc.endAngle },
                  delay: i * 80,
                  config: { tension: 220, friction: 26 },
                });

                const d = springs.angle.to((e) =>
                  pie.path({ ...arc, endAngle: e }) ?? ''
                );

                return (
                  <g
                    key={arc.data._id || `${arc.data.name}-${i}`}
                    onMouseEnter={() => setActive(arc.data)}
                    onMouseLeave={() => setActive(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <APath d={d} fill={arc.data.color} />
                  </g>
                );
              })
            }
          </Pie>

          {/* center labels */}
          {active ? (
            <>
              <Text textAnchor="middle" fill="#fff" fontSize={36} dy="-25">
                {`₹${Math.floor(active.budget ?? 0)} Limit`}
              </Text>
              <Text textAnchor="middle" fill={active.color} fontSize={18} dy="5">
                {`₹${Math.floor(active.cost ?? 0)} Spent`}
              </Text>
              <Text textAnchor="middle" fill="#aaa" fontSize={16} dy="30">
                {active.name}
              </Text>
            </>
          ) : (
            <>
              <Text textAnchor="middle" fill="#fff" fontSize={36} dy="-20">
                {`₹${Math.floor(chartData.reduce((s, c) => s + (c.budget ?? 0), 0))}`}
              </Text>
              <Text textAnchor="middle" fill="#aaa" fontSize={18} dy="15">
                Total Budget
              </Text>
            </>
          )}
        </Group>
      </svg>
    </main>
    </div>
  );
}
