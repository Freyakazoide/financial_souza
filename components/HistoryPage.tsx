

import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction, MonthlyBill, SpendingPattern } from '../types';
import { Card, Button, Input, Select } from './common';

interface HistoryPageProps {
  allTransactions: Transaction[];
  monthlyBills: MonthlyBill[];
  categories: string[];
  sources: string[];
  spendingPatterns: SpendingPattern[] | null;
  onAnalyzePatterns: () => void;
  isLoadingPatterns: boolean;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const HistoryPage: React.FC<HistoryPageProps> = ({ allTransactions, categories, sources, spendingPatterns, onAnalyzePatterns, isLoadingPatterns }) => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterSource, setFilterSource] = useState<string>('all');
    const [filterStartDate, setFilterStartDate] = useState<string>('');
    const [filterEndDate, setFilterEndDate] = useState<string>('');

    const filteredTransactions = useMemo(() => {
        return allTransactions.filter(t => {
            const lowerCaseSearch = searchTerm.toLowerCase();
            if (searchTerm && !t.description.toLowerCase().includes(lowerCaseSearch) && !t.category.toLowerCase().includes(lowerCaseSearch)) return false;
            if (filterCategory !== 'all' && t.category !== filterCategory) return false;
            if (filterSource !== 'all' && t.source !== filterSource) return false;
            // Use string comparison for YYYY-MM-DD dates to avoid timezone issues
            if (filterStartDate && t.date < filterStartDate) return false;
            if (filterEndDate && t.date > filterEndDate) return false;
            return true;
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [allTransactions, searchTerm, filterCategory, filterSource, filterStartDate, filterEndDate]);

    const monthlySpendingData = useMemo(() => {
        const data: { [key: string]: number } = {};
        const lastYear = new Date();
        lastYear.setFullYear(lastYear.getFullYear() - 1);

        allTransactions
          .filter(t => t.entryType === 'expense')
          .forEach(t => {
            const date = new Date(t.date);
            if (date >= lastYear) {
                const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                data[monthKey] = (data[monthKey] || 0) + t.amount;
            }
        });

        return Object.entries(data).map(([name, total]) => ({ name, total })).sort((a,b) => a.name.localeCompare(b.name));
    }, [allTransactions]);
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">History & Reports</h1>
            
            <Card title="Filters">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="lg:col-span-2">
                        <Input label="Search by Description or Category" type="text" placeholder="e.g., Netflix, Alimentação..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <Input label="Start Date" type="date" value={filterStartDate} onChange={e => setFilterStartDate(e.target.value)} />
                    <Input label="End Date" type="date" value={filterEndDate} onChange={e => setFilterEndDate(e.target.value)} />
                    <Select label="Category" value={filterCategory} onChange={e => setFilterCategory(e.target.value)}>
                        <option value="all">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </Select>
                    {/* The Source filter might need to be wrapped or the grid adjusted if it gets too crowded */}
                    {/* <Select label="Source" value={filterSource} onChange={e => setFilterSource(e.target.value)}>
                        <option value="all">All Sources</option>
                        {sources.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select> */}
                </div>
            </Card>

            <Card title="Transaction History">
                <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-neutral">
                        <thead className="bg-neutral/50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Category</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider">Amount</th>
                            </tr>
                        </thead>
                        <tbody className="bg-base-100 divide-y divide-neutral">
                            {filteredTransactions.map(t => (
                                <tr key={t.id} className="hover:bg-neutral/30 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{t.date}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-200">{t.description}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">{t.category}</td>
                                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-semibold ${t.entryType === 'income' ? 'text-success' : 'text-danger'}`}>
                                      {t.entryType === 'income' ? '+' : '-'}
                                      {formatCurrency(t.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

             <Card title="Monthly Spending (Last 12 Months)">
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={monthlySpendingData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                        <XAxis dataKey="name" tick={{ fill: '#94a3b8' }} />
                        <YAxis tickFormatter={(value) => formatCurrency(Number(value))} tick={{ fill: '#94a3b8' }} />
                        <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{fill: 'rgba(45, 212, 191, 0.1)'}} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}/>
                        <Legend wrapperStyle={{ color: '#cbd5e1' }} formatter={(value) => <span className="text-slate-300">{value}</span>} />
                        <Bar dataKey="total" fill="#2dd4bf" name="Total Spent" />
                    </BarChart>
                </ResponsiveContainer>
            </Card>

            <Card title="Spending Pattern Analysis (AI)">
                {isLoadingPatterns ? (
                    <div className="flex justify-center items-center p-10">
                        <div className="loader"></div>
                        <p className="ml-4 text-slate-400">Analyzing patterns...</p>
                    </div>
                ) : spendingPatterns && spendingPatterns.length > 0 ? (
                    <div className="space-y-4">
                        {spendingPatterns.map((pattern, index) => (
                            <div key={index} className="p-4 bg-neutral/30 rounded-lg border border-neutral">
                                <h4 className="font-bold text-lg text-primary">{pattern.merchant}</h4>
                                <p className="text-slate-300"><strong className="font-semibold text-slate-200">Insight:</strong> {pattern.insight}</p>
                                <div className="flex justify-between items-baseline mt-2 text-sm">
                                    <span className="text-slate-400"><strong>Frequency:</strong> {pattern.frequency}</span>
                                    <span className="text-lg font-bold text-danger">{formatCurrency(pattern.totalSpent)}</span>
                                </div>
                            </div>
                        ))}
                         <div className="text-center pt-4">
                            <Button onClick={onAnalyzePatterns} variant="secondary">Analyze Again</Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center p-4">
                        <p className="mb-4 text-slate-400">Discover hidden subscriptions and spending habits in your variable expenses using AI.</p>
                        <Button onClick={onAnalyzePatterns} disabled={isLoadingPatterns}>
                            Analyze Spending Patterns
                        </Button>
                    </div>
                )}
            </Card>
        </div>
    );
};

export default HistoryPage;