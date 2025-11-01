

import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Transaction, MonthlyBill } from '../types';
import { Card, Button, Input, Select } from './common';

interface HistoryPageProps {
  allTransactions: Transaction[];
  monthlyBills: MonthlyBill[];
  categories: string[];
  sources: string[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

type SortableKeys = 'date' | 'description' | 'category' | 'amount';

const HistoryPage: React.FC<HistoryPageProps> = ({ allTransactions, categories, sources }) => {
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterCategory, setFilterCategory] = useState<string>('all');
    const [filterSource, setFilterSource] = useState<string>('all');
    const [filterStartDate, setFilterStartDate] = useState<string>('');
    const [filterEndDate, setFilterEndDate] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'descending' });

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const getSortIndicator = (key: SortableKeys) => {
        if (!sortConfig || sortConfig.key !== key) {
            return <span className="ml-1 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">↕</span>;
        }
        if (sortConfig.direction === 'ascending') {
            return <span className="ml-1 text-slate-200">▲</span>;
        }
        return <span className="ml-1 text-slate-200">▼</span>;
    };

    const filteredTransactions = useMemo(() => {
        let transactionsToProcess = allTransactions.filter(t => {
            const lowerCaseSearch = searchTerm.toLowerCase();
            if (searchTerm && !t.description.toLowerCase().includes(lowerCaseSearch) && !t.category.toLowerCase().includes(lowerCaseSearch)) return false;
            if (filterCategory !== 'all' && t.category !== filterCategory) return false;
            if (filterSource !== 'all' && t.source !== filterSource) return false;
            if (filterStartDate && t.date < filterStartDate) return false;
            if (filterEndDate && t.date > filterEndDate) return false;
            return true;
        });

        if (sortConfig) {
            transactionsToProcess.sort((a, b) => {
                const aValue = a[sortConfig.key];
                const bValue = b[sortConfig.key];
                
                let compare = 0;
                if (aValue < bValue) {
                    compare = -1;
                } else if (aValue > bValue) {
                    compare = 1;
                }

                if (compare !== 0) {
                    return sortConfig.direction === 'ascending' ? compare : -compare;
                }
                
                if (sortConfig.key !== 'date') {
                    return b.date.localeCompare(a.date);
                }

                return 0;
            });
        }
        return transactionsToProcess;
    }, [allTransactions, searchTerm, filterCategory, filterSource, filterStartDate, filterEndDate, sortConfig]);

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
                </div>
            </Card>

            <Card title="Transaction History">
                <div className="max-h-96 overflow-y-auto">
                    <table className="min-w-full divide-y divide-neutral">
                        <thead className="bg-neutral/50 sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider group cursor-pointer" onClick={() => requestSort('date')}>
                                    <div className="flex items-center">Date {getSortIndicator('date')}</div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider group cursor-pointer" onClick={() => requestSort('description')}>
                                    <div className="flex items-center">Description {getSortIndicator('description')}</div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider group cursor-pointer" onClick={() => requestSort('category')}>
                                    <div className="flex items-center">Category {getSortIndicator('category')}</div>
                                </th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase tracking-wider group cursor-pointer" onClick={() => requestSort('amount')}>
                                    <div className="flex items-center">Amount {getSortIndicator('amount')}</div>
                                </th>
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
        </div>
    );
};

export default HistoryPage;
