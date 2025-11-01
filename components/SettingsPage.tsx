import React, { useState, useEffect } from 'react';
import { FixedBill } from '../types';
import { Card, Button, Input } from './common';
import { PlusIcon, TrashIcon, EditIcon } from './icons';

interface SettingsPageProps {
  fixedBills: FixedBill[];
  setFixedBills: React.Dispatch<React.SetStateAction<FixedBill[]>>;
  categories: string[];
  setCategories: React.Dispatch<React.SetStateAction<string[]>>;
  sources: string[];
  setSources: React.Dispatch<React.SetStateAction<string[]>>;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ fixedBills, setFixedBills, categories, setCategories, sources, setSources }) => {
    const [newBill, setNewBill] = useState({ name: '', defaultValue: '', dueDay: '' });
    const [editingBill, setEditingBill] = useState<FixedBill | null>(null);
    const [newCategory, setNewCategory] = useState('');
    const [newSource, setNewSource] = useState('');

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

    const generateId = () => Math.random().toString(36).substring(2, 9);
    
    const handleBillSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (newBill.name && newBill.defaultValue && newBill.dueDay) {
            if (editingBill) {
                // Update existing bill
                setFixedBills(fixedBills.map(b => b.id === editingBill.id ? {
                    ...b,
                    name: newBill.name,
                    defaultValue: parseFloat(newBill.defaultValue),
                    dueDay: parseInt(newBill.dueDay, 10),
                } : b));
                setEditingBill(null);
            } else {
                // Add new bill
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
    
    const handleRemoveBill = (id: string) => {
        setFixedBills(fixedBills.filter(b => b.id !== id));
        if (editingBill && editingBill.id === id) {
            setEditingBill(null);
        }
    };

    const handleEditBill = (bill: FixedBill) => {
        setEditingBill(bill);
    }

    const cancelEdit = () => {
        setEditingBill(null);
    }

    const handleAddCategory = (e: React.FormEvent) => {
        e.preventDefault();
        if(newCategory && !categories.includes(newCategory)) {
            setCategories([...categories, newCategory]);
            setNewCategory('');
        }
    };

    const handleRemoveCategory = (cat: string) => {
        setCategories(categories.filter(c => c !== cat));
    };

    const handleAddSource = (e: React.FormEvent) => {
        e.preventDefault();
        if(newSource && !sources.includes(newSource)) {
            setSources([...sources, newSource]);
            setNewSource('');
        }
    };

    const handleRemoveSource = (src: string) => {
        setSources(sources.filter(s => s !== src));
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
                        {editingBill && <Button type="button" variant="secondary" onClick={cancelEdit} className="h-10">Cancel</Button>}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card title="Manage Categories">
                    <form onSubmit={handleAddCategory} className="flex gap-2 mb-4 items-end">
                        <Input label="New Category" value={newCategory} onChange={e => setNewCategory(e.target.value)} placeholder="e.g., Groceries" />
                        <Button type="submit" className="h-10 w-12 flex-shrink-0"><PlusIcon /></Button>
                    </form>
                     <div className="flex flex-wrap gap-2">
                        {categories.map(c => 
                            <span key={c} className="bg-primary/20 text-primary text-sm font-medium px-3 py-1 rounded-full flex items-center gap-2">
                                {c} 
                                <button onClick={() => handleRemoveCategory(c)} className="text-accent hover:text-white font-bold">&times;</button>
                            </span>
                        )}
                    </div>
                </Card>

                <Card title="Manage Sources">
                     <form onSubmit={handleAddSource} className="flex gap-2 mb-4 items-end">
                        <Input label="New Source" value={newSource} onChange={e => setNewSource(e.target.value)} placeholder="e.g., Savings Account" />
                        <Button type="submit" className="h-10 w-12 flex-shrink-0"><PlusIcon /></Button>
                    </form>
                    <div className="flex flex-wrap gap-2">
                        {sources.map(s => 
                            <span key={s} className="bg-info/20 text-info text-sm font-medium px-3 py-1 rounded-full flex items-center gap-2">
                                {s} 
                                <button onClick={() => handleRemoveSource(s)} className="text-sky-300 hover:text-white font-bold">&times;</button>
                            </span>
                        )}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default SettingsPage;