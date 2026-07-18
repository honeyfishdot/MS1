/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Activity, ShieldCheck, Zap } from 'lucide-react';

interface FooterProps {
  themeMode: 'dark' | 'bright' | 'dusty-blue';
  backendUnreachable?: boolean;
}

export default function Footer({ themeMode, backendUnreachable }: FooterProps) {
  const getThemeClasses = () => {
    switch (themeMode) {
      case 'bright':
        return {
          footer: 'border-t border-slate-300 bg-white text-slate-600',
          textMuted: 'text-slate-500',
        };
      case 'dusty-blue':
        return {
          footer: 'border-t border-[#475569] bg-[#1e293b] text-slate-300',
          textMuted: 'text-slate-400',
        };
      case 'dark':
      default:
        return {
          footer: 'border-t border-slate-700 bg-slate-900 text-slate-400',
          textMuted: 'text-slate-500',
        };
    }
  };

  const styles = getThemeClasses();

  return (
    <footer className={`mt-auto pt-4 pb-3 px-6 flex flex-col md:flex-row items-center justify-between text-[9px] font-mono tracking-wider shrink-0 ${styles.footer}`} id="app-branding-footer">
      <div className="flex items-center space-x-4">
        <span>AllBright Defi Software Engineering Ltd. 2026</span>
        <span className={`hidden md:inline ${styles.textMuted}`}>|</span>
        <span className={`hidden md:inline ${styles.textMuted}`}>AllBright V01/140M/1ms/2026</span>
      </div>
      <div className="flex items-center space-x-4 mt-1 md:mt-0">
        <div className="flex items-center space-x-1">
          <Activity className={`h-3 w-3 ${backendUnreachable ? 'text-rose-400' : 'text-emerald-400'}`} />
          <span className={backendUnreachable ? 'text-rose-400' : 'text-emerald-400'}>
            {backendUnreachable ? 'OFFLINE' : 'ONLINE'}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <ShieldCheck className="h-3 w-3 text-teal-400" />
          <span className="text-teal-400">SECURE</span>
        </div>
        <div className="flex items-center space-x-1">
          <Zap className="h-3 w-3 text-amber-400" />
          <span className="text-amber-400">LIVE</span>
        </div>
      </div>
    </footer>
  );
}
