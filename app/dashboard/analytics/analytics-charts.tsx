'use client'
import {
  BarChart, Bar,
  LineChart, Line,
  XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import type { UserStat, MonthlyPoint } from '@/lib/analytics'

const COLORS = {
  requests: '#3b82f6',
  corrections: '#ef4444',
  updates: '#a855f7',
  titles: '#22c55e',
}

const tooltipStyle = {
  backgroundColor: 'hsl(var(--card))',
  border: '1px solid hsl(var(--border))',
  borderRadius: '8px',
  color: 'hsl(var(--foreground))',
}

export function UserBarChart({ data }: { data: UserStat[] }) {
  return (
    <ResponsiveContainer width='100%' height={280}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--border))' />
        <XAxis dataKey='userName' tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey='requests' name='Pedidos' fill={COLORS.requests} radius={[4, 4, 0, 0]} />
        <Bar dataKey='corrections' name='Correções' fill={COLORS.corrections} radius={[4, 4, 0, 0]} />
        <Bar dataKey='updates' name='Atualizações' fill={COLORS.updates} radius={[4, 4, 0, 0]} />
        <Bar dataKey='titles' name='Títulos' fill={COLORS.titles} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function MonthlyLineChart({ data }: { data: MonthlyPoint[] }) {
  return (
    <ResponsiveContainer width='100%' height={280}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray='3 3' stroke='hsl(var(--border))' />
        <XAxis dataKey='month' tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} />
        <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} />
        <Tooltip contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line type='monotone' dataKey='requests' name='Pedidos' stroke={COLORS.requests} strokeWidth={2} dot={false} />
        <Line type='monotone' dataKey='corrections' name='Correções' stroke={COLORS.corrections} strokeWidth={2} dot={false} />
        <Line type='monotone' dataKey='updates' name='Atualizações' stroke={COLORS.updates} strokeWidth={2} dot={false} />
        <Line type='monotone' dataKey='titles' name='Títulos' stroke={COLORS.titles} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
