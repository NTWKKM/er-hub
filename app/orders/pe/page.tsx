import DashboardLayout from '@/components/DashboardLayout';
import PeOrder from '@/components/orders/PeOrder';

export default function PePage() {
  return (
    <DashboardLayout>
      <PeOrder />
    </DashboardLayout>
  );
}
