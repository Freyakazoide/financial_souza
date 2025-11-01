import React, { useState, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { MonthlyBill, Transaction, TransactionStatus, TransactionType } from '../types';
import { Card, Button, Input, Select } from './common';
import { PlusIcon, CheckCircleIcon, EditIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface DashboardProps {
  monthlyBills: MonthlyBill[];
  transactions: Transaction[];
  onSetBillPaid: (billId: string, paidDate: string) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'type'>) => void;
  onUpdateMonthlyBillAmount: (billId: string, newAmount: number) => void;
  categories: string[];
  sources: string[];
  viewingDate: Date;
  onMonthChange: (direction: 'next' | 'prev') => void;
}

const COLORS = ['#2dd4bf', '#99f6e4', '#0d9488', '#facc15', '#f87171', '#38bdf8', '#a78bfa', '#fb923c'];

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const ManualEntryForm: React.FC<{onAddTransaction: DashboardProps['onAddTransaction'], categories: string[], sources: string[], onClose: () => void}> = ({ onAddTransaction, categories, sources, onClose }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState(categories[0] || '');
    const [source, setSource] = useState(sources[0] || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (description && amount && date && category && source) {
            onAddTransaction({
                description,
                amount: parseFloat(amount),
                date,
                category,
                source,
            });
            onClose();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Add Manual Transaction</h3>
            <Input label="Description" id="desc" type="text" value={description} onChange={e => setDescription(e.target.value)} required />
            <Input label="Amount" id="amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required />
            <Input label="Date" id="date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
            <Select label="Category" id="category" value={category} onChange={e => setCategory(e.target.value)} required>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </Select>
            <Select label="Source" id="source" value={source} onChange={e => setSource(e.target.value)} required>
                {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </Select>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                <Button type="submit">Add</Button>
            </div>
        </form>
    );
};

const Dashboard: React.FC<DashboardProps> = ({ monthlyBills, transactions, onSetBillPaid, onAddTransaction, categories, sources, viewingDate, onMonthChange, onUpdateMonthlyBillAmount }) => {
    const [showManualForm, setShowManualForm] = useState(false);
    const [editingBill, setEditingBill] = useState<{id: string, amount: string} | null>(null);

    const { totalIncome, totalExpenses, balance } = useMemo(() => {
        const totalIncome = 0; // Assuming no income tracking for now
        const totalExpenses = transactions.reduce((acc, t) => acc + t.amount, 0);
        return { totalIncome, totalExpenses, balance: totalIncome - totalExpenses };
    }, [transactions]);

    const { paidAmount, pendingAmount } = useMemo(() => {
        return monthlyBills.reduce((acc, bill) => {
            if (bill.status === TransactionStatus.Paid) {
                acc.paidAmount += bill.amount;
            } else {
                acc.pendingAmount += bill.amount;
            }
            return acc;
        }, { paidAmount: 0, pendingAmount: 0 });
    }, [monthlyBills]);
    
    const spendingByCategory = useMemo(() => {
        const categoryMap: { [key: string]: number } = {};
        transactions.forEach(t => {
            categoryMap[t.category] = (categoryMap[t.category] || 0) + t.amount;
        });
        return Object.entries(categoryMap).map(([name, value]) => ({ name, value }));
    }, [transactions]);
    
    const handleAmountEdit = (bill: MonthlyBill) => {
        setEditingBill({id: bill.id, amount: String(bill.amount)});
    };

    const handleAmountSave = (billId: string) => {
        if (editingBill && !isNaN(parseFloat(editingBill.amount))) {
            onUpdateMonthlyBillAmount(billId, parseFloat(editingBill.amount));
        }
        setEditingBill(null);
    }

    const viewingMonthName = viewingDate.toLocaleString('default', { month: 'long', year: 'numeric' });

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <Button onClick={() => onMonthChange('prev')} variant="ghost" className="p-2"><ChevronLeftIcon /></Button>
                    <h1 className="text-3xl font-bold text-slate-100">{viewingMonthName}</h1>
                    <Button onClick={() => onMonthChange('next')} variant="ghost" className="p-2"><ChevronRightIcon /></Button>
                </div>
                <Button onClick={() => setShowManualForm(true)} className="flex items-center space-x-2">
                    <PlusIcon />
                    <span>New Transaction</span>
                </Button>
            </div>
            
            {showManualForm && (
                <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
                    <div className="bg-base-100 p-6 rounded-lg shadow-xl w-full max-w-md border border-neutral">
                       <ManualEntryForm onAddTransaction={onAddTransaction} categories={categories} sources={sources} onClose={() => setShowManualForm(false)} />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-t-4 border-success">
                    <h3 className="text-lg font-semibold text-slate-300">Total Revenue</h3>
                    <p className="text-3xl font-bold text-white">{formatCurrency(totalIncome)}</p>
                </Card>
                <Card className="border-t-4 border-danger">
                    <h3 className="text-lg font-semibold text-slate-300">Total Expenses</h3>
                    <p className="text-3xl font-bold text-white">{formatCurrency(totalExpenses)}</p>
                </Card>
                <Card className="border-t-4 border-info">
                    <h3 className="text-lg font-semibold text-slate-300">Current Balance</h3>
                    <p className="text-3xl font-bold text-white">{formatCurrency(balance)}</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <Card title="Fixed Bills Status" className="lg:col-span-3">
                    <div className="flex justify-around mb-4 text-center">
                        <div>
                            <p className="text-slate-400">Paid</p>
                            <p className="text-2xl font-bold text-success">{formatCurrency(paidAmount)}</p>
                        </div>
                        <div>
                            <p className="text-slate-400">Pending</p>
                            <p className="text-2xl font-bold text-danger">{formatCurrency(pendingAmount)}</p>
                        </div>
                    </div>
                    <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                        {monthlyBills.sort((a,b) => a.dueDay - b.dueDay).map(bill => (
                            <div key={bill.id} className="flex items-center justify-between p-3 bg-neutral/50 rounded-lg hover:bg-neutral/80 transition-colors">
                                <div>
                                    <p className="font-semibold text-slate-200">{bill.name}</p>
                                    <p className="text-sm text-slate-400">
                                        Due Day: {bill.dueDay} - 
                                        <span className={`ml-1 font-bold ${
                                            bill.status === TransactionStatus.Paid ? 'text-success' : 
                                            bill.status === TransactionStatus.Overdue ? 'text-danger' : 'text-warning'
                                        }`}>{bill.status}</span>
                                    </p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    {editingBill?.id === bill.id ? (
                                        <input 
                                            type="number"
                                            value={editingBill.amount}
                                            onChange={e => setEditingBill({...editingBill, amount: e.target.value})}
                                            onBlur={() => handleAmountSave(bill.id)}
                                            onKeyDown={e => e.key === 'Enter' && handleAmountSave(bill.id)}
                                            className="w-24 px-2 py-1 bg-slate-800 border border-primary rounded-md text-right font-bold text-slate-100"
                                            autoFocus
                                        />
                                    ) : (
                                        <>
                                            <span className="font-bold text-slate-100">{formatCurrency(bill.amount)}</span>
                                            {bill.status !== TransactionStatus.Paid && <button onClick={() => handleAmountEdit(bill)} className="p-1 text-slate-400 hover:text-primary"><EditIcon className="w-4 h-4" /></button>}
                                        </>
                                    )}

                                    {bill.status !== TransactionStatus.Paid ? (
                                        <Button variant="ghost" className="px-3 py-1 text-xs" onClick={() => onSetBillPaid(bill.id, new Date().toISOString().split('T')[0])}>Pay</Button>
                                    ) : (
                                        <CheckCircleIcon className="h-6 w-6 text-success"/>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
                <Card title="Spending by Category" className="lg:col-span-2">
                    {spendingByCategory.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={spendingByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" labelLine={false}>
                                    {spendingByCategory.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155' }} />
                                <Legend formatter={(value) => <span className="text-slate-300">{value}</span>}/>
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                         <div className="flex items-center justify-center h-full text-slate-400">No transactions this month.</div>
                    )}
                </Card>
            </div>
            
            <Card title="Recent Variable Transactions">
                <div className="max-h-80 overflow-y-auto pr-2">
                    {transactions.filter(t => t.type === TransactionType.Variable).length > 0 ? (
                        <ul className="space-y-3">
                            {transactions.filter(t => t.type === TransactionType.Variable)
                                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(t => (
                                <li key={t.id} className="flex items-center justify-between p-3 bg-neutral/50 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-slate-200">{t.description}</p>
                                        <p className="text-sm text-slate-400">{t.date} - <span className="font-medium text-primary/80">{t.category}</span></p>
                                    </div>
                                    <span className="font-bold text-lg text-danger">{formatCurrency(t.amount)}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex items-center justify-center h-24 text-slate-400">No variable transactions this month.</div>
                    )}
                </div>
            </Card>

        </div>
    );
};

export default Dashboard;