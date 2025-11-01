import React, { useState, useMemo } from 'react';
import { SavingsGoal, Transaction } from '../types';
import { Card, Button, Input, Select } from './common';
import { PlusIcon, TrashIcon } from './icons';

interface SavingsGoalsPageProps {
  savingsGoals: SavingsGoal[];
  setSavingsGoals: React.Dispatch<React.SetStateAction<SavingsGoal[]>>;
  allTransactions: Transaction[];
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'type'>) => void;
  sources: string[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const DepositModal: React.FC<{ goal: SavingsGoal; sources: string[]; onDeposit: (amount: number, source: string) => void; onClose: () => void; }> = ({ goal, sources, onDeposit, onClose }) => {
    const [amount, setAmount] = useState('');
    const [source, setSource] = useState(sources[0] || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numericAmount = parseFloat(amount);
        if (!isNaN(numericAmount) && numericAmount > 0 && source) {
            onDeposit(numericAmount, source);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
            <div className="bg-base-100 p-6 rounded-lg shadow-xl w-full max-w-md border border-neutral">
                <form onSubmit={handleSubmit} className="space-y-4">
                    <h3 className="text-lg font-bold text-slate-100">Deposit to: <span className="text-primary">{goal.name}</span></h3>
                    <Input label="Amount" id="deposit-amount" type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} required autoFocus />
                    <Select label="From Source" id="deposit-source" value={source} onChange={e => setSource(e.target.value)} required>
                        {sources.map(s => <option key={s} value={s}>{s}</option>)}
                    </Select>
                    <div className="flex justify-end space-x-2 pt-4">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Confirm Deposit</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const SavingsGoalsPage: React.FC<SavingsGoalsPageProps> = ({ savingsGoals, setSavingsGoals, allTransactions, onAddTransaction, sources }) => {
    const [newGoalName, setNewGoalName] = useState('');
    const [newGoalTarget, setNewGoalTarget] = useState('');
    const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
    
    const generateId = () => Math.random().toString(36).substring(2, 9);

    const handleAddGoal = (e: React.FormEvent) => {
        e.preventDefault();
        const targetAmount = parseFloat(newGoalTarget);
        if (newGoalName.trim() && !isNaN(targetAmount) && targetAmount > 0) {
            const newGoal: SavingsGoal = {
                id: generateId(),
                name: newGoalName.trim(),
                targetAmount,
            };
            setSavingsGoals(prev => [...prev, newGoal]);
            setNewGoalName('');
            setNewGoalTarget('');
        }
    };
    
    const handleDeleteGoal = (id: string) => {
        if (window.confirm("Are you sure you want to delete this goal? This will not delete associated transactions, but will unlink them.")) {
             setSavingsGoals(prev => prev.filter(g => g.id !== id));
        }
    };
    
    const handleDeposit = (amount: number, source: string) => {
        if (!depositGoal) return;
        
        onAddTransaction({
            description: `Deposit to savings: ${depositGoal.name}`,
            amount,
            date: new Date().toISOString().split('T')[0],
            category: 'Poupança',
            source,
            entryType: 'expense',
            goalId: depositGoal.id,
        });
        
        setDepositGoal(null); // Close modal
    };
    
    const goalsWithProgress = useMemo(() => {
        return savingsGoals.map(goal => {
            const currentAmount = allTransactions
                .filter(t => t.goalId === goal.id && t.entryType === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);
            return { ...goal, currentAmount };
        }).sort((a,b) => a.name.localeCompare(b.name));
    }, [savingsGoals, allTransactions]);

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">Savings Goals</h1>
            
            <Card title="Create New Goal">
                <form onSubmit={handleAddGoal} className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                    <div className="sm:col-span-2">
                        <Input label="Goal Name" type="text" placeholder="e.g., New Car, Vacation" value={newGoalName} onChange={e => setNewGoalName(e.target.value)} required />
                    </div>
                    <Input label="Target Amount" type="number" step="0.01" placeholder="5000.00" value={newGoalTarget} onChange={e => setNewGoalTarget(e.target.value)} required />
                    <div className="sm:col-span-3 text-right">
                        <Button type="submit" className="flex items-center justify-center ml-auto">
                            <PlusIcon className="h-5 w-5 mr-2" /> Add Goal
                        </Button>
                    </div>
                </form>
            </Card>

            <Card title="Your Goals">
                {goalsWithProgress.length > 0 ? (
                    <div className="space-y-6">
                        {goalsWithProgress.map(goal => {
                             const percentage = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
                            return (
                                <div key={goal.id} className="p-4 bg-neutral/50 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-xl font-bold text-slate-100">{goal.name}</h3>
                                            <p className="text-slate-300 font-semibold">{formatCurrency(goal.currentAmount)} <span className="text-slate-400">of {formatCurrency(goal.targetAmount)}</span></p>
                                        </div>
                                        <div className="flex gap-2">
                                            <Button onClick={() => setDepositGoal(goal)}>Deposit</Button>
                                            <Button variant="danger" className="p-2 h-auto" onClick={() => handleDeleteGoal(goal.id)}><TrashIcon /></Button>
                                        </div>
                                    </div>
                                    <div className="mt-3">
                                        <div className="w-full bg-neutral rounded-full h-4 border border-slate-600">
                                            <div className="bg-primary h-full rounded-full transition-all duration-500 text-right pr-2 text-xs font-bold text-slate-900 flex items-center justify-end" style={{ width: `${percentage}%` }}>
                                                {percentage.toFixed(0)}%
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center text-slate-400 py-8">
                        <p>You haven't set any savings goals yet.</p>
                        <p>Use the form above to get started!</p>
                    </div>
                )}
            </Card>

            {depositGoal && (
                <DepositModal 
                    goal={depositGoal}
                    sources={sources}
                    onDeposit={handleDeposit}
                    onClose={() => setDepositGoal(null)}
                />
            )}
        </div>
    );
};

export default SavingsGoalsPage;
