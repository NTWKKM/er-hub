'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/orders/rtpa', label: 'rt-PA Stroke FAST TRACK' },
  { href: '/orders/stemi', label: 'STEMI Standing Order' },
  { href: '/orders/nstemi', label: 'NSTEMI Standing Order' },
  { href: '/orders/pe', label: 'Massive PE Fibrinolysis' },
  { href: '/orders/heparin', label: 'Heparin Protocol' },
  { href: '/orders/antivenom', label: 'Antivenom Standing Order' },
  { href: '/orders/sedation', label: 'Post-Intubation Sedation' },
  { href: '/tools/drip-calculator', label: 'IV Infusion Drip Calculator' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="sidebar">
      <div className="sidebar-header">
        <img src={`${process.env.NEXT_PUBLIC_BASE_PATH || ''}/logo.png`} alt="MNRH" />
        <h2>MNRH-ED</h2>
        <p>Standing Order Hub</p>
      </div>
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href || pathname === item.href + '/';
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${isActive ? 'active' : ''}`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}