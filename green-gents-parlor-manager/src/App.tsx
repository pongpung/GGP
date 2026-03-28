/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  ChevronRight, 
  BarChart3, 
  PieChart,
  History,
  Menu,
  X,
  Edit2,
  Trash2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line
} from 'recharts';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  startOfMonth, 
  endOfMonth, 
  isWithinInterval, 
  parseISO, 
  subDays, 
  eachDayOfInterval
} from 'date-fns';
import { bn } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { addIncome, subscribeToIncomes, updateIncome, deleteIncome } from './services/incomeService';
import { addExpense, subscribeToExpenses, updateExpense, deleteExpense } from './services/expenseService';
import { IncomeRecord, ExpenseRecord, Transaction } from './types';
import { cn } from './lib/utils';

// --- Components ---

const Card = ({ children, className, title, icon: Icon }: { children: React.ReactNode, className?: string, title?: string, icon?: any }) => (
  <div className={cn("bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden", className)}>
    {(title || Icon) && (
      <div className="px-6 py-4 border-b border-neutral-50 flex items-center justify-between bg-neutral-50/50">
        {title && <h3 className="text-sm font-bold text-neutral-600 tracking-wider">{title}</h3>}
        {Icon && <Icon className="w-5 h-5 text-neutral-400" />}
      </div>
    )}
    <div className="p-6">{children}</div>
  </div>
);

const StatCard = ({ title, value, icon: Icon, colorClass, trend }: { title: string, value: string, icon: any, colorClass: string, trend?: string }) => (
  <Card className="relative group hover:shadow-md transition-shadow duration-300">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-neutral-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-neutral-900">{value}</h3>
        {trend && (
          <p className="text-xs font-medium text-emerald-600 mt-2 flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" /> {trend}
          </p>
        )}
      </div>
      <div className={cn("p-3 rounded-xl", colorClass)}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  </Card>
);

// --- Main App ---

