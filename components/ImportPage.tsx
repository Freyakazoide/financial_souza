
import React, { useState, useCallback } from 'react';
import { UncategorizedTransaction, Transaction, ParsedTransaction } from '../types';
import { Card, Button, Select } from './common';
import { CheckCircleIcon, XCircleIcon } from './icons';

interface ImportPageProps {
  onImport: (transactions: ParsedTransaction[]) => void;
  uncategorizedTransactions: UncategorizedTransaction[];
  onConfirm: (transactions: Omit<Transaction, 'id'|'type'>[]) => void;
  categories: string[];
  sources: string[];
}

const parsePastedText = (content: string): ParsedTransaction[] => {
    const lines = content.split('\n').slice(1); // Skip header
    return lines.map((line) => {
        const [dateStr, amountStr, importId, description] = line.split('\t');
        if (dateStr && amountStr && importId && description) {
            const [day, month, year] = dateStr.split('/');
            if (!day || !month || !year) return null;
            
            const date = new Date(`${year}-${month}-${day}T12:00:00Z`).toISOString().split('T')[0];
            
            let sanitizedAmountStr = amountStr.trim();
            // For Brazilian format "1.234,56", convert to "1234.56"
            if (sanitizedAmountStr.includes(',') && sanitizedAmountStr.includes('.')) {
                sanitizedAmountStr = sanitizedAmountStr.replace(/\./g, '').replace(',', '.');
            } else if (sanitizedAmountStr.includes(',')) {
                // For format "1234,56", convert to "1234.56"
                sanitizedAmountStr = sanitizedAmountStr.replace(',', '.');
            }
            // For format "-117.99", no change is needed. parseFloat handles it.
            const amount = parseFloat(sanitizedAmountStr);

            if (isNaN(amount)) return null;

            return {
                date,
                description: description.trim(),
                amount: Math.abs(amount),
                entryType: amount < 0 ? 'expense' : 'income',
                importId: importId.trim(),
            };
        }
        return null;
    }).filter((t): t is ParsedTransaction => t !== null);
};


const ImportPage: React.FC<ImportPageProps> = ({ onImport, uncategorizedTransactions, onConfirm, categories, sources }) => {
    const [pastedContent, setPastedContent] = useState('');
    const [categorized, setCategorized] = useState<Record<string, Partial<{ category: string; source: string; ignored: boolean; description: string }>>>({});

    const handleProcessPastedData = () => {
        const parsed = parsePastedText(pastedContent);
        onImport(parsed);
    };
    
    const updateTransaction = useCallback((id: string, updates: Partial<{ category: string; source: string; ignored: boolean; description: string }>) => {
        setCategorized(prev => ({
            ...prev,
            [id]: { ...prev[id], ...updates }
        }));
    }, []);

    const handleConfirm = () => {
        const newTransactions: Omit<Transaction, 'id' | 'type'>[] = uncategorizedTransactions
            .filter(t => !categorized[t.id]?.ignored && (categorized[t.id]?.category || t.suggestedCategory))
            .map(t => ({
                description: categorized[t.id]?.description ?? t.description,
                amount: t.amount,
                date: t.date,
                category: categorized[t.id]?.category || t.suggestedCategory as string,
                source: categorized[t.id]?.source || sources[0],
                entryType: 'expense', // Assuming all reconciled are expenses
                importId: t.importId,
            }));
        onConfirm(newTransactions);
        setCategorized({});
        setPastedContent('');
    };

    const allCategorized = uncategorizedTransactions.length > 0 && uncategorizedTransactions.every(t => categorized[t.id] ? (categorized[t.id].category || categorized[t.id].ignored) : (t.suggestedCategory));


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">Importar e Conciliar</h1>
            
            <Card title="Cole o Extrato Bancário">
                 <div className="flex flex-col gap-4">
                    <p className="text-slate-400">Copie os dados do seu extrato bancário (incluindo o cabeçalho) e cole abaixo.</p>
                    <textarea 
                      className="w-full h-48 p-3 bg-neutral/50 border border-neutral rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm text-slate-200 placeholder-slate-400 font-mono"
                      placeholder="Data	Valor	Identificador	Descrição..."
                      value={pastedContent}
                      onChange={e => setPastedContent(e.target.value)}
                    />
                    <div className="text-right">
                        <Button onClick={handleProcessPastedData} disabled={!pastedContent}>
                            Processar Dados
                        </Button>
                    </div>
                </div>
            </Card>

            {uncategorizedTransactions.length > 0 && (
                <Card title="Conciliação">
                    <p className="text-sm text-slate-400 mb-4">O sistema tratou automaticamente as contas fixas e transferências internas. Por favor, categorize as transações restantes. Sugestões baseadas no seu histórico foram pré-preenchidas.</p>
                    <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                        {uncategorizedTransactions.map(t => {
                            const state = categorized[t.id] || {};
                            const currentDescription = state.description ?? t.description;
                            return (
                                <div key={t.id} className={`p-4 rounded-lg grid grid-cols-1 md:grid-cols-5 gap-4 items-center transition-all ${state.ignored ? 'bg-neutral/20 opacity-60' : 'bg-neutral/50'}`}>
                                    <div className="md:col-span-2">
                                        <input
                                            type="text"
                                            value={currentDescription}
                                            onChange={e => updateTransaction(t.id, { description: e.target.value })}
                                            className="w-full bg-transparent p-1 -ml-1 border border-transparent rounded focus:border-primary focus:outline-none focus:bg-slate-800 text-slate-200 font-semibold"
                                            disabled={state.ignored}
                                        />
                                        <p className="text-sm text-slate-400 pl-1">{new Date(t.date + 'T12:00:00Z').toLocaleDateString('pt-BR')}</p>
                                    </div>
                                    <div className="font-bold text-lg text-danger">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(t.amount)}</div>
                                    <div className="md:col-span-2 flex gap-4 items-end">
                                        <Select 
                                            label="Categoria"
                                            value={state.category || t.suggestedCategory || ''}
                                            onChange={e => updateTransaction(t.id, { category: e.target.value, ignored: false })}
                                            disabled={state.ignored}
                                        >
                                            <option value="">Selecione uma Categoria</option>
                                            {categories.filter(c => c !== 'Renda').map(c => <option key={c} value={c}>{c}</option>)}
                                        </Select>
                                        <div className="flex items-end pb-2">
                                            <button 
                                                onClick={() => updateTransaction(t.id, { ignored: !state.ignored })}
                                                className="p-1 rounded-full hover:bg-slate-600 transition-colors"
                                                title={state.ignored ? "Incluir" : "Ignorar"}
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
                            Confirmar Transações
                        </Button>
                    </div>
                </Card>
            )}
        </div>
    );
};

export default ImportPage;