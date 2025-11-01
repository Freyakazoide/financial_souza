
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FixedBill, MonthlyBill, Transaction, TransactionStatus, TransactionType, UncategorizedTransaction, SpendingPattern, ParsedTransaction, RecurringIncome, MonthlyIncome, IncomeStatus } from './types';
import { DashboardIcon, HistoryIcon, ImportIcon, SettingsIcon } from './components/icons';
import Dashboard from './components/Dashboard';
import HistoryPage from './components/HistoryPage';
import ImportPage from './components/ImportPage';
import SettingsPage from './components/SettingsPage';
import { analyzeSpendingPatterns, suggestCategoriesForTransactions } from './services/geminiService';

const initialFixedBills: FixedBill[] = [
    { id: 'fb1', name: 'Telefone [TIM] [DANI]', defaultValue: 74.00, dueDay: 10 },
    { id: 'fb2', name: 'Cartão de Crédito - Nubank', defaultValue: 1400.00, dueDay: 15 },
    { id: 'fb3', name: 'Internet', defaultValue: 99.90, dueDay: 20 },
    { id: 'fb4', name: 'CELESC - Apto 507', defaultValue: 161.40, dueDay: 25 },
    { id: 'fb5', name: 'UNINTER - Marketing Digital', defaultValue: 204.92, dueDay: 5 },
    { id: 'fb6', name: 'Telefone [TIM] [ISA]', defaultValue: 62.99, dueDay: 10 },
    { id: 'fb7', name: 'Parcela Ford KA 52/60', defaultValue: 866.90, dueDay: 28 }, // Matches BANCO VOTORANTIM S/A
    { id: 'fb8', name: 'DAS - PJ', defaultValue: 80.90, dueDay: 20 },
];

const initialRecurringIncomes: RecurringIncome[] = [
    { id: 'ri1', name: 'Salário', defaultValue: 5000.00, incomeDay: 5 },
];

const initialCategories: string[] = ['Moradia', 'Transporte', 'Alimentação', 'Lazer', 'Dívidas', 'Saúde', 'Educação', 'PJ', 'Renda', 'Outros'];
const initialSources: string[] = ['Cartão Nubank', 'Conta Corrente BB', 'Dinheiro', 'Conta PJ'];

