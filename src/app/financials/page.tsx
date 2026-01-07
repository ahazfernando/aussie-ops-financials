"use client";

import dynamic from 'next/dynamic';

const ProtectedRoute = dynamic(() => import("@/components/ProtectedRoute").then(mod => ({ default: mod.ProtectedRoute })), {
  ssr: false,
});

const DashboardLayout = dynamic(() => import("@/components/DashboardLayout").then(mod => ({ default: mod.DashboardLayout })), {
  ssr: false,
});

const Financials = dynamic(() => import("@/pages/Financials"), {
  ssr: false,
});

export default function FinancialsPage() {
  return (
    <ProtectedRoute>
      <DashboardLayout>
        <Financials />
      </DashboardLayout>
    </ProtectedRoute>
  );
}
