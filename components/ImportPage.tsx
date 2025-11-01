
import React, { useState, useCallback } from 'react';
import { UncategorizedTransaction, Transaction, TransactionType } from '../types';
import { Card, Button, Select } from './common';
import { CheckCircleIcon, XCircleIcon } from './icons';

interface ImportPageProps {
  onImport: (transactions: UncategorizedTransaction[]) => void;
  uncategorizedTransactions: UncategorizedTransaction[];
  onConfirm: (transactions: Transaction[]) => void;
  categories: string[];
  sources: string[];
}

// Mock parser for CSV files (Date,Description,Amount)
const parseCSV = (content: string): UncategorizedTransaction[] => {
    const lines = content.split('\n').slice(1); // Skip header
    return lines.map((line, index) => {
        const [date, description, amountStr] = line.split(',');
        if (date && description && amountStr) {
            return {
                id: `${new Date().getTime()}-${index}`,
                date: new Date(date).toISOString().split('T')[0],
                description: description.trim(),
                amount: parseFloat(amountStr),
            };
        }
        return null;
    }).filter((t): t is UncategorizedTransaction => t !== null);
};

const ImportPage: React.FC<ImportPageProps> = ({ onImport, uncategorizedTransactions, onConfirm, categories, sources }) => {
    const [fileContent, setFileContent] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>('');
    // FIX: Change state type to allow partial updates for transaction properties, fixing type errors on access.
    const [categorized, setCategorized] = useState<Record<string, Partial<{ category: string; source: string; ignored: boolean }>>>({});

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                setFileContent(text);
                const parsed = parseCSV(text);
                onImport(parsed);
            };
            reader.readAsText(file);
        }
    };
    
    const updateTransaction = useCallback((id: string, updates: Partial<{ category: string; source: string; ignored: boolean }>) => {
        setCategorized(prev => ({
            ...prev,
            [id]: { ...prev[id], ...updates }
        }));
    }, []);

    const handleConfirm = () => {
        const newTransactions: Transaction[] = uncategorizedTransactions
            .filter(t => !categorized[t.id]?.ignored)
            .map(t => ({
                ...t,
                category: categorized[t.id]?.category || 'Outros',
                source: categorized[t.id]?.source || sources[0],
                type: TransactionType.Variable,
            }));
        onConfirm(newTransactions);
        setCategorized({});
    };

    const allCategorized = uncategorizedTransactions.every(t => categorized[t.id] && (categorized[t.id].category || categorized[t.id].ignored));

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">Import & Reconcile</h1>
            
            <Card title="Upload Bank Statement">
                 <div className="flex flex-col items-center p-6 border-2 border-dashed border-neutral rounded-lg">
                    <p className="mb-2 text-slate-400">Upload a CSV file with columns: Date, Description, Amount</p>
                    <input type="file" id="file-upload" className="hidden" accept=".csv" onChange={handleFileChange} />
                    <label htmlFor="file-upload" className="cursor-pointer bg-primary text-slate-900 px-4 py-2 rounded-lg font-semibold hover:bg-secondary transition-transform transform hover:-translate-y-0.5">
                        Choose File
                    </label>
                    {fileName && <p className="mt-2 text-sm text-slate-500">{fileName}</p>}
                </div>
            </Card>

            {uncategorizedTransactions.length > 0 && (
                <Card title="Reconciliation">
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {uncategorizedTransactions.map(t => {
                            const state = categorized[t.id] || {};
                            return (
                                <div key={t.id} className={`p-4 rounded-lg grid grid-cols-1 md:grid-cols-5 gap-4 items-center transition-all ${state.ignored ? 'bg-neutral/20 opacity-60' : 'bg-neutral/50'}`}>
                                    <div className="md:col-span-2">
                                        <p className="font-semibold text-slate-200">{t.description}</p>
                                        <p className="text-sm text-slate-400">{t.date}</p>
                                    </div>
                                    <div className="font-bold text-lg text-danger">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}</div>
                                    <div className="md:col-span-2 flex gap-4 items-end">
                                        <Select 
                                            label="Category"
                                            value={state.category || t.suggestedCategory || ''}
                                            onChange={e => updateTransaction(t.id, { category: e.target.value, ignored: false })}
                                            disabled={state.ignored}
                                        >
                                            <option value="">Select Category</option>
                                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                        </Select>
                                        <div className="flex items-end pb-2">
                                            <button 
                                                onClick={() => updateTransaction(t.id, { ignored: !state.ignored })}
                                                className="p-1 rounded-full hover:bg-slate-600 transition-colors"
                                                title={state.ignored ? "Include" : "Ignore"}
                                            >
                                                {state.ignored ? <CheckCircleIcon className="h-6 w-6 text-success" /> : <XCircleIcon className="h-6 w-6 text-slate-500 hover:text-danger transition-colors" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                     <div className="mt-6 text-right">
                        <Button onClick={handleConfirm} disabled={!allCategorized}>
                            Confirm Transactions
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default ImportPage;