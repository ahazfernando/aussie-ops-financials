"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Clock, Star, Users, Calendar, TrendingUp, CheckSquare, ArrowRight, AlertCircle, Bell, Plus, LogOut, LogIn, UserCircle, DollarSign, TrendingDown, FileText, Wallet, Loader2 } from 'lucide-react';
import { getTasksByUser, getCompletedTasks, getCompletedTasksByUser } from '@/lib/tasks';
import { Task } from '@/types/task';
import { getRemindersByUser } from '@/lib/reminders';
import { Reminder } from '@/types/reminder';
import { format, formatDistanceToNow, isPast, isToday, isTomorrow, startOfWeek, endOfWeek, startOfDay } from 'date-fns';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { ActiveUsersSection } from '@/components/ActiveUsersSection';
import { doc, getDoc, setDoc, collection, query, where, getDocs, Timestamp, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { getAllClients } from '@/lib/clients';
import { getAllTransactions, calculateFinancialSummary } from '@/lib/financials';
import { 
  CashFlowTrends, 
  CashFlowDistribution, 
  MonthlyNetCashFlow, 
  prepareChartData 
} from '@/components/CASH_FLOW_CHARTS_COMPONENTS';
import { Bar, BarChart, CartesianGrid, XAxis, Pie, PieChart } from 'recharts';
import { ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

const Dashboard = () => {
  const { user, getAllUsers } = useAuth();
  const router = useRouter();
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loadingReminders, setLoadingReminders] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loadingPhoto, setLoadingPhoto] = useState(true);
  const [isBusy, setIsBusy] = useState(false);
  const [loadingBusy, setLoadingBusy] = useState(true);
  const [recentActivity, setRecentActivity] = useState<{
    completedTask: Task | null;
    recentClockOut: { userName: string; clockOutTime: Date } | null;
    recentClockIn: { userName: string; clockInTime: Date } | null;
  }>({
    completedTask: null,
    recentClockOut: null,
    recentClockIn: null,
  });
  const [loadingActivity, setLoadingActivity] = useState(true);
  const [kpiData, setKpiData] = useState({
    totalClients: { value: '0', loading: true },
    totalRevenue: { value: '$0', loading: true },
    lossesPayables: { value: '$0', loading: true },
  });
  const [chartData, setChartData] = useState<any>(null);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [pendingRevenue, setPendingRevenue] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [pendingExpenses, setPendingExpenses] = useState(0);
  const [profit, setProfit] = useState(0);
  const [monthlyDataArray, setMonthlyDataArray] = useState<Array<{ month: string; revenue: number; expenses: number }>>([]);
  const [statusData, setStatusData] = useState<Array<{ status: string; count: number; fill: string }>>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [payrolls, setPayrolls] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadAssignedTasks();
      loadReminders();
      loadProfilePhoto();
      loadBusyStatus();
      loadRecentActivity();
      loadKPIData();
      loadFinancialData();
    }
  }, [user]);

  const loadFinancialData = async () => {
    if (!user || user.role !== 'admin') {
      setLoadingCharts(false);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setLoadingCharts(true);
      const transactions = await getAllTransactions();
      const summary = calculateFinancialSummary(transactions);
      
      // Calculate totals
      setTotalRevenue(summary.totalIncome);
      setTotalExpenses(summary.totalExpenses);
      setProfit(summary.totalIncome - summary.totalExpenses);
      
      // For now, pending revenue/expenses are 0 (can be calculated from unpaid invoices/expenses if needed)
      setPendingRevenue(0);
      setPendingExpenses(0);
      
      // Prepare monthly data for charts
      const preparedData = prepareChartData(transactions);
      setChartData(preparedData);
      
      // Prepare monthly data array for bar chart
      const monthlyData = preparedData.monthlyData.map(m => ({
        month: m.month,
        revenue: m.income,
        expenses: m.expenses,
      }));
      setMonthlyDataArray(monthlyData);
      
      // Prepare status data for pie chart (using transaction types as status)
      const inflowCount = transactions.filter(t => t.type === 'INFLOW').length;
      const outflowCount = transactions.filter(t => t.type === 'OUTFLOW').length;
      setStatusData([
        { status: 'Income', count: inflowCount, fill: 'hsl(var(--chart-1))' },
        { status: 'Expenses', count: outflowCount, fill: 'hsl(var(--chart-2))' },
      ]);
      
      // Set invoices and payrolls (empty for now, can be populated if invoice/payroll system exists)
      setInvoices([]);
      setPayrolls([]);
      
    } catch (error) {
      console.error('Error loading financial data:', error);
    } finally {
      setLoadingCharts(false);
      setIsLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Chart configurations
  const cashFlowConfig = {
    revenue: {
      label: "Revenue",
      color: "hsl(142, 76%, 36%)",
    },
    expenses: {
      label: "Expenses",
      color: "hsl(217, 91%, 60%)",
    },
  } satisfies ChartConfig;

  const statusConfig = {
    income: {
      label: "Income",
      color: "hsl(142, 76%, 36%)",
    },
    expenses: {
      label: "Expenses",
      color: "hsl(217, 91%, 60%)",
    },
  } satisfies ChartConfig;

  const loadProfilePhoto = async () => {
    if (!user) return;
    
    try {
      setLoadingPhoto(true);
      const profileDoc = await getDoc(doc(db, 'profiles', user.id));
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        if (data.profilePhoto) {
          setProfilePhoto(data.profilePhoto);
        }
      }
    } catch (error) {
      console.error('Error loading profile photo:', error);
    } finally {
      setLoadingPhoto(false);
    }
  };

  const loadBusyStatus = async () => {
    if (!user) return;
    
    try {
      setLoadingBusy(true);
      const profileDoc = await getDoc(doc(db, 'profiles', user.id));
      if (profileDoc.exists()) {
        const data = profileDoc.data();
        if (data.isBusy !== undefined) {
          setIsBusy(Boolean(data.isBusy));
        }
      }
    } catch (error) {
      console.error('Error loading busy status:', error);
    } finally {
      setLoadingBusy(false);
    }
  };

  const handleBusyToggle = async (checked: boolean) => {
    if (!user) return;
    
    setIsBusy(checked);
    try {
      await setDoc(
        doc(db, 'profiles', user.id),
        {
          isBusy: checked,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    } catch (error) {
      console.error('Error saving busy status:', error);
      // Revert on error
      setIsBusy(!checked);
    }
  };

  const loadAssignedTasks = async () => {
    if (!user) return;
    
    try {
      setLoadingTasks(true);
      const tasks = await getTasksByUser(user.id);
      // Get latest 5 tasks
      const latestTasks = tasks.slice(0, 5);
      setAssignedTasks(latestTasks);
    } catch (error) {
      console.error('Error loading assigned tasks:', error);
    } finally {
      setLoadingTasks(false);
    }
  };

  const loadReminders = async () => {
    if (!user) return;
    
    try {
      setLoadingReminders(true);
      const userReminders = await getRemindersByUser(user.id);
      // Filter out completed reminders and get the most urgent one
      const activeReminders = userReminders
        .filter(reminder => !reminder.completed)
        .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())
        .slice(0, 1); // Get only 1 reminder
      setReminders(activeReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
    } finally {
      setLoadingReminders(false);
    }
  };

  const getDueDateLabel = (date: Date) => {
    if (isPast(date) && !isToday(date)) {
      return 'Overdue';
    }
    if (isToday(date)) {
      return 'Today';
    }
    if (isTomorrow(date)) {
      return 'Tomorrow';
    }
    return format(date, 'MMM dd, yyyy');
  };

  const getPriorityColor = (priority: 'low' | 'medium' | 'high' | undefined) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'low':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const loadKPIData = async () => {
    if (!user || user.role !== 'admin') {
      // Set loading to false for non-admin users
      setKpiData({
        totalClients: { value: '0', loading: false },
        totalRevenue: { value: '$0', loading: false },
        lossesPayables: { value: '$0', loading: false },
      });
      return;
    }
    
    try {
      await Promise.all([
        loadTotalClients(),
        loadTotalRevenue(),
        loadLossesPayables(),
      ]);
    } catch (error) {
      console.error('Error loading KPI data:', error);
    }
  };

  const loadTotalClients = async () => {
    try {
      setKpiData(prev => ({ ...prev, totalClients: { ...prev.totalClients, loading: true } }));
      const clients = await getAllClients();
      setKpiData(prev => ({ 
        ...prev, 
        totalClients: { value: clients.length.toString(), loading: false } 
      }));
    } catch (error) {
      console.error('Error loading total clients:', error);
      setKpiData(prev => ({ 
        ...prev, 
        totalClients: { value: 'Error', loading: false } 
      }));
    }
  };

  const loadTotalRevenue = async () => {
    try {
      setKpiData(prev => ({ ...prev, totalRevenue: { ...prev.totalRevenue, loading: true } }));
      const transactions = await getAllTransactions();
      const summary = calculateFinancialSummary(transactions);
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-AU', {
          style: 'currency',
          currency: 'AUD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
      };
      setKpiData(prev => ({ 
        ...prev, 
        totalRevenue: { value: formatCurrency(summary.totalIncome), loading: false } 
      }));
    } catch (error) {
      console.error('Error loading total revenue:', error);
      setKpiData(prev => ({ 
        ...prev, 
        totalRevenue: { value: 'Error', loading: false } 
      }));
    }
  };

  const loadLossesPayables = async () => {
    try {
      setKpiData(prev => ({ ...prev, lossesPayables: { ...prev.lossesPayables, loading: true } }));
      const transactions = await getAllTransactions();
      const summary = calculateFinancialSummary(transactions);
      const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-AU', {
          style: 'currency',
          currency: 'AUD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
      };
      setKpiData(prev => ({ 
        ...prev, 
        lossesPayables: { value: formatCurrency(summary.totalExpenses), loading: false } 
      }));
    } catch (error) {
      console.error('Error loading losses/payables:', error);
      setKpiData(prev => ({ 
        ...prev, 
        lossesPayables: { value: 'Error', loading: false } 
      }));
    }
  };

  const loadClockInToday = async () => {
    if (!user || !db) return;
    
    try {
      setKpiData(prev => ({ ...prev, clockInToday: { ...prev.clockInToday, loading: true } }));
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dateString = format(today, 'yyyy-MM-dd');
      
      const q = query(
        collection(db, 'timeEntries'),
        where('userId', '==', user.id),
        where('dateString', '==', dateString)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const doc = querySnapshot.docs[0];
        const data = getTimeEntryData(doc.data());
        
        if (data.clockIn) {
          const clockInTime = data.clockIn.toDate();
          const formattedTime = format(clockInTime, 'hh:mm a');
          setKpiData(prev => ({ 
            ...prev, 
            clockInToday: { value: formattedTime, loading: false } 
          }));
        } else {
          setKpiData(prev => ({ 
            ...prev, 
            clockInToday: { value: 'Not Clocked In', loading: false } 
          }));
        }
      } else {
        setKpiData(prev => ({ 
          ...prev, 
          clockInToday: { value: 'Not Clocked In', loading: false } 
        }));
      }
    } catch (error) {
      console.error('Error loading clock in today:', error);
      setKpiData(prev => ({ 
        ...prev, 
        clockInToday: { value: 'Error', loading: false } 
      }));
    }
  };

  const loadWeeklyRating = async () => {
    if (!user || !db) return;
    
    try {
      setKpiData(prev => ({ ...prev, weeklyRating: { ...prev.weeklyRating, loading: true } }));
      
      const now = new Date();
      const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
      const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
      
      const q = query(
        collection(db, 'ratings'),
        where('employeeId', '==', user.id)
      );
      
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const ratings = querySnapshot.docs
          .map(doc => {
            const data = doc.data();
            const ratingDate = data.week ? new Date(data.week) : data.createdAt?.toDate() || new Date();
            return {
              rating: data.rating || 0,
              date: ratingDate,
            };
          })
          .filter(r => r.rating > 0 && r.date >= weekStart && r.date <= weekEnd);
        
        if (ratings.length > 0) {
          const sum = ratings.reduce((a, b) => a + b.rating, 0);
          const avg = Math.round((sum / ratings.length) * 10) / 10;
          setKpiData(prev => ({ 
            ...prev, 
            weeklyRating: { value: `${avg}/5`, loading: false } 
          }));
        } else {
          setKpiData(prev => ({ 
            ...prev, 
            weeklyRating: { value: 'No Rating', loading: false } 
          }));
        }
      } else {
        setKpiData(prev => ({ 
          ...prev, 
          weeklyRating: { value: 'No Rating', loading: false } 
        }));
      }
    } catch (error) {
      console.error('Error loading weekly rating:', error);
      setKpiData(prev => ({ 
        ...prev, 
        weeklyRating: { value: 'Error', loading: false } 
      }));
    }
  };

  const loadPendingLeaveRequests = async () => {
    if (!user || !db) return;
    
    try {
      setKpiData(prev => ({ ...prev, pendingLeaveRequests: { ...prev.pendingLeaveRequests, loading: true } }));
      
      const q = query(
        collection(db, 'leaveRequests'),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(q);
      const pendingCount = querySnapshot.size;
      
      setKpiData(prev => ({ 
        ...prev, 
        pendingLeaveRequests: { 
          value: pendingCount > 0 ? `${pendingCount} Pending` : '0 Pending', 
          loading: false 
        } 
      }));
    } catch (error) {
      console.error('Error loading pending leave requests:', error);
      setKpiData(prev => ({ 
        ...prev, 
        pendingLeaveRequests: { value: 'Error', loading: false } 
      }));
    }
  };

  const loadCompletedTasks = async () => {
    if (!user) return;
    
    try {
      setKpiData(prev => ({ ...prev, completedTasks: { ...prev.completedTasks, loading: true } }));
      
      let completedTasks: Task[];
      
      if (user.role === 'admin') {
        completedTasks = await getCompletedTasks();
      } else {
        completedTasks = await getCompletedTasksByUser(user.id);
      }
      
      const totalCount = completedTasks.length;
      
      setKpiData(prev => ({ 
        ...prev, 
        completedTasks: { 
          value: totalCount.toString(), 
          loading: false 
        } 
      }));
    } catch (error) {
      console.error('Error loading completed tasks:', error);
      setKpiData(prev => ({ 
        ...prev, 
        completedTasks: { value: 'Error', loading: false } 
      }));
    }
  };

  const getTimeEntryData = (data: unknown): {
    userId: string;
    date: Timestamp;
    dateString?: string;
    clockIn: Timestamp | null;
    clockOut: Timestamp | null;
    totalHours: number | null;
    createdAt: Timestamp;
    updatedAt: Timestamp;
  } => {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid time entry data');
    }
    return data as {
      userId: string;
      date: Timestamp;
      dateString?: string;
      clockIn: Timestamp | null;
      clockOut: Timestamp | null;
      totalHours: number | null;
      createdAt: Timestamp;
      updatedAt: Timestamp;
    };
  };

  const loadRecentActivity = async () => {
    if (!user || !db) return;

    try {
      setLoadingActivity(true);

      // Load most recent completed task
      let completedTask: Task | null = null;
      try {
        const completedTasks = user.role === 'admin' 
          ? await getCompletedTasks()
          : await getCompletedTasksByUser(user.id);
        
        if (completedTasks.length > 0) {
          // Tasks are already sorted by completion date (most recent first)
          completedTask = completedTasks[0];
        }
      } catch (error) {
        console.error('Error loading completed task:', error);
      }

      // Load most recent clock out
      let recentClockOut: { userName: string; clockOutTime: Date } | null = null;
      try {
        // Fetch recent time entries and filter in memory
        const timeEntriesQuery = query(
          collection(db, 'timeEntries'),
          orderBy('updatedAt', 'desc'),
          limit(50) // Get recent entries to filter
        );
        const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
        
        const clockOuts: Array<{ userId: string; clockOutTime: Date }> = [];
        timeEntriesSnapshot.docs.forEach((doc) => {
          try {
            const data = getTimeEntryData(doc.data());
            if (data.clockOut) {
              clockOuts.push({
                userId: data.userId,
                clockOutTime: data.clockOut.toDate(),
              });
            }
          } catch {
            // Skip invalid entries
          }
        });

        if (clockOuts.length > 0) {
          // Sort by clock out time (most recent first)
          clockOuts.sort((a, b) => b.clockOutTime.getTime() - a.clockOutTime.getTime());
          const mostRecent = clockOuts[0];
          const users = await getAllUsers();
          const userInfo = users.find((u: any) => u.id === mostRecent.userId);
          const userName = userInfo 
            ? (userInfo.name || `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || userInfo.email)
            : 'Unknown User';
          recentClockOut = {
            userName,
            clockOutTime: mostRecent.clockOutTime,
          };
        }
      } catch (error) {
        console.error('Error loading recent clock out:', error);
      }

      // Load most recent clock in
      let recentClockIn: { userName: string; clockInTime: Date } | null = null;
      try {
        // Fetch recent time entries and filter in memory
        const timeEntriesQuery = query(
          collection(db, 'timeEntries'),
          orderBy('updatedAt', 'desc'),
          limit(50) // Get recent entries to filter
        );
        const timeEntriesSnapshot = await getDocs(timeEntriesQuery);
        
        const clockIns: Array<{ userId: string; clockInTime: Date }> = [];
        timeEntriesSnapshot.docs.forEach((doc) => {
          try {
            const data = getTimeEntryData(doc.data());
            if (data.clockIn) {
              clockIns.push({
                userId: data.userId,
                clockInTime: data.clockIn.toDate(),
              });
            }
          } catch {
            // Skip invalid entries
          }
        });

        if (clockIns.length > 0) {
          // Sort by clock in time (most recent first)
          clockIns.sort((a, b) => b.clockInTime.getTime() - a.clockInTime.getTime());
          const mostRecent = clockIns[0];
          const users = await getAllUsers();
          const userInfo = users.find((u: any) => u.id === mostRecent.userId);
          const userName = userInfo 
            ? (userInfo.name || `${userInfo.firstName || ''} ${userInfo.lastName || ''}`.trim() || userInfo.email)
            : 'Unknown User';
          recentClockIn = {
            userName,
            clockInTime: mostRecent.clockInTime,
          };
        }
      } catch (error) {
        console.error('Error loading recent clock in:', error);
      }

      setRecentActivity({
        completedTask,
        recentClockOut,
        recentClockIn,
      });
    } catch (error) {
      console.error('Error loading recent activity:', error);
    } finally {
      setLoadingActivity(false);
    }
  };

  const stats: Array<{
    title: string;
    value: string;
    loading: boolean;
    icon: React.ComponentType<any>;
    gradient: string;
    iconBg: string;
    iconColor: string;
    borderColor: string;
    adminOnly?: boolean;
  }> = [
    { 
      title: 'Total Clients', 
      value: kpiData.totalClients.value, 
      loading: kpiData.totalClients.loading,
      icon: UserCircle, 
      gradient: 'from-blue-500 via-blue-600 to-indigo-600',
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-500',
      borderColor: 'border-blue-500/20',
      adminOnly: true
    },
    { 
      title: 'Total Revenue', 
      value: kpiData.totalRevenue.value, 
      loading: kpiData.totalRevenue.loading,
      icon: DollarSign, 
      gradient: 'from-green-500 via-green-600 to-emerald-600',
      iconBg: 'bg-green-500/10',
      iconColor: 'text-green-500',
      borderColor: 'border-green-500/20',
      adminOnly: true
    },
    { 
      title: 'Losses / Payables', 
      value: kpiData.lossesPayables.value, 
      loading: kpiData.lossesPayables.loading,
      icon: TrendingDown, 
      gradient: 'from-red-500 via-red-600 to-rose-600',
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-500',
      borderColor: 'border-red-500/20',
      adminOnly: true
    },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'New':
        return 'bg-blue-500';
      case 'Progress':
        return 'bg-yellow-500';
      case 'Complete':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Admin Dashboard with new UI
  if (user?.role === 'admin') {
    return (
      <div className="space-y-6 sm:space-y-8">
        {/* Modern Header Section */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-500/10 via-gray-500/5 to-background border border-slate-500/20 p-6 sm:p-8">
          <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
          <div className="relative space-y-2">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Dashboard
            </h2>
            <p className="text-sm sm:text-base text-muted-foreground">Financial overview and key metrics at a glance</p>
          </div>
        </div>

        {/* Stats Cards Grid */}
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <>
              {[1, 2, 3].map((i) => (
                <Card key={i} className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100/50 dark:from-slate-950/30 dark:to-slate-900/20 border-2 border-slate-200 dark:border-slate-900/50 shadow-xl p-0 rounded-2xl">
                  <CardHeader className="relative px-6 pt-6">
                    <Skeleton className="h-16 w-16 rounded-xl mb-4" />
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-8 w-40" />
                  </CardHeader>
                  <CardContent className="bg-slate-50/50 dark:bg-slate-950/20 rounded-b-2xl px-6 py-4 border-t border-slate-200 dark:border-slate-900/50">
                    <Skeleton className="h-3 w-24" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              {/* Total Revenue Card */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-950/30 dark:to-green-900/20 border-2 border-green-200 dark:border-green-900/50 shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-400/20 rounded-full -mr-16 -mt-16 group-hover:bg-green-400/30 transition-colors"></div>
                <CardHeader className="relative px-6 pt-6">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-green-500 to-green-600 shadow-lg">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Total Revenue</CardTitle>
                  <div className="text-3xl font-bold text-green-700 dark:text-green-400 mt-2">
                    {formatCurrency(totalRevenue)}
                  </div>
                </CardHeader>
                <CardContent className="bg-green-50/50 dark:bg-green-950/20 rounded-b-2xl px-6 py-4 border-t border-green-200 dark:border-green-900/50">
                  <p className="text-xs text-muted-foreground font-medium">
                    {formatCurrency(pendingRevenue)} pending
                  </p>
                </CardContent>
              </Card>

              {/* Total Expenses Card */}
              <Card className="relative overflow-hidden bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-900/50 shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 rounded-full -mr-16 -mt-16 group-hover:bg-blue-400/30 transition-colors"></div>
                <CardHeader className="relative px-6 pt-6">
                  <div className="flex items-start justify-between">
                    <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg">
                      <Wallet className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Total Expenses</CardTitle>
                  <div className="text-3xl font-bold text-blue-700 dark:text-blue-400 mt-2">
                    {formatCurrency(totalExpenses)}
                  </div>
                </CardHeader>
                <CardContent className="bg-blue-50/50 dark:bg-blue-950/20 rounded-b-2xl px-6 py-4 border-t border-blue-200 dark:border-blue-900/50">
                  <p className="text-xs text-muted-foreground font-medium">
                    {formatCurrency(pendingExpenses)} pending
                  </p>
                </CardContent>
              </Card>

              {/* Net Profit Card */}
              <Card className={`relative overflow-hidden bg-gradient-to-br ${profit >= 0 ? 'from-green-50 to-emerald-100/50 dark:from-green-950/30 dark:to-emerald-900/20 border-2 border-green-200 dark:border-green-900/50' : 'from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20 border-2 border-blue-200 dark:border-blue-900/50'} shadow-xl hover:shadow-2xl transition-all duration-300 p-0 rounded-2xl group`}>
                <div className={`absolute top-0 right-0 w-32 h-32 ${profit >= 0 ? 'bg-green-400/20 group-hover:bg-green-400/30' : 'bg-blue-400/20 group-hover:bg-blue-400/30'} rounded-full -mr-16 -mt-16 transition-colors`}></div>
                <CardHeader className="relative px-6 pt-6">
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${profit >= 0 ? 'from-green-500 to-green-600' : 'from-blue-500 to-blue-600'} shadow-lg`}>
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <CardTitle className="text-sm font-semibold mt-4 text-muted-foreground uppercase tracking-wide">Net Profit</CardTitle>
                  <div className={`text-3xl font-bold mt-2 ${profit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-blue-700 dark:text-blue-400'}`}>
                    {formatCurrency(profit)}
                  </div>
                </CardHeader>
                <CardContent className={`${profit >= 0 ? 'bg-green-50/50 dark:bg-green-950/20 border-t border-green-200 dark:border-green-900/50' : 'bg-blue-50/50 dark:bg-blue-950/20 border-t border-blue-200 dark:border-blue-900/50'} rounded-b-2xl px-6 py-4`}>
                  <p className="text-xs text-muted-foreground font-medium">Cash flow method</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
          {/* Monthly Cash Flow Chart */}
          <Card className="border-2 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-500/10 via-gray-500/5 to-muted/30 border-b-2 pb-4">
              <CardTitle className="text-xl font-bold">Monthly Cash Flow</CardTitle>
              <CardDescription className="text-sm">Revenue vs Expenses (Cash Flow Method)</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              {isLoading ? (
                <div className="space-y-4 h-[300px]">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-[250px] w-full rounded-lg" />
                </div>
              ) : (
                <ChartContainer config={cashFlowConfig}>
                  <BarChart accessibilityLayer data={monthlyDataArray.length > 0 ? monthlyDataArray : [{ month: "No Data", revenue: 0, expenses: 0 }]}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      tickMargin={10}
                      axisLine={false}
                      className="text-xs"
                    />
                    <ChartTooltip 
                      content={
                        <ChartTooltipContent 
                          hideLabel 
                          formatter={(value) => formatCurrency(Number(value))}
                          className="rounded-lg border shadow-lg"
                        />
                      } 
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar
                      dataKey="revenue"
                      stackId="a"
                      fill="var(--color-revenue)"
                      radius={[0, 0, 8, 8]}
                      className="hover:opacity-80 transition-opacity"
                    />
                    <Bar
                      dataKey="expenses"
                      stackId="a"
                      fill="var(--color-expenses)"
                      radius={[8, 8, 0, 0]}
                      className="hover:opacity-80 transition-opacity"
                    />
                  </BarChart>
                </ChartContainer>
              )}
            </CardContent>
            <CardFooter className="bg-muted/30 dark:bg-muted/20 flex-col items-start gap-2 text-sm border-t">
              <div className="flex gap-2 leading-none font-bold">
                Net Profit: <span className={profit >= 0 ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}>
                  {formatCurrency(profit)}
                </span>
                {profit >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                ) : (
                  <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400 rotate-180" />
                )}
              </div>
              <div className="text-muted-foreground leading-none text-xs">
                Based on received payments
              </div>
            </CardFooter>
          </Card>

          {/* Transaction Status Distribution Chart */}
          <Card className="flex flex-col border-2 shadow-xl">
            <CardHeader className="bg-gradient-to-r from-slate-500/10 via-gray-500/5 to-muted/30 border-b-2 items-center pb-4">
              <CardTitle className="text-xl font-bold">Transaction Status Distribution</CardTitle>
              <CardDescription className="text-sm">Income vs Expenses breakdown</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-0 pt-6">
              {isLoading ? (
                <div className="space-y-4 h-[300px] flex items-center justify-center">
                  <Skeleton className="h-[250px] w-[250px] rounded-full" />
                </div>
              ) : (
                <ChartContainer
                  config={statusConfig}
                  className="mx-auto aspect-square max-h-[300px]"
                >
                  <PieChart>
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel className="rounded-lg border shadow-lg" />}
                    />
                    <Pie 
                      data={statusData.length > 0 ? statusData : [{ status: 'No Data', count: 1, fill: 'hsl(var(--muted))' }]} 
                      dataKey="count" 
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      innerRadius={40}
                      paddingAngle={2}
                      className="hover:opacity-80 transition-opacity"
                    />
                  </PieChart>
                </ChartContainer>
              )}
            </CardContent>
            <CardFooter className="bg-muted/30 dark:bg-muted/20 flex-col gap-2 text-sm border-t">
              <div className="text-muted-foreground leading-none text-xs font-medium">
                Total <span className="font-bold text-foreground">{statusData.reduce((sum, s) => sum + s.count, 0)}</span> transactions tracked
              </div>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  // Non-admin users see the old dashboard
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8">
      {/* Header Section with Modern Design */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-card/80 border border-border/50 p-6 sm:p-8">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-50" />
        <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4 sm:gap-6">
            {loadingPhoto ? (
              <Skeleton className="h-14 w-14 sm:h-20 sm:w-20 rounded-full" />
            ) : (
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full blur-xl" />
                <Avatar className="h-14 w-14 sm:h-20 sm:w-20 rounded-full ring-2 ring-primary/20">
                  <AvatarImage src={profilePhoto || undefined} alt={user?.name || 'User'} />
                  <AvatarFallback className="text-lg sm:text-xl font-bold bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
                    {user?.name ? getInitials(user.name) : 'U'}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
                Welcome, {user?.name}
              </h1>
              <p className="text-sm sm:text-base text-muted-foreground mt-2 font-medium">
                We Will Australia Operations Dashboard
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-card/50 border border-border/50 backdrop-blur-sm">
              <Switch
                id="isBusy"
                checked={isBusy}
                onCheckedChange={handleBusyToggle}
                disabled={loadingBusy}
                className="data-[state=checked]:bg-primary"
              />
              <Label htmlFor="isBusy" className="text-sm font-medium cursor-pointer whitespace-nowrap">
                Mark as Busy
              </Label>
            </div>
            {isBusy && (
              <Badge variant="destructive" className="text-xs px-3 py-1.5 animate-pulse">
                <AlertCircle className="h-3 w-3 mr-1.5" />
                Busy
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Modern Metric Cards with Gradients */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {stats
          .filter(stat => !stat.adminOnly || user?.role === 'admin')
          .map((stat) => (
          <Card 
            key={stat.title} 
            className={`group relative overflow-hidden border ${stat.borderColor} bg-card/50 backdrop-blur-sm transition-smooth hover:scale-[1.02] hover:border-opacity-40`}
          >
            {/* Gradient Background Overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300`} />
            
            {/* Decorative Corner Gradient */}
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-0 group-hover:opacity-10 blur-3xl transition-opacity duration-300`} />
            
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-4 sm:px-6 pt-4 sm:pt-6 relative z-10">
              <CardTitle className="text-sm sm:text-base font-semibold text-foreground/90">{stat.title}</CardTitle>
              <div className={`${stat.iconBg} p-2 rounded-lg group-hover:scale-110 transition-transform duration-300`}>
                <stat.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${stat.iconColor}`} />
              </div>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6 relative z-10">
              {stat.loading ? (
                <Skeleton className="h-8 sm:h-10 md:h-12 w-24 sm:w-32" />
              ) : (
                <div className={`text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-br ${stat.gradient} bg-clip-text text-transparent`}>
                  {stat.value}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cash Flow Charts - Admin Only */}
      {user?.role === 'admin' && (
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          <CashFlowTrends 
            monthlyData={chartData?.monthlyData} 
            isLoading={loadingCharts} 
            hasData={!!chartData && chartData.monthlyData.length > 0} 
          />
          <CashFlowDistribution 
            totalIncome={chartData?.totalIncome} 
            totalExpenses={chartData?.totalExpenses} 
            isLoading={loadingCharts} 
            hasData={!!chartData && (chartData.totalIncome > 0 || chartData.totalExpenses > 0)} 
          />
          <MonthlyNetCashFlow 
            monthlyData={chartData?.monthlyData} 
            isLoading={loadingCharts} 
            hasData={!!chartData && chartData.monthlyData.length > 0} 
          />
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
        <Card className="border-border/50 transition-smooth overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 sm:pb-6 bg-gradient-to-br from-card to-card/50">
            <div>
              <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <Bell className="h-4 w-4 text-amber-500" />
                </div>
                My Reminders
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm mt-1.5 hidden sm:block text-muted-foreground">
                Upcoming and overdue reminders
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => router.push('/reminders')} 
              className="w-full sm:w-auto text-xs sm:text-sm hover:bg-primary hover:text-primary-foreground transition-smooth border-border/50"
            >
              View All
              <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
            </Button>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingReminders ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 border rounded-lg space-x-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-4" />
                </div>
              </div>
            ) : reminders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 mb-4">
                  <Bell className="h-8 w-8 text-amber-500 opacity-60" />
                </div>
                <p className="font-medium mb-1">No reminders yet</p>
                <p className="text-xs text-muted-foreground mb-4">Create your first reminder to stay organized</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2 hover:bg-primary hover:text-primary-foreground transition-smooth"
                  onClick={() => router.push('/reminders')}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Reminder
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {reminders.map((reminder) => {
                  const isOverdue = isPast(reminder.dueDate) && !isToday(reminder.dueDate);
                  return (
                    <div
                      key={reminder.id}
                      className={`group/item flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-smooth ${
                        isOverdue 
                          ? 'border-red-500/30 bg-gradient-to-r from-red-500/10 via-red-500/5 to-transparent hover:from-red-500/15 hover:via-red-500/10' 
                          : 'border-border/50 hover:border-primary/30 hover:bg-accent/50'
                      }`}
                      onClick={() => router.push('/reminders')}
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 flex-wrap">
                          <Badge className={`${getPriorityColor(reminder.priority)} text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5`}>
                            {reminder.priority ? reminder.priority.charAt(0).toUpperCase() + reminder.priority.slice(1) : 'Medium'}
                          </Badge>
                          {isOverdue && (
                            <Badge variant="destructive" className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5">
                              Overdue
                            </Badge>
                          )}
                        </div>
                        <h4 className="font-medium text-sm sm:text-base flex items-center gap-1.5 sm:gap-2 mb-1">
                          <Bell className={`h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0 ${isOverdue ? 'text-red-500' : ''}`} />
                          <span className="truncate">{reminder.title}</span>
                        </h4>
                        {reminder.description && (
                          <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 sm:line-clamp-1">
                            {reminder.description}
                          </p>
                        )}
                        <p className={`text-xs sm:text-sm mt-1.5 ${isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'}`}>
                          Due: {getDueDateLabel(reminder.dueDate)}
                        </p>
                        {reminder.assignedMembers && reminder.assignedMembers.length > 0 && (
                          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1.5 line-clamp-1">
                            {reminder.assignedMemberNames && reminder.assignedMemberNames.length > 0
                              ? `Assigned to: ${reminder.assignedMemberNames.slice(0, 2).join(', ')}${reminder.assignedMemberNames.length > 2 ? ` +${reminder.assignedMemberNames.length - 2}` : ''}`
                              : `${reminder.assignedMembers.length} member${reminder.assignedMembers.length !== 1 ? 's' : ''}`}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 group-hover/item:translate-x-1 transition-transform" />
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 transition-smooth overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          <CardHeader className="pb-4 sm:pb-6 bg-gradient-to-br from-card to-card/50">
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </div>
              Recent Activity
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1.5 hidden sm:block text-muted-foreground">
              Latest updates and notifications
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingActivity ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <Skeleton className="h-4 w-4 mt-0.5" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3 text-sm">
                {recentActivity.completedTask && (
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 to-transparent hover:from-emerald-500/15 transition-smooth">
                    <div className="p-1.5 rounded-lg bg-emerald-500/20 flex-shrink-0">
                      <CheckSquare className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">Task completed</p>
                      <p className="text-muted-foreground text-xs mt-0.5 truncate">
                        {recentActivity.completedTask.name}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {formatDistanceToNow(
                          recentActivity.completedTask.statusHistory?.find(h => h.status === 'Complete')?.timestamp || 
                          recentActivity.completedTask.updatedAt,
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {recentActivity.recentClockOut && (
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 to-transparent hover:from-blue-500/15 transition-smooth">
                    <div className="p-1.5 rounded-lg bg-blue-500/20 flex-shrink-0">
                      <LogOut className="h-4 w-4 text-blue-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">User clocked out</p>
                      <p className="text-muted-foreground text-xs mt-0.5 truncate">
                        {recentActivity.recentClockOut.userName}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {formatDistanceToNow(
                          recentActivity.recentClockOut.clockOutTime,
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {recentActivity.recentClockIn && (
                  <div className="flex items-start gap-3 p-3 rounded-xl border border-purple-500/20 bg-gradient-to-r from-purple-500/10 to-transparent hover:from-purple-500/15 transition-smooth">
                    <div className="p-1.5 rounded-lg bg-purple-500/20 flex-shrink-0">
                      <LogIn className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground">User clocked in</p>
                      <p className="text-muted-foreground text-xs mt-0.5 truncate">
                        {recentActivity.recentClockIn.userName}
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        {formatDistanceToNow(
                          recentActivity.recentClockIn.clockInTime,
                          { addSuffix: true }
                        )}
                      </p>
                    </div>
                  </div>
                )}
                {!recentActivity.completedTask && !recentActivity.recentClockOut && !recentActivity.recentClockIn && (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="inline-flex p-4 rounded-2xl bg-blue-500/10 mb-4">
                      <TrendingUp className="h-8 w-8 text-blue-500 opacity-60" />
                    </div>
                    <p className="font-medium">No recent activity</p>
                    <p className="text-xs mt-1">Activity will appear here as it happens</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Active Users and Recent Clock Outs Section */}
      <ActiveUsersSection />

      {/* Assigned Tasks Section */}
      <Card className="border-border/50 transition-smooth overflow-hidden group">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-4 sm:pb-6 bg-gradient-to-br from-card to-card/50">
          <div>
            <CardTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-indigo-500/10">
                <CheckSquare className="h-4 w-4 text-indigo-500" />
              </div>
              My Assigned Tasks
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1.5 hidden sm:block text-muted-foreground">
              Latest tasks assigned to you
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => router.push('/tasks')} 
            className="w-full sm:w-auto text-xs sm:text-sm hover:bg-primary hover:text-primary-foreground transition-smooth border-border/50"
          >
            View All
            <ArrowRight className="h-3 w-3 sm:h-4 sm:w-4 ml-2" />
          </Button>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingTasks ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between p-3 border rounded-lg space-x-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-4" />
                </div>
              ))}
            </div>
          ) : assignedTasks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <div className="inline-flex p-4 rounded-2xl bg-indigo-500/10 mb-4">
                <CheckSquare className="h-8 w-8 text-indigo-500 opacity-60" />
              </div>
              <p className="font-medium mb-1">No tasks assigned to you yet</p>
              <p className="text-xs">Tasks will appear here when assigned</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignedTasks.map((task) => (
                <div
                  key={task.id}
                  className="group/item flex items-center justify-between p-4 border rounded-xl cursor-pointer transition-smooth border-border/50 hover:border-primary/30 hover:bg-accent/50"
                  onClick={() => router.push('/tasks')}
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 flex-wrap">
                      <Badge className={`${getStatusColor(task.status)} text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5`}>
                        {task.status}
                      </Badge>
                      <span className="text-[10px] sm:text-xs text-muted-foreground">#{task.taskId}</span>
                    </div>
                    <h4 className="font-medium text-sm sm:text-base truncate mb-1">{task.name}</h4>
                    {task.description && (
                      <p className="text-xs sm:text-sm text-muted-foreground mt-1 line-clamp-2 sm:line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1.5">
                      Due: {format(task.date, 'MMM dd, yyyy')}
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0 group-hover/item:translate-x-1 transition-transform" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {user?.role === 'itteam' && (
        <Card className="border-yellow-500/50 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-yellow-800 dark:text-yellow-200">Limited Access Notice</CardTitle>
            <CardDescription className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300">
              IT team has restricted access by default. Contact an admin to request specific permissions.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
