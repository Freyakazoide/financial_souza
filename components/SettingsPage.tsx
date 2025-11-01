
import React, { useState, useEffect } from 'react';
import { FixedBill, RecurringIncome, Transaction } from '../types';
import { Card, Button, Input } from './common';
import { PlusIcon, TrashIcon, EditIcon, CheckCircleIcon, XCircleIcon } from './icons';

interface SettingsPageProps {
  fixedBills: FixedBill[];
  setFixedBills: React.Dispatch<React.SetStateAction<FixedBill[]>>;
  recurringIncomes: RecurringIncome[];
  setRecurringIncomes: React.Dispatch<React.SetStateAction<RecurringIncome[]>>;
  categories: string[];
  onAddCategory: (name: string) => void;
  onUpdateCategory: (oldName: string, newName: string) => void;
  onDeleteCategory: (name: string) => void;
  sources: string[];
  onAddSource: (name: string) => void;
  onUpdateSource: (oldName: string, newName: string) => void;
  onDeleteSource: (name: string) => void;
  allTransactions: Transaction[];
}

const SettingsPage: React.FC<SettingsPageProps> = ({ 
    fixedBills, setFixedBills, 
    recurringIncomes, setRecurringIncomes, 
    categories, onAddCategory, onUpdateCategory, onDeleteCategory,
    sources, onAddSource, onUpdateSource, onDeleteSource,
    allTransactions
}) => {
    const [newBill, setNewBill] = useState({ name: '', defaultValue: '', dueDay: '' });
    const [editingBill, setEditingBill] = useState<FixedBill | null>(null);
    const [newIncome, setNewIncome] = useState({ name: '', defaultValue: '', incomeDay: '' });
    const [editingIncome, setEditingIncome] = useState<RecurringIncome | null>(null);

    const [newCategory, setNewCategory] = useState('');
    const [editingCategory, setEditingCategory] = useState<string | null>(null);
    const [editingCategoryValue, setEditingCategoryValue] = useState('');

    const [newSource, setNewSource] = useState('');
    const [editingSource, setEditingSource] = useState<string | null>(null);
    const [editingSourceValue, setEditingSourceValue] = useState('');

    useEffect(() => {
        if (editingBill) {
            setNewBill({
                name: editingBill.name,
                defaultValue: String(editingBill.defaultValue),
                dueDay: String(editingBill.dueDay),
            });
        } else {
            setNewBill({ name: '', defaultValue: '', dueDay: '' });
        }
    }, [editingBill]);

    useEffect(() => {
        if (editingIncome) {
            setNewIncome({
                name: editingIncome.name,
                defaultValue: String(editingIncome.defaultValue),
                incomeDay: String(editingIncome.incomeDay),
            });
        } else {
            setNewIncome({ name: '', defaultValue: '', incomeDay: '' });
        }
    }, [editingIncome]);

    const generateId = () => Math.random().toString(36).substring(2, 9);
    
    const handleBillSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newBill.name && newBill.defaultValue && newBill.dueDay) {
            if (editingBill) {
                setFixedBills(fixedBills.map(b => b.id === editingBill.id ? {
                    ...b,
                    name: newBill.name,
                    defaultValue: parseFloat(newBill.defaultValue),
                    dueDay: parseInt(newBill.dueDay, 10),
                } : b));
                setEditingBill(null);
            } else {
                setFixedBills([...fixedBills, {
                    id: generateId(),
                    name: newBill.name,
                    defaultValue: parseFloat(newBill.defaultValue),
                    dueDay: parseInt(newBill.dueDay, 10),
                }]);
            }
            setNewBill({ name: '', defaultValue: '', dueDay: '' });
        }
    };
    
    const handleIncomeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newIncome.name && newIncome.defaultValue && newIncome.incomeDay) {
            if (editingIncome) {
                setRecurringIncomes(recurringIncomes.map(i => i.id === editingIncome.id ? {
                    ...i,
                    name: newIncome.name,
                    defaultValue: parseFloat(newIncome.defaultValue),
                    incomeDay: parseInt(newIncome.incomeDay, 10),
                } : i));
                setEditingIncome(null);
            } else {
                setRecurringIncomes([...recurringIncomes, {
                    id: generateId(),
                    name: newIncome.name,
                    defaultValue: parseFloat(newIncome.defaultValue),
                    incomeDay: parseInt(newIncome.incomeDay, 10),
                }]);
            }
            setNewIncome({ name: '', defaultValue: '', incomeDay: '' });
        }
    };

    const handleRemoveBill = (id: string) => setFixedBills(fixedBills.filter(b => b.id !== id));
    const handleRemoveIncome = (id: string) => setRecurringIncomes(recurringIncomes.filter(i => i.id !== id));
    const handleEditBill = (bill: FixedBill) => setEditingBill(bill);
    const cancelEditBill = () => setEditingBill(null);
    const handleEditIncome = (income: RecurringIncome) => setEditingIncome(income);
    const cancelEditIncome = () => setEditingIncome(null);

    // Category Handlers
    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if(newCategory) {
            onAddCategory(newCategory);
            setNewCategory('');
        }
    };
    const handleEditCategory = (name: string) => {
        setEditingCategory(name);
        setEditingCategoryValue(name);
    };
    const handleSaveCategory = () => {
        if(editingCategory) {
            onUpdateCategory(editingCategory, editingCategoryValue);
            setEditingCategory(null);
            setEditingCategoryValue('');
        }
    };
    const cancelEditCategory = () => {
        setEditingCategory(null);
        setEditingCategoryValue('');
    };

    // Source Handlers
    const handleAddSource = (e: React.FormEvent) => {
        e.preventDefault();
        if(newSource) {
            onAddSource(newSource);
            setNewSource('');
        }
    };
    const handleEditSource = (name: string) => {
        setEditingSource(name);
        setEditingSourceValue(name);
    };
    const handleSaveSource = () => {
        if(editingSource) {
            onUpdateSource(editingSource, editingSourceValue);
            setEditingSource(null);
            setEditingSourceValue('');
        }
    };
    const cancelEditSource = () => {
        setEditingSource(null);
        setEditingSourceValue('');
    };
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
            
            <Card title={editingBill ? `Editing: ${editingBill.name}` : "Manage Fixed Bills"}>
                <form onSubmit={handleBillSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end mb-4 p-4 border border-neutral rounded-lg">
                    <Input label="Name" type="text" placeholder="e.g., Internet" value={newBill.name} onChange={e => setNewBill({...newBill, name: e.target.value})} required />
                    <Input label="Default Value" type="number" step="0.01" placeholder="100.00" value={newBill.defaultValue} onChange={e => setNewBill({...newBill, defaultValue: e.target.value})} required />
                    <Input label="Due Day" type="number" placeholder="20" min="1" max="31" value={newBill.dueDay} onChange={e => setNewBill({...newBill, dueDay: e.target.value})} required />
                    <div className="flex gap-2">
                        <Button type="submit" className="h-10 flex-1 flex items-center justify-center">
                           {editingBill ? 'Update' : <><PlusIcon className="h-5 w-5 mr-2" /> Add</>}
                        </Button>
                        {editingBill && <Button type="button" variant="secondary" onClick={cancelEditBill} className="h-10">Cancel</Button>}
                    </div>
                </form>
                <div className="space-y-2">
                    {fixedBills.map(bill => (
                        <div key={bill.id} className="flex justify-between items-center p-3 bg-neutral/50 rounded-lg">
                            <span className="text-slate-200">{bill.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.defaultValue)} (Day {bill.dueDay})</span>
                            <div className="flex gap-2">
                               <Button variant="ghost" className="p-2 h-auto" onClick={() => handleEditBill(bill)}><EditIcon /></Button>
                               <Button variant="danger" className="p-2 h-auto" onClick={() => handleRemoveBill(bill.id)}><TrashIcon /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <Card title={editingIncome ? `Editing: ${editingIncome.name}` : "Manage Recurring Income"}>
                <form onSubmit={handleIncomeSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end mb-4 p-4 border border-neutral rounded-lg">
                    <Input label="Name" type="text" placeholder="e.g., Salary" value={newIncome.name} onChange={e => setNewIncome({...newIncome, name: e.target.value})} required />
                    <Input label="Default Value" type="number" step="0.01" placeholder="5000.00" value={newIncome.defaultValue} onChange={e => setNewIncome({...newIncome, defaultValue: e.target.value})} required />
                    <Input label="Income Day" type="number" placeholder="5" min="1" max="31" value={newIncome.incomeDay} onChange={e => setNewIncome({...newIncome, incomeDay: e.target.value})} required />
                    <div className="flex gap-2">
                        <Button type="submit" className="h-10 flex-1 flex items-center justify-center">
                           {editingIncome ? 'Update' : <><PlusIcon className="h-5 w-5 mr-2" /> Add</>}
                        </Button>
                        {editingIncome && <Button type="button" variant="secondary" onClick={cancelEditIncome} className="h-10">Cancel</Button>}
                    </div>
                </form>
                <div className="space-y-2">
                    {recurringIncomes.map(income => (
                        <div key={income.id} className="flex justify-between items-center p-3 bg-neutral/50 rounded-lg">
                            <span className="text-slate-200">{income.name} - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(income.defaultValue)} (Day {income.incomeDay})</span>
                            <div className="flex gap-2">
                               <Button variant="ghost" className="p-2 h-auto" onClick={() => handleEditIncome(income)}><EditIcon /></Button>
                               <Button variant="danger" className="p-2 h-auto" onClick={() => handleRemoveIncome(income.id)}><TrashIcon /></Button>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Manage Categories">
                    <form onSubmit={handleAddCategory} className="flex gap-2 mb-4 items-end">
                        <Input label="New Category" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g., Groceries" />
                        <Button type="submit" className="h-10 w-12 flex-shrink-0"><PlusIcon /></Button>
                    </form>
                     <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {categories.map(c => {
                            const isEditing = editingCategory === c;
                            const isUsed = allTransactions.some(t => t.category === c);
                            const isProtected = c === 'Renda';
                            return (
                                <div key={c} className="flex justify-between items-center p-2 bg-neutral/50 rounded-lg">
                                    {isEditing ? (
                                        <Input label="" value={editingCategoryValue} onChange={e => setEditingCategoryValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveCategory()} autoFocus />
                                    ) : (
                                        <span className="text-slate-200 px-2">{c}</span>
                                    )}
                                    <div className="flex gap-2 items-center">
                                        {isEditing ? (
                                            <>
                                                <Button variant="ghost" className="p-2 h-auto" onClick={handleSaveCategory}><CheckCircleIcon className="w-5 h-5"/></Button>
                                                <Button variant="secondary" className="p-2 h-auto" onClick={cancelEditCategory}><XCircleIcon className="w-5 h-5"/></Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button variant="ghost" className="p-2 h-auto" onClick={() => handleEditCategory(c)} disabled={isProtected}><EditIcon /></Button>
                                                <Button variant="danger" className="p-2 h-auto" onClick={() => onDeleteCategory(c)} disabled={isUsed || isProtected} title={isUsed ? 'Cannot delete: in use' : ''}><TrashIcon /></Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>

                <Card title="Manage Sources">
                     <form onSubmit={handleAddSource} className="flex gap-2 mb-4 items-end">
                        <Input label="New Source" value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="e.g., Savings Account" />
                        <Button type="submit" className="h-10 w-12 flex-shrink-0"><PlusIcon /></Button>
                    </form>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {sources.map(s => {
                             const isEditing = editingSource === s;
                             const isUsed = allTransactions.some(t => t.source === s);
                             return (
                                <div key={s} className="flex justify-between items-center p-2 bg-neutral/50 rounded-lg">
                                    {isEditing ? (
                                        <Input label="" value={editingSourceValue} onChange={e => setEditingSourceValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveSource()} autoFocus />
                                    ) : (
                                        <span className="text-slate-200 px-2">{s}</span>
                                    )}
                                    <div className="flex gap-2 items-center">
                                        {isEditing ? (
                                            <>
                                                <Button variant="ghost" className="p-2 h-auto" onClick={handleSaveSource}><CheckCircleIcon className="w-5 h-5"/></Button>
                                                <Button variant="secondary" className="p-2 h-auto" onClick={cancelEditSource}><XCircleIcon className="w-5 h-5"/></Button>
                                            </>
                                        ) : (
                                            <>
                                                <Button variant="ghost" className="p-2 h-auto" onClick={() => handleEditSource(s)}><EditIcon /></Button>
                                                <Button variant="danger" className="p-2 h-auto" onClick={() => onDeleteSource(s)} disabled={isUsed} title={isUsed ? 'Cannot delete: in use' : ''}><TrashIcon /></Button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SettingsPage;
