import { LucideIcon } from "lucide-react";

export type TargetVsActualStatus = "on-track" | "risk" | "off-track";

export interface KPI {
  id: string;
  title: string;
  target: number;
  actual: number;
  unit?: string;
  iconName?: string; // Name of the Lucide icon (e.g., "DollarSign", "CheckSquare")
  status?: TargetVsActualStatus; // Optional override status
  riskThreshold?: number; // Custom threshold for "risk" status (default: 0.7)
  description?: string;
  category?: string; // e.g., "Revenue", "Operations", "Team Performance"
  month?: string; // YYYY-MM format for monthly KPIs
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
}

export interface FirestoreKPI {
  id: string;
  title: string;
  target: number;
  actual: number;
  unit?: string;
  icon_name?: string;
  status?: TargetVsActualStatus;
  risk_threshold?: number;
  description?: string;
  category?: string;
  month?: string;
  created_at: any; // Firestore Timestamp
  updated_at: any; // Firestore Timestamp
  created_by: string;
  updated_by?: string;
}
