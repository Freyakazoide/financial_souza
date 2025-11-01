import React, { useState, useMemo } from 'react';
import { MonthlyBill, Transaction, TransactionStatus, MonthlyIncome, IncomeStatus, Budget, SavingsGoal } from '../types';
import { Card, Button, Input, Select } from './common';
import { PlusIcon, CheckCircleIcon, EditIcon, ChevronLeftIcon, ChevronRightIcon } from './icons';

interface DashboardProps {
  monthlyBills: MonthlyBill[];
  monthlyIncomes: MonthlyIncome[];
  transactions: Transaction[];
  allTransactions: Transaction[];
  savingsGoals: SavingsGoal[];
  budgets: Budget[];
  onSetBillPaid: (billId: string, paidDate: string, amount?: number) => void;
  onSetIncomeReceived: (incomeId: string, receivedDate: string, amount?: number) => void;
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'type'>) => void;
  onUpdateMonthlyBillAmount: (billId: string, newAmount: number) => void;
  onUpdateMonthlyIncomeAmount: (incomeId: string, newAmount: number) => void;
  categories: string[];
  sources: string[];
  viewingDate: Date;
  onMonthChange: (direction: 'next' | 'prev') => void;
}

const formatCurrency = (value?: number | null) => {
    if (value == null || isNaN(value)) {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0);
    }
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
};

