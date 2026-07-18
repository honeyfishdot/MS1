/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LayoutDashboard, Wallet, Settings, ShieldCheck, Cpu, Sliders, AlertTriangle, Power } from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isEmbedded: boolean;
  themeMode: 'dark' | 'bright' | 'dusty-blue';
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  width?: number;
  onWidthChange?: (width: number) => void;
  onKillSwitch?: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, isEmbedded, themeMode, isCollapsed, onToggleCollapse, width = 256, onWidthChange, onKillSwitch }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'command', label: 'Command', icon: Sliders },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'compliance', label: 'Compliance', icon: ShieldCheck },
  ];

  const getThemeStyles = () => {
    switch (themeMode) {
      case 'bright':
        return {
          aside: 'border-r border-slate-300 bg-slate-100 flex flex-col justify-between h-screen sticky top-0',
          border: 'border-slate-300',
          brandHeader: 'p-6 border-b border-slate-300',
          title: 'text-slate-900',
          btnActive: 'bg-white text-teal-600 border border-slate-300 shadow-sm',
          btnInactive: 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50 border border-transparent',
          card: 'bg-white border border-slate-300 p-4 rounded-xl',
          borderT: 'border-t border-slate-300'
        };
      case 'dusty-blue':
        return {
          aside: 'border-r border-[#475569] bg-[#1e293b] flex flex-col justify-between h-screen sticky top-0',
          border: 'border-[#475569]',
          brandHeader: 'p-6 border-b border-[#475569]',
          title: 'text-white',
          btnActive: 'bg-[#334155] text-sky-300 border border-[#475569]',
          btnInactive: 'text-slate-300 hover:text-white hover:bg-[#334155]/50 border border-transparent',
          card: 'bg-[#334155] border border-[#475569] p-4 rounded-xl',
          borderT: 'border-t border-[#475569]'
        };
      case 'dark':
      default:
        return {
          aside: 'border-r border-slate-700 bg-slate-900 flex flex-col justify-between h-screen sticky top-0',
          border: 'border-slate-700',
          brandHeader: 'p-6 border-b border-slate-700',
          title: 'text-white',
          btnActive: 'bg-slate-800 text-teal-400 border border-teal-500/30',
          btnInactive: 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent',
          card: 'bg-slate-800 border border-slate-700 p-4 rounded-xl',
          borderT: 'border-t border-slate-700'
        };
    }
  };

  const styles = getThemeStyles();
  const sidebarWidth = isCollapsed ? 64 : width;

  return (
    <aside className={`${styles.aside} transition-all duration-300`} id="app-sidebar" style={{ width: `${sidebarWidth}px` }}>
      <div>
        {/* Sidebar Brand Header */}
        <div className={`${styles.brandHeader} flex items-center justify-between`}>
          {!isCollapsed && (
            <div className="flex items-center space-x-3">
              <div className="bg-teal-950/50 p-2 rounded-lg border border-teal-500/30">
                <Cpu className="h-6 w-6 text-teal-400" />
              </div>
              <div>
                <h1 className={`font-sans font-bold text-sm tracking-tight leading-none ${styles.title}`}>
                  AllBright V01
                </h1>
                <span className="text-[8px] font-mono font-medium text-amber-500/90 tracking-widest uppercase">
                  140M/1ms/2026
                </span>
              </div>
            </div>
          )}
          {isCollapsed && (
            <div className="w-full flex justify-center">
              <div className="bg-teal-950/50 p-2 rounded-lg border border-teal-500/30">
                <Cpu className="h-6 w-6 text-teal-400" />
              </div>
            </div>
          )}
        </div>

        {/* Navigation Menu */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-nav-${item.id}`}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive ? styles.btnActive : styles.btnInactive
                } ${isCollapsed ? 'justify-center' : ''}`}
                title={isCollapsed ? item.label : ''}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-teal-400' : 'text-slate-500'}`} />
                {!isCollapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {isEmbedded && !isCollapsed && (
        <div className="p-4 text-center">
          <div className="inline-flex items-center space-x-1.5 px-2 py-1 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded-full text-[9px] font-mono">
            <span className="h-1.5 w-1.5 bg-teal-400 rounded-full animate-pulse" />
            <span>Embedded Mode</span>
          </div>
        </div>
      )}

      {/* Kill Switch Button */}
      {!isCollapsed && onKillSwitch && (
        <div className="px-4 pt-2">
          <button
            onClick={() => {
              const confirmed = window.confirm('⚠️ EMERGENCY KILL SWITCH\n\nThis will immediately halt all arbitrage operations and close all open positions.\n\nAre you sure you want to proceed?');
              if (confirmed) {
                onKillSwitch();
              }
            }}
            className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-bold transition-all bg-rose-500/10 text-rose-400 border border-rose-500/30 hover:bg-rose-500/20 hover:border-rose-500/50 hover:text-rose-300 cursor-pointer"
            title="Emergency kill switch - halts all operations"
          >
            <Power className="h-3.5 w-3.5" />
            <span>KILL SWITCH</span>
            <AlertTriangle className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Collapse Toggle Button */}
      <div className="p-4 border-t border-slate-800/10">
        <button
          onClick={onToggleCollapse}
          className={`w-full flex items-center justify-center py-2 rounded-lg text-xs font-bold transition-all ${
            isCollapsed 
              ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-slate-200'
          }`}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? (
            <span className="text-[10px]">▶</span>
          ) : (
            <span className="text-[10px]">◀ Collapse</span>
          )}
        </button>
      </div>

      {/* Resize Handle */}
      {!isCollapsed && (
        <div
          className="absolute top-0 right-0 w-1 h-full cursor-ew-resize hover:bg-teal-500/30 transition-colors group"
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = width;

            const handleMouseMove = (moveEvent: MouseEvent) => {
              const delta = moveEvent.clientX - startX;
              const newWidth = Math.min(Math.max(startWidth + delta, 200), 400);
              onWidthChange?.(newWidth);
            };

            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };

            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          title="Drag to resize sidebar"
        >
          <div className="absolute top-1/2 -translate-y-1/2 -right-1 w-3 h-8 bg-slate-800/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      )}
    </aside>
  );
}
