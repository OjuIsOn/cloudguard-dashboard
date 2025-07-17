'use client';

import { useState } from 'react';
import { Pie } from '@visx/shape';
import { Group } from '@visx/group';
import { Text } from '@visx/text';
import { animated, useSpring } from '@react-spring/web';

// animated SVG wrapper
const APath = animated('path');

/* ---------- props ---------- */
type Props = {

  budget: number;

  cost: number;

  label?: string;

  size?: number;
};

export default function BudgetPie({
  budget,
  cost,
  label = 'App',
  size = 320,
}: Props) {
  const half = size / 2;

  const spent = cost;
  const remaining = Math.max(budget - cost, 0);

  const data = [
    { key: 'cost', label: 'Spent', value: spent, color: '#f95d6a' },
    { key: 'remain', label: 'Remaining', value: remaining, color: '#2ca02c' },
  ];


  const [active, setActive] = useState<'cost' | 'remain' | null>(null);


  return (
    <svg width={size} height={size} xmlns="http://www.w3.org/2000/svg">
      <Group top={half} left={half}>
        <Pie<typeof data[number]>
          data={data}
          pieValue={(d) => d.value}
          outerRadius={half}
          innerRadius={({ data }) =>
            half - (active === data.key ? 14 : 8) 
          }
          padAngle={0.02}
        >
          {(pie) =>
            pie.arcs.map((arc, i) => {
             
              const spring = useSpring({
                from: { end: arc.startAngle },
                to: { end: arc.endAngle },
                delay: i * 60,
              });

              
              const d = spring.end.to((e) =>
                pie.path({ ...arc, endAngle: e }) ?? '',
              );

              return (
                <g
                  key={arc.data.key}
                  onMouseEnter={() => setActive(arc.data.key as 'cost' || 'remain')}
                  onMouseLeave={() => setActive(null)}
                  style={{ cursor: 'pointer' }}
                >
                  <APath d={d} fill={arc.data.color} />
                </g>
              );
            })
          }
        </Pie>

        {/* centre text */}
        {active ? (
          <Text
            textAnchor="middle"
            fill={active === 'cost' ? '#f95d6a' : '#2ca02c'}
            fontSize={24}
          >
            {`₹${active === 'cost' ? spent : remaining}`}
          </Text>
        ) : (
          <>
            <Text textAnchor="middle" fill="#ffffff" fontSize={28} dy="-14">
              {`₹${budget}`}
            </Text>
            <Text textAnchor="middle" fill="#aaaaaa" fontSize={16} dy="18">
              {label}
            </Text>
          </>
        )}
      </Group>
    </svg>
  );
}
