import Sidebar from './Sidebar';
import ThemeToggle from './ThemeToggle';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <ThemeToggle />
        {children}
      </div>
    </div>
  );
}