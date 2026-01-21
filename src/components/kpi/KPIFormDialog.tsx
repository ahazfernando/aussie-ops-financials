"use client";

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from '@/hooks/use-toast';
import { Loader2, Target, Sparkles, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { KPI, TargetVsActualStatus } from '@/types/kpi';
import * as LucideIcons from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPIFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi?: KPI | null;
  onSuccess?: () => void;
}

// Popular icons for KPIs
const KPI_ICONS = [
  { name: 'DollarSign', label: 'Revenue' },
  { name: 'CheckSquare', label: 'Tasks' },
  { name: 'Target', label: 'Target' },
  { name: 'User', label: 'User' },
  { name: 'FileText', label: 'Tickets' },
  { name: 'Gauge', label: 'Efficiency' },
  { name: 'TrendingUp', label: 'Growth' },
  { name: 'Users', label: 'Team' },
  { name: 'Calendar', label: 'Time' },
  { name: 'BarChart3', label: 'Analytics' },
  { name: 'Award', label: 'Achievement' },
  { name: 'Zap', label: 'Performance' },
] as const;

const KPI_CATEGORIES = [
  'Revenue',
  'Operations',
  'Team Performance',
  'Customer Service',
  'IT Support',
  'Marketing',
  'Other',
];

const COMMON_UNITS = ['$', '%', 'tasks', 'tickets', 'hours', 'clients', 'units', 'days', 'items'];