const ManualEntryForm: React.FC<{onAddTransaction: DashboardProps['onAddTransaction'], categories: string[], sources: string[], onClose: () => void}> = ({ onAddTransaction, categories, sources, onClose }) => {
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [category, setCategory] = useState(categories[0] || '');
    const [source, setSource] = useState(sources[0] || '');
    const [entryType, setEntryType] = useState<'expense' | 'income'>('expense');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (description && amount && date && category && source) {
            onAddTransaction({
                description,
                amount: parseFloat(amount),
                date,
                category,
                source,
                entryType,
            });
            onClose();
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="text-lg font-bold text-slate-100">Add Manual Transaction</h3>
            
            <div className="flex gap-2 rounded-lg bg-neutral/50 p-1">
                <button type="button" onClick={() => setEntryType('expense')} className={`flex-1 p-2 rounded-md text-sm font-semibold transition-colors ${entryType === 'expense' ? 'bg-danger text-white' : 'text-slate-400 hover:bg-neutral'}`}>Expense</button>
                <button type="button" onClick={() => setEntryType('income')} className={`flex-1 p-2 rounded-md text-sm font-semibold transition-colors ${entryType === 'income' ? 'bg-success text-white' : 'text-slate-400 hover:bg-neutral'}`}>Income</button>
            </div>

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

const Dashboard: React.FC<DashboardProps> = ({ monthlyBills, monthlyIncomes, transactions, allTransactions, savingsGoals, budgets, onSetBillPaid, onSetIncomeReceived, onAddTransaction, categories, sources, viewingDate, onMonthChange, onUpdateMonthlyBillAmount, onUpdateMonthlyIncomeAmount }) => {
    const [showManualForm, setShowManualForm] = useState(false);
    const [editingBill, setEditingBill] = useState<{id: string, amount: string} | null>(null);
    const [editingIncome, setEditingIncome] = useState<{id: string, amount: string} | null>(null);

    const { totalIncome, totalExpenses, balance } = useMemo(() => {
        // FIX: Ensure amounts are treated as numbers during reduction.
        const income = transactions.filter(t => t.entryType === 'income').reduce((acc, t) => acc + Number(t.amount), 0);
        const expenses = transactions.filter(t => t.entryType === 'expense' && t.category !== 'Poupança').reduce((acc, t) => acc + Number(t.amount), 0);
        return { totalIncome: income, totalExpenses: expenses, balance: income - expenses };
    }, [transactions]);

    const { paidAmount, pendingAmount } = useMemo(() => {
        return monthlyBills.reduce((acc, bill) => {
            if (bill.status === TransactionStatus.Paid) {
                // FIX: Ensure bill amount is a number before addition.
                acc.paidAmount += Number(bill.amount);
            } else {
                // FIX: Ensure bill amount is a number before addition.
                acc.pendingAmount += Number(bill.amount);
            }
            return acc;
        }, { paidAmount: 0, pendingAmount: 0 });
    }, [monthlyBills]);

    const { receivedAmount, pendingIncomeAmount } = useMemo(() => {
        return monthlyIncomes.reduce((acc, income) => {
            if (income.status === IncomeStatus.Received) {
                // FIX: Ensure income amount is a number before addition.
                acc.receivedAmount += Number(income.amount);
            } else {
                // FIX: Ensure income amount is a number before addition.
                acc.pendingIncomeAmount += Number(income.amount);
            }
            return acc;
        }, { receivedAmount: 0, pendingIncomeAmount: 0 });
    }, [monthlyIncomes]);
    
    const spendingWithBudgets = useMemo(() => {
        const categoryMap: { [key: string]: { spent: number; budget?: number } } = {};

        budgets.forEach(b => {
            if (b.category !== 'Renda') {
                // FIX: Ensure budget amount is a number.
                categoryMap[b.category] = { spent: 0, budget: Number(b.amount) };
            }
        });

        transactions.filter(t => t.entryType === 'expense').forEach(t => {
            if (categoryMap[t.category]) {
                // FIX: Ensure transaction amount is a number before addition.
                categoryMap[t.category].spent += Number(t.amount);
            } else if (t.category !== 'Renda' && t.category !== 'Dívidas' && t.category !== 'Poupança') {
                 // FIX: Ensure transaction amount is a number.
                 categoryMap[t.category] = { spent: Number(t.amount), budget: undefined };
            }
        });
        
        return Object.entries(categoryMap)
            .map(([name, data]) => ({ name, ...data }))
            .filter(item => item.spent > 0 || item.budget !== undefined)
            .sort((a, b) => (b.budget ?? 0) - (a.budget ?? 0));
    }, [transactions, budgets]);

    const expenseToIncomeRatio = useMemo(() => totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0, [totalIncome, totalExpenses]);

    const incomeAnalysisCategories = useMemo(() => {
        if (totalIncome === 0) return [];
    
        const categorySpending = transactions
            .filter(t => t.entryType === 'expense' && t.category !== 'Poupança' && t.category !== 'Dívidas')
            .reduce((acc, t) => {
                // FIX: Ensure transaction amount is a number before addition.
// FIX: The left-hand side of an arithmetic operation must be of type 'any', 'number', 'bigint' or an enum type.
                acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
                return acc;
            }, {} as Record<string, number>);
    
        return Object.entries(categorySpending)
            .map(([name, spent]) => ({
                name,
                spent,
                percentage: (spent / totalIncome) * 100,
            }))
            .sort((a, b) => b.spent - a.spent)
            .slice(0, 5); // Show top 5 categories
    }, [transactions, totalIncome]);
    
    const handleAmountEdit = (bill: MonthlyBill) => {
        setEditingBill({id: bill.id, amount: String(bill.amount)});
    };

    const handleAmountSave = (billId: string) => {
        if (editingBill && !isNaN(parseFloat(editingBill.amount))) {
            onUpdateMonthlyBillAmount(billId, parseFloat(editingBill.amount));
        }
        setEditingBill(null);
    }
    
    const handleIncomeAmountEdit = (income: MonthlyIncome) => {
        setEditingIncome({id: income.id, amount: String(income.amount)});
    };

    const handleIncomeAmountSave = (incomeId: string) => {
        if (editingIncome && !isNaN(parseFloat(editingIncome.amount))) {
            onUpdateMonthlyIncomeAmount(incomeId, parseFloat(editingIncome.amount));
        }
        setEditingIncome(null);
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
                    <p className={`text-3xl font-bold ${balance >= 0 ? 'text-white' : 'text-danger'}`}>{formatCurrency(balance)}</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <div className="lg:col-span-3 flex flex-col gap-6">
                    <Card title="Fixed Bills Status" className="flex-1">
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
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
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
                    <Card title="Recurring Income Status" className="flex-1">
                        <div className="flex justify-around mb-4 text-center">
                            <div>
                                <p className="text-slate-400">Received</p>
                                <p className="text-2xl font-bold text-success">{formatCurrency(receivedAmount)}</p>
                            </div>
                            <div>
                                <p className="text-slate-400">Pending</p>
                                <p className="text-2xl font-bold text-warning">{formatCurrency(pendingIncomeAmount)}</p>
                            </div>
                        </div>
                        <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                            {monthlyIncomes.sort((a,b) => a.incomeDay - b.incomeDay).map(income => (
                                <div key={income.id} className="flex items-center justify-between p-3 bg-neutral/50 rounded-lg hover:bg-neutral/80 transition-colors">
                                    <div>
                                        <p className="font-semibold text-slate-200">{income.name}</p>
                                        <p className="text-sm text-slate-400">
                                            Expected Day: {income.incomeDay} - 
                                            <span className={`ml-1 font-bold ${
                                                income.status === IncomeStatus.Received ? 'text-success' : 'text-warning'
                                            }`}>{income.status}</span>
                                        </p>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {editingIncome?.id === income.id ? (
                                            <input 
                                                type="number"
                                                value={editingIncome.amount}
                                                onChange={e => setEditingIncome({...editingIncome, amount: e.target.value})}
                                                onBlur={() => handleIncomeAmountSave(income.id)}
                                                onKeyDown={e => e.key === 'Enter' && handleIncomeAmountSave(income.id)}
                                                className="w-24 px-2 py-1 bg-slate-800 border border-primary rounded-md text-right font-bold text-slate-100"
                                                autoFocus
                                            />
                                        ) : (
                                            <>
                                                <span className="font-bold text-slate-100">{formatCurrency(income.amount)}</span>
                                                {income.status !== IncomeStatus.Received && <button onClick={() => handleIncomeAmountEdit(income)} className="p-1 text-slate-400 hover:text-primary"><EditIcon className="w-4 h-4" /></button>}
                                            </>
                                        )}

                                        {income.status !== IncomeStatus.Received ? (
                                            <Button variant="ghost" className="px-3 py-1 text-xs" onClick={() => onSetIncomeReceived(income.id, new Date().toISOString().split('T')[0])}>Receive</Button>
                                        ) : (
                                            <CheckCircleIcon className="h-6 w-6 text-success"/>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>
                <div className="lg:col-span-2 flex flex-col gap-6">
                    <Card title="Spending by Category">
                        {spendingWithBudgets.length > 0 ? (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {spendingWithBudgets.map(item => {
                                const percentage = item.budget ? Math.min((item.spent / item.budget) * 100, 100) : 0;
                                const barColor = percentage >= 95 ? 'bg-danger' : percentage >= 75 ? 'bg-warning' : 'bg-success';
                                return (
                                    <div key={item.name}>
                                        <div className="flex justify-between items-baseline mb-1">
                                            <span className="font-semibold text-slate-200">{item.name}</span>
                                            <span className="text-sm text-slate-400">
                                                {formatCurrency(item.spent)}
                                                {item.budget && ` / ${formatCurrency(item.budget)}`}
                                            </span>
                                        </div>
                                        {item.budget && (
                                            <div className="w-full bg-neutral rounded-full h-2.5">
                                                <div className={`${barColor} h-2.5 rounded-full transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">No expenses to display.</div>
                        )}
                    </Card>
                    <Card title="Análise de Renda">
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between items-baseline mb-1">
                                    <span className="font-semibold text-slate-200">Comprometimento da Renda</span>
                                    <span className="font-bold text-lg text-white">
                                        {expenseToIncomeRatio.toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-full bg-neutral rounded-full h-3.5">
                                    <div 
                                        className="bg-primary h-3.5 rounded-full transition-all duration-500" 
                                        style={{ width: `${Math.min(expenseToIncomeRatio, 100)}%` }}>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-400 mt-1">Total de despesas representa {expenseToIncomeRatio.toFixed(1)}% da sua renda total.</p>
                            </div>
                            
                            <hr className="border-neutral/50" />

                            <div>
                                <h4 className="font-semibold text-slate-300 mb-2">Principais Despesas (% da Renda)</h4>
                                <div className="space-y-3">
                                    {incomeAnalysisCategories.length > 0 ? incomeAnalysisCategories.map(item => (
                                        <div key={item.name}>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-300">{item.name}</span>
                                                <span className="font-semibold text-slate-200">{item.percentage.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-neutral rounded-full h-2 mt-1">
                                                <div 
                                                    className="bg-secondary h-2 rounded-full" 
                                                    style={{ width: `${Math.min(item.percentage, 100)}%` }}>
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <p className="text-sm text-slate-400 text-center py-2">Sem despesas para analisar.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                     <Card title="Savings Goals">
                        {savingsGoals.length > 0 ? (
                            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                                {savingsGoals.map(goal => {
                                    const currentAmount = allTransactions
                                        .filter(t => t.goalId === goal.id)
                                        // FIX: Ensure transaction amount is a number before reduction.
                                        .reduce((sum, t) => sum + Number(t.amount), 0);
                                    const percentage = Math.min((currentAmount / goal.targetAmount) * 100, 100);
                                    return (
                                        <div key={goal.id}>
                                            <div className="flex justify-between items-baseline mb-1">
                                                <span className="font-semibold text-slate-200">{goal.name}</span>
                                                <span className="text-sm text-slate-400">
                                                    {formatCurrency(currentAmount)} / {formatCurrency(goal.targetAmount)}
                                                </span>
                                            </div>
                                            <div className="w-full bg-neutral rounded-full h-2.5">
                                                <div className="bg-primary h-2.5 rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-400">
                                <p>No savings goals yet. Add one in the Savings page!</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
            
            <Card title="Recent Variable Transactions">
                <div className="max-h-80 overflow-y-auto pr-2">
                    {transactions.length > 0 ? (
                        <ul className="space-y-3">
                            {transactions
                                .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .map(t => (
                                <li key={t.id} className="flex items-center justify-between p-3 bg-neutral/50 rounded-lg">
                                    <div>
                                        <p className="font-semibold text-slate-200">{t.description}</p>
                                        <p className="text-sm text-slate-400">{t.date} - <span className="font-medium text-primary/80">{t.category}</span></p>
                                    </div>
                                    <span className={`font-bold text-lg ${t.entryType === 'income' ? 'text-success' : 'text-danger'}`}>
                                      {t.entryType === 'income' ? '+' : '-'}
                                      {formatCurrency(t.amount)}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <div className="flex items-center justify-center h-24 text-slate-400">No transactions this month.</div>
                    )}
                </div>
            </Card>

        </div>
    );
};

export default Dashboard;