export default function App() {
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'income' | 'expense' } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    amount: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: '',
    type: 'income' as 'income' | 'expense',
    category: 'General'
  });
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'insights'>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribeIncomes = subscribeToIncomes(setIncomes);
    const unsubscribeExpenses = subscribeToExpenses(setExpenses);
    return () => {
      unsubscribeIncomes();
      unsubscribeExpenses();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.amount || !formData.date) return;

    try {
      setError(null);
      const amount = parseFloat(formData.amount);
      
      if (isEditing && editingId) {
        if (formData.type === 'income') {
          await updateIncome(editingId, amount, formData.date, formData.notes);
        } else {
          await updateExpense(editingId, amount, formData.date, formData.notes, formData.category);
        }
      } else {
        if (formData.type === 'income') {
          await addIncome(amount, formData.date, formData.notes);
        } else {
          await addExpense(amount, formData.date, formData.notes, formData.category);
        }
      }
      setIsAdding(false);
      setIsEditing(false);
      setEditingId(null);
      setFormData({
        amount: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: '',
        type: 'income',
        category: 'General'
      });
    } catch (err) {
      setError('তথ্য সংরক্ষণ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    }
  };

  const handleEdit = (record: Transaction) => {
    setError(null);
    setFormData({
      amount: record.amount.toString(),
      date: record.date,
      notes: record.notes || '',
      type: record.type,
      category: record.type === 'expense' ? (record as ExpenseRecord).category || 'General' : 'General'
    });
    setEditingId(record.id);
    setIsEditing(true);
    setIsAdding(true);
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    setIsDeleting(true);
    setError(null);
    try {
      if (deleteConfirm.type === 'income') {
        await deleteIncome(deleteConfirm.id);
      } else {
        await deleteExpense(deleteConfirm.id);
      }
      setDeleteConfirm(null);
    } catch (err) {
      setError('রেকর্ডটি মুছতে সমস্যা হয়েছে।');
    } finally {
      setIsDeleting(false);
    }
  };

  // --- Calculations ---

  const allTransactions = useMemo(() => {
    const inc = incomes.map(i => ({ ...i, type: 'income' as const }));
    const exp = expenses.map(e => ({ ...e, type: 'expense' as const }));
    return [...inc, ...exp].sort((a, b) => b.date.localeCompare(a.date));
  }, [incomes, expenses]);

  const stats = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const filterByInterval = (list: any[], start: Date, end: Date) => 
      list.filter(i => isWithinInterval(parseISO(i.date), { start, end }));

    const todayIncome = incomes.filter(i => i.date === todayStr).reduce((sum, i) => sum + i.amount, 0);
    const todayExpense = expenses.filter(e => e.date === todayStr).reduce((sum, e) => sum + e.amount, 0);

    const weekIncome = filterByInterval(incomes, weekStart, weekEnd).reduce((sum, i) => sum + i.amount, 0);
    const weekExpense = filterByInterval(expenses, weekStart, weekEnd).reduce((sum, e) => sum + e.amount, 0);

    const monthIncome = filterByInterval(incomes, monthStart, monthEnd).reduce((sum, i) => sum + i.amount, 0);
    const monthExpense = filterByInterval(expenses, monthStart, monthEnd).reduce((sum, e) => sum + e.amount, 0);

    return { 
      todayIncome, todayExpense, todayNet: todayIncome - todayExpense,
      weekIncome, weekExpense, weekNet: weekIncome - weekExpense,
      monthIncome, monthExpense, monthNet: monthIncome - monthExpense
    };
  }, [incomes, expenses]);

  const chartData = useMemo(() => {
    const last7Days = eachDayOfInterval({
      start: subDays(new Date(), 6),
      end: new Date()
    });

    return last7Days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const income = incomes.filter(i => i.date === dayStr).reduce((sum, i) => sum + i.amount, 0);
      const expense = expenses.filter(e => e.date === dayStr).reduce((sum, e) => sum + e.amount, 0);
      return {
        name: format(day, 'EEE', { locale: bn }),
        income,
        expense,
        net: income - expense
      };
    });
  }, [incomes, expenses]);

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-72 bg-white border-r border-neutral-100 p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="p-2 bg-emerald-600 rounded-lg">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-neutral-900">গ্রিন জেন্টস পার্লার</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {[
            { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: BarChart3 },
            { id: 'history', label: 'ইতিহাস', icon: History },
            { id: 'insights', label: 'বিশ্লেষণ', icon: PieChart },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === item.id 
                  ? "bg-emerald-50 text-emerald-700" 
                  : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-6 border-t border-neutral-100">
          <p className="text-xs text-neutral-400 text-center">© ২০২৬ গ্রিন জেন্টস পার্লার</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header - Mobile */}
        <header className="lg:hidden bg-white border-b border-neutral-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-600 rounded-lg">
              <DollarSign className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-neutral-900">গ্রিন জেন্টস</span>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-neutral-500 hover:bg-neutral-50 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
        </header>

        {/* Scrollable Area */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold text-neutral-900">
                  {activeTab === 'dashboard' ? 'সারসংক্ষেপ' : activeTab === 'history' ? 'লেনদেনের ইতিহাস' : 'ব্যবসায়িক বিশ্লেষণ'}
                </h2>
                <p className="text-neutral-500 mt-1">স্বাগতম! আপনার পার্লারের হিসাব রাখুন সহজে।</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    setFormData({ ...formData, type: 'income', amount: '', notes: '', date: format(new Date(), 'yyyy-MM-dd') });
                    setIsAdding(true);
                  }}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                >
                  <Plus className="w-5 h-5" />
                  আয় যোগ করুন
                </button>
                <button
                  onClick={() => {
                    setFormData({ ...formData, type: 'expense', amount: '', notes: '', date: format(new Date(), 'yyyy-MM-dd'), category: 'General' });
                    setIsAdding(true);
                  }}
                  className="bg-red-600 text-white px-6 py-3 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-red-700 transition-all shadow-lg shadow-red-100"
                >
                  <Plus className="w-5 h-5" />
                  ব্যয় যোগ করুন
                </button>
              </div>
            </div>

            {activeTab === 'dashboard' && (
              <>
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <StatCard 
                    title="আজকের নিট আয়" 
                    value={`৳${stats.todayNet.toLocaleString('bn-BD')}`} 
                    icon={DollarSign} 
                    colorClass="bg-emerald-100 text-emerald-600"
                    trend={`আয়: ৳${stats.todayIncome.toLocaleString('bn-BD')} | ব্যয়: ৳${stats.todayExpense.toLocaleString('bn-BD')}`}
                  />
                  <StatCard 
                    title="এই সপ্তাহে নিট" 
                    value={`৳${stats.weekNet.toLocaleString('bn-BD')}`} 
                    icon={Calendar} 
                    colorClass="bg-blue-100 text-blue-600"
                    trend={`আয়: ৳${stats.weekIncome.toLocaleString('bn-BD')} | ব্যয়: ৳${stats.weekExpense.toLocaleString('bn-BD')}`}
                  />
                  <StatCard 
                    title="এই মাসে নিট" 
                    value={`৳${stats.monthNet.toLocaleString('bn-BD')}`} 
                    icon={TrendingUp} 
                    colorClass="bg-amber-100 text-amber-600"
                    trend={`আয়: ৳${stats.monthIncome.toLocaleString('bn-BD')} | ব্যয়: ৳${stats.monthExpense.toLocaleString('bn-BD')}`}
                  />
                </div>

                {/* Charts Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card title="আয় বনাম ব্যয় (সাপ্তাহিক)" icon={BarChart3}>
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis 
                            dataKey="name" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#888' }}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 12, fill: '#888' }}
                            tickFormatter={(value) => `৳${value}`}
                          />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                          />
                          <Bar dataKey="income" name="আয়" fill="#10b981" radius={[6, 6, 0, 0]} barSize={16} />
                          <Bar dataKey="expense" name="ব্যয়" fill="#ef4444" radius={[6, 6, 0, 0]} barSize={16} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card title="সাম্প্রতিক লেনদেন" icon={History}>
                    <div className="space-y-4">
                      {allTransactions.slice(0, 5).map((record) => (
                        <div key={record.id} className="flex items-center justify-between p-3 hover:bg-neutral-50 rounded-xl transition-colors group cursor-pointer">
                          <div className="flex items-center gap-4">
                            <div className={cn(
                              "w-10 h-10 rounded-full flex items-center justify-center font-bold",
                              record.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                              ৳
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-neutral-900">{record.type === 'income' ? 'আয়' : 'ব্যয়'}</p>
                              <p className="text-xs text-neutral-500">{format(parseISO(record.date), 'd MMMM, yyyy', { locale: bn })}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-right mr-2">
                              <p className={cn("text-sm font-bold", record.type === 'income' ? "text-emerald-600" : "text-red-600")}>
                                {record.type === 'income' ? '+' : '-'}৳{record.amount.toLocaleString('bn-BD')}
                              </p>
                              <p className="text-[10px] text-neutral-400">{record.notes || 'বিস্তারিত নেই'}</p>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleEdit(record as Transaction); }}
                                className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: record.id, type: record.type }); }}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {allTransactions.length === 0 && (
                        <div className="text-center py-10">
                          <p className="text-neutral-400">এখনও কোনো রেকর্ড নেই</p>
                        </div>
                      )}
                      <button 
                        onClick={() => setActiveTab('history')}
                        className="w-full py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                      >
                        সব রেকর্ড দেখুন
                      </button>
                    </div>
                  </Card>
                </div>
              </>
            )}

            {activeTab === 'history' && (
              <Card className="min-h-[600px]">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-neutral-100">
                        <th className="pb-4 font-semibold text-neutral-500 text-sm uppercase tracking-wider">তারিখ</th>
                        <th className="pb-4 font-semibold text-neutral-500 text-sm uppercase tracking-wider">ধরন</th>
                        <th className="pb-4 font-semibold text-neutral-500 text-sm uppercase tracking-wider">নোট</th>
                        <th className="pb-4 font-semibold text-neutral-500 text-sm uppercase tracking-wider text-right">পরিমাণ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-50">
                      {allTransactions.map((record) => (
                        <tr key={record.id} className="hover:bg-neutral-50 transition-colors group">
                          <td className="py-4 text-sm text-neutral-900">{format(parseISO(record.date), 'd MMMM, yyyy', { locale: bn })}</td>
                          <td className="py-4 text-sm">
                            <span className={cn(
                              "px-2 py-1 rounded-md text-[10px] font-bold uppercase",
                              record.type === 'income' ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"
                            )}>
                              {record.type === 'income' ? 'আয়' : 'ব্যয়'}
                            </span>
                          </td>
                          <td className="py-4 text-sm text-neutral-500 max-w-xs truncate">{record.notes || '-'}</td>
                          <td className="py-4 text-sm font-bold text-right">
                            <div className="flex items-center justify-end gap-3">
                              <span className={record.type === 'income' ? "text-emerald-600" : "text-red-600"}>
                                {record.type === 'income' ? '+' : '-'}৳{record.amount.toLocaleString('bn-BD')}
                              </span>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                  onClick={() => handleEdit(record as Transaction)}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                                  title="সম্পাদনা করুন"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirm({ id: record.id, type: record.type })}
                                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                                  title="মুছে ফেলুন"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allTransactions.length === 0 && (
                    <div className="text-center py-20">
                      <History className="w-12 h-12 text-neutral-200 mx-auto mb-4" />
                      <p className="text-neutral-400">কোনো ইতিহাস নেই</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {activeTab === 'insights' && (
              <div className="grid grid-cols-1 gap-6">
                <Card title="আর্থিক বিশ্লেষণ (সাপ্তাহিক)" icon={BarChart3}>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#888' }} />
                        <Tooltip />
                        <Line type="monotone" dataKey="income" name="আয়" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="expense" name="ব্যয়" stroke="#ef4444" strokeWidth={3} dot={{ r: 4, fill: '#ef4444' }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="net" name="নিট" stroke="#3b82f6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
            />
            <motion.aside 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-white z-40 p-6 flex flex-col lg:hidden"
            >
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-600 rounded-lg">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-xl font-bold text-neutral-900">গ্রিন জেন্টস</h1>
                </div>
                <button onClick={() => setIsSidebarOpen(false)}>
                  <X className="w-6 h-6 text-neutral-400" />
                </button>
              </div>

              <nav className="flex-1 space-y-2">
                {[
                  { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: BarChart3 },
                  { id: 'history', label: 'ইতিহাস', icon: History },
                  { id: 'insights', label: 'বিশ্লেষণ', icon: PieChart },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id as any);
                      setIsSidebarOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                      activeTab === item.id 
                        ? "bg-emerald-50 text-emerald-700" 
                        : "text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900"
                    )}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </button>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Add Transaction Modal */}
      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAdding(false)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-neutral-900">
                    {isEditing ? 'রেকর্ড সংশোধন করুন' : 'লেনদেন যোগ করুন'}
                  </h3>
                  <button 
                    onClick={() => {
                      setIsAdding(false);
                      setIsEditing(false);
                      setEditingId(null);
                      setFormData({
                        amount: '',
                        date: format(new Date(), 'yyyy-MM-dd'),
                        notes: '',
                        type: 'income',
                        category: 'General'
                      });
                    }} 
                    className="p-2 hover:bg-neutral-50 rounded-full transition-colors"
                  >
                    <X className="w-5 h-5 text-neutral-400" />
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Type Selector */}
                  <div className="flex p-1 bg-neutral-100 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'income' })}
                      className={cn(
                        "flex-1 py-2 text-sm font-bold rounded-xl transition-all",
                        formData.type === 'income' ? "bg-white text-emerald-600 shadow-sm" : "text-neutral-500"
                      )}
                    >
                      আয়
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, type: 'expense' })}
                      className={cn(
                        "flex-1 py-2 text-sm font-bold rounded-xl transition-all",
                        formData.type === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-neutral-500"
                      )}
                    >
                      ব্যয়
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">পরিমাণ (৳)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-neutral-400">৳</span>
                      <input
                        type="number"
                        step="1"
                        required
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all text-lg font-semibold"
                        placeholder="০.০০"
                        autoFocus
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">তারিখ</label>
                    <input
                      type="date"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>

                  {formData.type === 'expense' && (
                    <div>
                      <label className="block text-sm font-medium text-neutral-700 mb-2">ব্যয়ের ধরন</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                        className="w-full px-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
                      >
                        <option value="General">সাধারণ</option>
                        <option value="Supplies">মালামাল</option>
                        <option value="Rent">ভাড়া</option>
                        <option value="Electricity">বিদ্যুৎ বিল</option>
                        <option value="Staff">স্টাফ বেতন</option>
                        <option value="Others">অন্যান্য</option>
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-neutral-700 mb-2">নোট (ঐচ্ছিক)</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-4 bg-neutral-50 border border-neutral-100 rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all resize-none h-24"
                      placeholder="বিশেষ কিছু থাকলে লিখুন..."
                    />
                  </div>

                  {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    className={cn(
                      "w-full py-4 text-white rounded-2xl font-bold text-lg transition-all shadow-lg",
                      formData.type === 'income' ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100" : "bg-red-600 hover:bg-red-700 shadow-red-100"
                    )}
                  >
                    সংরক্ষণ করুন
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirm(null)}
              className="absolute inset-0 bg-neutral-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-neutral-900 mb-2">আপনি কি নিশ্চিত?</h3>
              <p className="text-neutral-500 mb-8">আপনি কি এই রেকর্ডটি মুছে ফেলতে চান? এটি আর ফিরে পাওয়া যাবে না।</p>
              
              {error && (
                <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-xl text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="py-3 px-4 bg-neutral-100 text-neutral-600 rounded-xl font-semibold hover:bg-neutral-200 transition-colors"
                >
                  না, থাক
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isDeleting}
                  className="py-3 px-4 bg-red-600 text-white rounded-xl font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
                >
                  {isDeleting ? 'মুছছে...' : 'হ্যাঁ, মুছুন'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