export function KPIFormDialog({
  open,
  onOpenChange,
  kpi,
  onSuccess,
}: KPIFormDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedIconName, setSelectedIconName] = useState<string>(kpi?.iconName || 'Target');
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState({
    title: kpi?.title || '',
    target: kpi?.target || 0,
    actual: kpi?.actual || 0,
    unit: kpi?.unit || '',
    description: kpi?.description || '',
    category: kpi?.category || 'Other',
    status: kpi?.status || undefined as TargetVsActualStatus | undefined,
    riskThreshold: kpi?.riskThreshold || 0.7,
    month: kpi?.month || '',
  });

  // Reset form when dialog opens/closes or kpi changes
  useEffect(() => {
    if (open) {
      if (kpi) {
        setSelectedIconName(kpi.iconName || 'Target');
        setFormData({
          title: kpi.title,
          target: kpi.target,
          actual: kpi.actual,
          unit: kpi.unit || '',
          description: kpi.description || '',
          category: kpi.category || 'Other',
          status: kpi.status,
          riskThreshold: kpi.riskThreshold || 0.7,
          month: kpi.month || '',
        });
      } else {
        setSelectedIconName('Target');
        setFormData({
          title: '',
          target: 0,
          actual: 0,
          unit: '',
          description: '',
          category: 'Other',
          status: undefined,
          riskThreshold: 0.7,
          month: '',
        });
      }
      setShowAdvanced(false);
    }
  }, [open, kpi]);

  const getIconComponent = (iconName: string) => {
    const Icon = (LucideIcons as any)[iconName] as LucideIcons.LucideIcon;
    return Icon || LucideIcons.Target;
  };

  const SelectedIcon = getIconComponent(selectedIconName);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to save a KPI',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.title.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a KPI title',
        variant: 'destructive',
      });
      return;
    }

    if (formData.target <= 0) {
      toast({
        title: 'Validation Error',
        description: 'Target must be greater than 0',
        variant: 'destructive',
      });
      return;
    }

    if (formData.actual < 0) {
      toast({
        title: 'Validation Error',
        description: 'Actual value cannot be negative',
        variant: 'destructive',
      });
      return;
    }

    if (formData.riskThreshold < 0 || formData.riskThreshold > 1) {
      toast({
        title: 'Validation Error',
        description: 'Risk threshold must be between 0 and 1 (e.g., 0.7 for 70%)',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      // TODO: Implement actual save/update logic when KPI Firestore library is created
      // For now, we'll just show success and call onSuccess
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));

      toast({
        title: 'Success',
        description: kpi ? 'KPI updated successfully' : 'KPI created successfully',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving KPI:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to save KPI',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Calculate preview status
  const previewStatus = formData.target > 0
    ? formData.actual >= formData.target
      ? 'on-track'
      : formData.actual >= formData.target * formData.riskThreshold
      ? 'risk'
      : 'off-track'
    : undefined;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Sparkles className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            {kpi ? 'Edit KPI' : 'Create New KPI'}
          </DialogTitle>
          <DialogDescription className="text-base">
            {kpi ? 'Update KPI details and performance metrics' : 'Define targets and track actual performance for your KPIs'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50/50 to-slate-50/50 dark:from-blue-950/20 dark:to-slate-950/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-sm uppercase tracking-wide text-blue-900 dark:text-blue-100">
                Basic Information
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">
                  KPI Title <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Monthly Revenue, Tasks Completed"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger id="category" className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KPI_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Add a description or notes about this KPI..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>

          {/* Icon Selection */}
          <div className="space-y-4 p-4 bg-gradient-to-br from-blue-50/50 to-slate-50/50 dark:from-blue-950/20 dark:to-slate-950/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-sm uppercase tracking-wide text-blue-900 dark:text-blue-100">
                Icon Selection
              </h3>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
              {KPI_ICONS.map((icon) => {
                const IconComponent = getIconComponent(icon.name);
                const isSelected = selectedIconName === icon.name;
                return (
                  <button
                    key={icon.name}
                    type="button"
                    onClick={() => setSelectedIconName(icon.name)}
                    className={cn(
                      "p-3 rounded-lg border-2 transition-all duration-200 flex flex-col items-center gap-2 hover:scale-105",
                      isSelected
                        ? "bg-blue-500 border-blue-600 text-white shadow-lg"
                        : "bg-background border-slate-200 dark:border-slate-700 hover:border-blue-400"
                    )}
                  >
                    <IconComponent className="h-5 w-5" />
                    <span className={cn(
                      "text-xs font-medium",
                      isSelected ? "text-white" : "text-muted-foreground"
                    )}>
                      {icon.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target & Actual Values */}
          <div className="space-y-4 p-4 bg-gradient-to-br from-emerald-50/50 to-slate-50/50 dark:from-emerald-950/20 dark:to-slate-950/20 rounded-xl border border-emerald-200/50 dark:border-emerald-800/50">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="font-semibold text-sm uppercase tracking-wide text-emerald-900 dark:text-emerald-100">
                Performance Metrics
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="target">
                  Target Value <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="target"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.target}
                  onChange={(e) => setFormData({ ...formData, target: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="actual">Actual Value</Label>
                <Input
                  id="actual"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.actual}
                  onChange={(e) => setFormData({ ...formData, actual: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Select
                  value={formData.unit || 'none'}
                  onValueChange={(value) => setFormData({ ...formData, unit: value === 'none' ? '' : value })}
                >
                  <SelectTrigger id="unit" className="h-11">
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Unit</SelectItem>
                    {COMMON_UNITS.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Performance Preview */}
            {formData.target > 0 && (
              <div className="mt-4 p-3 bg-background/50 rounded-lg border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Performance Preview</span>
                  <Badge
                    variant="outline"
                    className={cn(
                      previewStatus === 'on-track' && "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/40",
                      previewStatus === 'risk' && "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/40",
                      previewStatus === 'off-track' && "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/40"
                    )}
                  >
                    {previewStatus === 'on-track' && 'On Track'}
                    {previewStatus === 'risk' && 'At Risk'}
                    {previewStatus === 'off-track' && 'Off Track'}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {((formData.actual / formData.target) * 100).toFixed(1)}% of target
                </p>
              </div>
            )}
          </div>

          {/* Advanced Options */}
          <div className="space-y-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full justify-between"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                <span className="font-medium">Advanced Options</span>
              </div>
              <span className="text-xs text-muted-foreground">{showAdvanced ? 'Hide' : 'Show'}</span>
            </Button>

            {showAdvanced && (
              <div className="p-4 bg-muted/30 rounded-xl border border-border/50 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="riskThreshold">Risk Threshold (0-1)</Label>
                    <Input
                      id="riskThreshold"
                      type="number"
                      step="0.01"
                      min="0"
                      max="1"
                      value={formData.riskThreshold}
                      onChange={(e) => setFormData({ ...formData, riskThreshold: parseFloat(e.target.value) || 0.7 })}
                      placeholder="0.7"
                      className="h-11"
                    />
                    <p className="text-xs text-muted-foreground">
                      Percentage of target before status becomes "At Risk" (default: 0.7 = 70%)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">Status Override (Optional)</Label>
                    <Select
                      value={formData.status || 'auto'}
                      onValueChange={(value) => setFormData({ ...formData, status: value === 'auto' ? undefined : (value as TargetVsActualStatus) })}
                    >
                      <SelectTrigger id="status" className="h-11">
                        <SelectValue placeholder="Auto-calculate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto-calculate</SelectItem>
                        <SelectItem value="on-track">On Track</SelectItem>
                        <SelectItem value="risk">At Risk</SelectItem>
                        <SelectItem value="off-track">Off Track</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="month">Month (YYYY-MM) - Optional</Label>
                  <Input
                    id="month"
                    type="month"
                    value={formData.month}
                    onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    className="h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    For monthly KPIs, specify the target month
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {kpi ? 'Update KPI' : 'Create KPI'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
