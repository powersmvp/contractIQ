'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Scale,
  Home,
  Settings,
  BarChart3,
  FileText,
  Menu,
  X,
  HelpCircle,
} from 'lucide-react';

const MAIN_NAV = [
  { href: '/', label: 'Início', icon: Home },
  { href: '/qa', label: 'Qualidade', icon: BarChart3 },
];

const WORKSPACE_NAV = [
  { href: '/', label: 'Análises', icon: FileText, matchExact: true },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(href: string, matchExact?: boolean) {
    if (matchExact || href === '/') return pathname === href;
    return pathname.startsWith(href);
  }

  const sidebar = (
    <aside
      aria-label="Menu principal"
      className="flex h-full w-[220px] shrink-0 flex-col"
      style={{
        backgroundColor: '#0F172A',
      }}
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-lg"
          style={{ backgroundColor: 'var(--md-secondary)', color: '#0F172A' }}
        >
          <Scale className="h-4 w-4" />
        </div>
        <span className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
          contract-agent
        </span>
      </div>

      {/* Main nav */}
      <nav aria-label="Navegação principal" className="flex-1 space-y-0.5 px-2">
        {MAIN_NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={active ? 'page' : undefined}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: active ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                color: active ? '#14B8A6' : '#94A3B8',
              }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </a>
          );
        })}

        {/* Section header */}
        <div
          className="px-2.5 pt-5 pb-1 text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: '#64748B' }}
        >
          Área de Trabalho
        </div>

        {WORKSPACE_NAV.map(({ href, label, icon: Icon, matchExact }) => {
          const active = isActive(href, matchExact);
          return (
            <a
              key={`ws-${href}`}
              href={href}
              onClick={() => setOpen(false)}
              aria-current={active ? 'page' : undefined}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors"
              style={{
                backgroundColor: active ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
                color: active ? '#14B8A6' : '#94A3B8',
              }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </a>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="space-y-2 border-t px-2 py-3"
        style={{ borderColor: '#1E293B' }}
      >
        <a
          href="/config"
          onClick={() => setOpen(false)}
          aria-current={isActive('/config') ? 'page' : undefined}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors"
          style={{
            backgroundColor: isActive('/config') ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
            color: isActive('/config') ? '#14B8A6' : '#94A3B8',
          }}
        >
          <Settings className="h-4 w-4" />
          Configuração
        </a>
        <a
          href="/help"
          onClick={() => setOpen(false)}
          aria-current={isActive('/help') ? 'page' : undefined}
          className="flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-colors"
          style={{
            backgroundColor: isActive('/help') ? 'rgba(20, 184, 166, 0.15)' : 'transparent',
            color: isActive('/help') ? '#14B8A6' : '#94A3B8',
          }}
        >
          <HelpCircle className="h-4 w-4" />
          Ajuda
        </a>
        <div className="px-2.5 text-[11px]" style={{ color: '#64748B' }}>
          Comitê Multi-IA
        </div>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-screen sticky top-0">
        {sidebar}
      </div>

      {/* Mobile hamburger */}
      <div className="md:hidden sticky top-0 z-20">
        <div
          className="flex items-center gap-2 px-3 py-2"
          style={{ backgroundColor: '#0F172A' }}
        >
          <button
            onClick={() => setOpen(!open)}
            aria-label={open ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={open}
            className="rounded-md p-1.5 transition-colors"
            style={{ color: '#94A3B8' }}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4" style={{ color: '#14B8A6' }} />
            <span className="text-sm font-semibold" style={{ color: '#FFFFFF' }}>
              contract-agent
            </span>
          </div>
        </div>

        {/* Mobile overlay */}
        {open && (
          <>
            <div
              className="fixed inset-0 z-30 bg-black/40"
              onClick={() => setOpen(false)}
            />
            <div className="fixed left-0 top-0 z-40 h-full">
              {sidebar}
            </div>
          </>
        )}
      </div>
    </>
  );
}