const App: React.FC = () => {
    const [view, setView] = useState<View>('dashboard');
    const [viewingDate, setViewingDate] = useState(new Date());
    const [fixedBills, setFixedBills] = useState<FixedBill[]>(initialFixedBills);
    const [monthlyBills, setMonthlyBills] = useState<MonthlyBill[]>([]);
    const [recurringIncomes, setRecurringIncomes] = useState<RecurringIncome[]>(initialRecurringIncomes);
    const [monthlyIncomes, setMonthlyIncomes] = useState<MonthlyIncome[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<string[]>(initialCategories);
    const [sources, setSources] = useState<string[]>(initialSources);
    const [uncategorized, setUncategorized] = useState<UncategorizedTransaction[]>([]);
    const [categoryPatterns, setCategoryPatterns] = useState<Record<string, string>>({});
    const [spendingPatterns, setSpendingPatterns] = useState<SpendingPattern[] | null>(null);
    const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);
    const [isCategorizing, setIsCategorizing] = useState(false);

    const generateId = useCallback(() => Math.random().toString(36).substring(2, 9), []);

    const generateMonthlyBills = useCallback((date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const today = new Date();
  
      const existingBillsForMonth = monthlyBills.some(b => b.year === year && b.month === month);
      if (existingBillsForMonth) return;
  
      const newBills = fixedBills.map(fb => {
          const dueDate = new Date(year, month - 1, fb.dueDay);
          let status = TransactionStatus.Pending;
          if (today > dueDate && (today.getFullYear() > year || (today.getFullYear() === year && today.getMonth() + 1 > month))) {
              status = TransactionStatus.Overdue;
          }
  
          return {
              id: generateId(),
              fixedBillId: fb.id,
              name: fb.name,
              month,
              year,
              status,
              amount: fb.defaultValue,
              paidDate: undefined,
              dueDay: fb.dueDay,
          };
      });
      setMonthlyBills(prev => [...prev.filter(b => !(b.year === year && b.month === month)), ...newBills]);
    }, [fixedBills, monthlyBills, generateId]);

    const generateMonthlyIncomes = useCallback((date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
  
      const existingIncomesForMonth = monthlyIncomes.some(i => i.year === year && i.month === month);
      if (existingIncomesForMonth) return;
  
      const newIncomes = recurringIncomes.map(ri => {
          return {
              id: generateId(),
              recurringIncomeId: ri.id,
              name: ri.name,
              month,
              year,
              status: IncomeStatus.Pending,
              amount: ri.defaultValue,
              receivedDate: undefined,
              incomeDay: ri.incomeDay,
          };
      });
      setMonthlyIncomes(prev => [...prev.filter(i => !(i.year === year && i.month === month)), ...newIncomes]);
    }, [recurringIncomes, monthlyIncomes, generateId]);
  
    useEffect(() => {
        generateMonthlyBills(viewingDate);
        generateMonthlyIncomes(viewingDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fixedBills, recurringIncomes, viewingDate]); 

    const handleUpdateMonthlyBillAmount = (billId: string, newAmount: number) => {
      setMonthlyBills(prevBills => prevBills.map(b => b.id === billId ? { ...b, amount: newAmount } : b));
    };

    const handleUpdateMonthlyIncomeAmount = (incomeId: string, newAmount: number) => {
      setMonthlyIncomes(prevIncomes => prevIncomes.map(i => i.id === incomeId ? { ...i, amount: newAmount } : i));
    };

    const handleSetBillPaid = (billId: string, paidDate: string, amount?: number, importId?: string) => {    
      setMonthlyBills(prevBills => 
        prevBills.map(b => {
          if (b.id === billId) {
            const finalAmount = amount ?? b.amount;
            const newBill = { ...b, status: TransactionStatus.Paid, paidDate: paidDate, amount: finalAmount };
            
            const transactionExists = transactions.some(t => t.description === newBill.name && new Date(t.date).getMonth() + 1 === newBill.month && new Date(t.date).getFullYear() === newBill.year);
            
            if (!transactionExists) {
              const newTransaction: Transaction = {
                id: generateId(),
                description: newBill.name,
                amount: finalAmount,
                date: paidDate,
                category: 'Dívidas', // Default category for fixed bills
                source: 'Conta Corrente BB', // Default source
                type: TransactionType.Fixed,
                entryType: 'expense',
                importId: importId,
              };
              setTransactions(prevTransactions => [...prevTransactions, newTransaction]);
            }
            return newBill;
          }
          return b;
        })
      );
    };
    
    const handleSetIncomeReceived = (incomeId: string, receivedDate: string, amount?: number) => {    
      setMonthlyIncomes(prevIncomes => 
        prevIncomes.map(i => {
          if (i.id === incomeId) {
            const finalAmount = amount ?? i.amount;
            const newIncome = { ...i, status: IncomeStatus.Received, receivedDate: receivedDate, amount: finalAmount };
            
            const transactionExists = transactions.some(t => t.description === newIncome.name && new Date(t.date).getMonth() + 1 === newIncome.month && new Date(t.date).getFullYear() === newIncome.year);
            
            if (!transactionExists) {
              const newTransaction: Transaction = {
                id: generateId(),
                description: newIncome.name,
                amount: finalAmount,
                date: receivedDate,
                category: 'Renda', // Default category for income
                source: 'Conta Corrente BB', // Default source
                type: TransactionType.Fixed,
                entryType: 'income',
                importId: undefined,
              };
              setTransactions(prevTransactions => [...prevTransactions, newTransaction]);
            }
            return newIncome;
          }
          return i;
        })
      );
    };

    const addTransaction = (transaction: Omit<Transaction, 'id' | 'type'>) => {
        setTransactions(prev => [...prev, { ...transaction, id: generateId(), type: TransactionType.Variable }]);
    };

    const processImportedTransactions = async (parsed: ParsedTransaction[]) => {
      setUncategorized([]);
      const trulyUncategorized: UncategorizedTransaction[] = [];
      const allImportIds = new Set(transactions.map(t => t.importId));
      
      const getKeywords = (name: string) => {
          return name.toUpperCase().split(/[\s-\[\]]+/).filter(w => w.length > 2 && !['DE', 'A', 'O', 'PARA'].includes(w));
      }
      
      const fixedBillKeywords: Map<string, string[]> = new Map(fixedBills.map(fb => [fb.id, getKeywords(fb.name)]));

      const customMappings: Record<string, string> = {
        'BANCO VOTORANTIM': 'fb7'
      };

      parsed.forEach(p => {
          if (allImportIds.has(p.importId)) return;
          if (p.description.toLowerCase().includes('pagamento de fatura')) return;

          let matchedBill = false;
          if (p.entryType === 'expense') {
              for (const [billId, keywords] of fixedBillKeywords.entries()) {
                  const upperDesc = p.description.toUpperCase();
                  if (keywords.some(kw => upperDesc.includes(kw))) {
                      const txDate = new Date(p.date);
                      const bill = monthlyBills.find(b => b.fixedBillId === billId && b.month === txDate.getMonth() + 1 && b.year === txDate.getFullYear());
                      if (bill && bill.status !== TransactionStatus.Paid) {
                          handleSetBillPaid(bill.id, p.date, p.amount, p.importId);
                          matchedBill = true;
                          break;
                      }
                  }
              }
              if (!matchedBill) {
                  for (const [keyword, billId] of Object.entries(customMappings)) {
                       const upperDesc = p.description.toUpperCase();
                       if(upperDesc.includes(keyword)) {
                           const txDate = new Date(p.date);
                           const bill = monthlyBills.find(b => b.fixedBillId === billId && b.month === txDate.getMonth() + 1 && b.year === txDate.getFullYear());
                           if (bill && bill.status !== TransactionStatus.Paid) {
                               handleSetBillPaid(bill.id, p.date, p.amount, p.importId);
                               matchedBill = true;
                               break;
                           }
                       }
                  }
              }
          }

          if (!matchedBill && p.entryType === 'expense') {
              trulyUncategorized.push({
                  ...p,
                  id: generateId(),
                  suggestedCategory: categoryPatterns[p.description.toUpperCase()],
              });
          }
      });
      
      if (trulyUncategorized.length > 0) {
        setIsCategorizing(true);
        try {
          const suggestions = await suggestCategoriesForTransactions(
            trulyUncategorized.map(t => ({ id: t.id, description: t.description, amount: t.amount })),
            categories
          );
          trulyUncategorized.forEach(t => {
            if (suggestions[t.id]) {
              t.suggestedCategory = suggestions[t.id];
            }
          });
        } catch (error) {
          console.error("Failed to get AI category suggestions:", error);
        } finally {
          setIsCategorizing(false);
        }
      }

      setUncategorized(trulyUncategorized);
    };

    const confirmTransactions = (confirmed: Omit<Transaction, 'id' | 'type'>[]) => {
        const newTransactions: Transaction[] = confirmed.map(t => ({...t, id: generateId(), type: TransactionType.Variable}));
        setTransactions(prev => [...prev, ...newTransactions]);
        setUncategorized([]);

        const newPatterns = { ...categoryPatterns };
        confirmed.forEach(t => {
            if (t.description && t.category) {
                newPatterns[t.description.toUpperCase()] = t.category;
            }
        });
        setCategoryPatterns(newPatterns);
        setView('dashboard');
    };

    const handleAnalyzePatterns = async () => {
        setIsLoadingPatterns(true);
        setSpendingPatterns(null);
        try {
            const patterns = await analyzeSpendingPatterns(transactions);
            setSpendingPatterns(patterns);
        } catch (error) {
            console.error("Failed to analyze spending patterns:", error);
            const errorMessage = error instanceof Error ? error.message : "An unknown error occurred. Please check the console.";
            setSpendingPatterns([{
              merchant: "Analysis Failed",
              frequency: "-",
              totalSpent: 0,
              insight: errorMessage
            }]);
        } finally {
            setIsLoadingPatterns(false);
        }
    };

    // Category and Source Management
    const handleAddCategory = (name: string) => {
        if (name.trim() && !categories.some(c => c.toLowerCase() === name.toLowerCase())) {
            setCategories(prev => [...prev, name.trim()].sort());
        }
    };

    const handleUpdateCategory = (oldName: string, newName: string) => {
        if (oldName === 'Renda' || !newName.trim() || categories.some(c => c.toLowerCase() === newName.toLowerCase() && c.toLowerCase() !== oldName.toLowerCase())) {
            return;
        }
        setCategories(prev => prev.map(c => c === oldName ? newName.trim() : c).sort());
        setTransactions(prev => prev.map(t => t.category === oldName ? { ...t, category: newName.trim() } : t));
    };

    const handleDeleteCategory = (name: string) => {
        if (name === 'Renda' || transactions.some(t => t.category === name)) {
            alert(`Category "${name}" cannot be deleted because it is in use or protected.`);
            return;
        }
        setCategories(prev => prev.filter(c => c !== name));
    };
    
    const handleAddSource = (name: string) => {
        if (name.trim() && !sources.some(s => s.toLowerCase() === name.toLowerCase())) {
            setSources(prev => [...prev, name.trim()].sort());
        }
    };

    const handleUpdateSource = (oldName: string, newName: string) => {
        if (!newName.trim() || sources.some(s => s.toLowerCase() === newName.toLowerCase() && s.toLowerCase() !== oldName.toLowerCase())) {
            return;
        }
        setSources(prev => prev.map(s => s === oldName ? newName.trim() : s).sort());
        setTransactions(prev => prev.map(t => t.source === oldName ? { ...t, source: newName.trim() } : t));
    };

    const handleDeleteSource = (name: string) => {
        if (transactions.some(t => t.source === name)) {
            alert(`Source "${name}" cannot be deleted because it is currently in use.`);
            return;
        }
        setSources(prev => prev.filter(s => s !== name));
    };

    const viewingMonth = viewingDate.getMonth() + 1;
    const viewingYear = viewingDate.getFullYear();
    const viewingMonthBills = useMemo(() => monthlyBills.filter(b => b.month === viewingMonth && b.year === viewingYear), [monthlyBills, viewingMonth, viewingYear]);
    const viewingMonthIncomes = useMemo(() => monthlyIncomes.filter(i => i.month === viewingMonth && i.year === viewingYear), [monthlyIncomes, viewingMonth, viewingYear]);
    const viewingMonthTransactions = useMemo(() => transactions.filter(t => new Date(t.date).getMonth() + 1 === viewingMonth && new Date(t.date).getFullYear() === viewingYear), [transactions, viewingMonth, viewingYear]);
    
    const handleMonthChange = (direction: 'next' | 'prev') => {
      setViewingDate(currentDate => {
        const newDate = new Date(currentDate);
        const newMonth = direction === 'next' ? newDate.getMonth() + 1 : newDate.getMonth() -1;
        newDate.setMonth(newMonth);
        generateMonthlyBills(newDate);
        generateMonthlyIncomes(newDate);
        return newDate;
      })
    }
    
    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard 
                    monthlyBills={viewingMonthBills} 
                    monthlyIncomes={viewingMonthIncomes}
                    transactions={viewingMonthTransactions} 
                    onSetBillPaid={handleSetBillPaid} 
                    onSetIncomeReceived={handleSetIncomeReceived}
                    onAddTransaction={addTransaction}
                    categories={categories}
                    sources={sources}
                    viewingDate={viewingDate}
                    onMonthChange={handleMonthChange}
                    onUpdateMonthlyBillAmount={handleUpdateMonthlyBillAmount}
                    onUpdateMonthlyIncomeAmount={handleUpdateMonthlyIncomeAmount}
                />;
            case 'history':
                return <HistoryPage 
                  allTransactions={transactions}
                  monthlyBills={monthlyBills}
                  categories={categories}
                  sources={sources}
                  spendingPatterns={spendingPatterns}
                  onAnalyzePatterns={handleAnalyzePatterns}
                  isLoadingPatterns={isLoadingPatterns}
                />;
            case 'import':
                return <ImportPage 
                    onImport={processImportedTransactions}
                    uncategorizedTransactions={uncategorized}
                    onConfirm={confirmTransactions}
                    categories={categories}
                    sources={sources}
                    isCategorizing={isCategorizing}
                />;
            case 'settings':
                return <SettingsPage 
                    fixedBills={fixedBills}
                    setFixedBills={setFixedBills}
                    recurringIncomes={recurringIncomes}
                    setRecurringIncomes={setRecurringIncomes}
                    categories={categories}
                    onAddCategory={handleAddCategory}
                    onUpdateCategory={handleUpdateCategory}
                    onDeleteCategory={handleDeleteCategory}
                    sources={sources}
                    onAddSource={handleAddSource}
                    onUpdateSource={handleUpdateSource}
                    onDeleteSource={handleDeleteSource}
                    allTransactions={transactions}
                />;
            default:
                return <Dashboard 
                    monthlyBills={viewingMonthBills} 
                    monthlyIncomes={viewingMonthIncomes}
                    transactions={viewingMonthTransactions} 
                    onSetBillPaid={handleSetBillPaid} 
                    onSetIncomeReceived={handleSetIncomeReceived}
                    onAddTransaction={addTransaction}
                    categories={categories}
                    sources={sources}
                    viewingDate={viewingDate}
                    onMonthChange={handleMonthChange}
                    onUpdateMonthlyBillAmount={handleUpdateMonthlyBillAmount}
                    onUpdateMonthlyIncomeAmount={handleUpdateMonthlyIncomeAmount}
                />;
        }
    };
    
    const NavItem = ({ targetView, icon, label }: { targetView: View; icon: React.ReactElement<{ className?: string }>; label: string; }) => (
        <button
            onClick={() => setView(targetView)}
            className={`flex flex-col sm:flex-row items-center justify-center sm:justify-start w-full sm:w-auto p-2 sm:px-4 sm:py-2 rounded-lg transition-colors duration-200 ${view === targetView ? 'bg-primary text-slate-900 font-semibold' : 'text-slate-400 hover:bg-neutral hover:text-slate-100'}`}
        >
            {React.cloneElement(icon, { className: "h-6 w-6 sm:mr-3"})}
            <span className="text-xs sm:text-sm font-medium">{label}</span>
        </button>
    );

    return (
        <div className="min-h-screen flex flex-col sm:flex-row">
            <nav className="sm:w-56 bg-base-100 p-2 sm:p-4 order-last sm:order-first fixed bottom-0 left-0 right-0 sm:relative sm:min-h-screen border-t sm:border-t-0 sm:border-r border-neutral">
                <div className="flex sm:flex-col justify-around sm:justify-start sm:space-y-2">
                    <NavItem targetView="dashboard" icon={<DashboardIcon />} label="Dashboard" />
                    <NavItem targetView="history" icon={<HistoryIcon />} label="History & Reports" />
                    <NavItem targetView="import" icon={<ImportIcon />} label="Import" />
                    <NavItem targetView="settings" icon={<SettingsIcon />} label="Settings" />
                </div>
            </nav>
            <main className="flex-1 p-4 sm:p-8 pb-20 sm:pb-8 overflow-y-auto">
                {renderView()}
            </main>
        </div>
    );
};

export default App;
