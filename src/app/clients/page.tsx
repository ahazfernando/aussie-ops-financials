"use client";

import dynamic from 'next/dynamic';

const ProtectedRoute = dynamic(() => import("@/components/ProtectedRoute").then(mod => ({ default: mod.ProtectedRoute })), {
  ssr: false,
});

const DashboardLayout = dynamic(() => import("@/components/DashboardLayout").then(mod => ({ default: mod.DashboardLayout })), {
  ssr: false,
});

const Clients = dynamic(() => import("@/pages/Clients"), {
  ssr: false,
});

export default function ClientsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Clients />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
