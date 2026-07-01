import DashboardLayout from '@/components/DashboardLayout';

export default function Home() {
  return (
    <DashboardLayout>
      <div className="card">
        <h1 className="card-header">MNRH-ED Standing Order Hub</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
          เลือก standing order จากเมนูด้านซ้าย
        </p>
      </div>
    </DashboardLayout>
  );
}