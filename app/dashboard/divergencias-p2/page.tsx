'use client';

import Link from 'next/link';
import { BarChart2, Server } from 'lucide-react';

const cards = [
  {
    href: '/dashboard/divergencias-p2/temporadas',
    icon: BarChart2,
    iconColor: 'text-yellow-400',
    borderHover: 'hover:border-yellow-500/50',
    emoji: '⚠️',
    title: 'Divergências de Temporadas',
    description: 'Séries com diferença entre temporadas/episódios do banco e o TMDB. Revise e sincronize os dados.',
  },
  {
    href: '/dashboard/divergencias-p2/mapeamento?server=b2p',
    icon: Server,
    iconColor: 'text-orange-400',
    borderHover: 'hover:border-orange-500/50',
    emoji: '🟠',
    title: 'Títulos no B2P sem P2B',
    description: 'Títulos presentes no B2P que ainda não possuem cobertura no P2B. Identifique lacunas no catálogo.',
  },
  {
    href: '/dashboard/divergencias-p2/mapeamento?server=p2b',
    icon: Server,
    iconColor: 'text-blue-400',
    borderHover: 'hover:border-blue-500/50',
    emoji: '🔵',
    title: 'Títulos no P2B sem B2P',
    description: 'Títulos presentes no P2B que ainda não possuem cobertura no B2P. Planeje importações pendentes.',
  },
];

export default function DivergenciasP2Page() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Divergências P2</h1>
        <p className="text-muted-foreground mt-1">
          Ferramentas de análise e comparação entre servidores e banco de dados.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className={`group relative flex flex-col items-start gap-4 p-6 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 ${card.borderHover} transition-all`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{card.emoji}</span>
              <card.icon className={`w-5 h-5 ${card.iconColor}`} />
            </div>
            <div>
              <p className="text-base font-semibold">{card.title}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {card.description}
              </p>
            </div>
            <span className="absolute top-4 right-4 text-muted-foreground group-hover:text-foreground transition-colors">→</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
