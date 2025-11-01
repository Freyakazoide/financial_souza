import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, FixedBill, MonthlyBill, Transaction, TransactionStatus, TransactionType, UncategorizedTransaction, SpendingPattern } from './types';
import { DashboardIcon, HistoryIcon, ImportIcon, SettingsIcon } from './components/icons';
import Dashboard from './components/Dashboard';
import HistoryPage from './components/HistoryPage';
import ImportPage from './components/ImportPage';
import SettingsPage from './components/SettingsPage';
import { analyzeSpendingPatterns } from './services/geminiService';

const initialFixedBills: FixedBill[] = [
    { id: 'fb1', name: 'Telefone [TIM] [DANI]', defaultValue: 74.00, dueDay: 10 },
    { id: 'fb2', name: 'Cartão de Crédito - Nubank', defaultValue: 1400.00, dueDay: 15 },
    { id: 'fb3', name: 'Internet', defaultValue: 99.90, dueDay: 20 },
    { id: 'fb4', name: 'CELESC - Apto 507', defaultValue: 161.40, dueDay: 25 },
    { id: 'fb5', name: 'UNINTER - Marketing Digital', defaultValue: 204.92, dueDay: 5 },
    { id: 'fb6', name: 'Telefone [TIM] [ISA]', defaultValue: 62.99, dueDay: 10 },
    { id: 'fb7', name: 'Parcela Ford KA 52/60', defaultValue: 866.90, dueDay: 28 },
    { id: 'fb8', name: 'DAS - PJ', defaultValue: 80.90, dueDay: 20 },
];

const initialCategories: string[] = ['Moradia', 'Transporte', 'Alimentação', 'Lazer', 'Dívidas', 'Saúde', 'Educação', 'PJ', 'Outros'];
const initialSources: string[] = ['Cartão Nubank', 'Conta Corrente BB', 'Dinheiro', 'Conta PJ'];

const App: React.FC = () => {
    const [view, setView] = useState<View>('dashboard');
    const [viewingDate, setViewingDate] = useState(new Date());
    const [fixedBills, setFixedBills] = useState<FixedBill[]>(initialFixedBills);
    const [monthlyBills, setMonthlyBills] = useState<MonthlyBill[]>([]);
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [categories, setCategories] = useState<string[]>(initialCategories);
    const [sources, setSources] = useState<string[]>(initialSources);
    const [uncategorized, setUncategorized] = useState<UncategorizedTransaction[]>([]);
    const [categoryPatterns, setCategoryPatterns] = useState<Record<string, string>>({});
    const [spendingPatterns, setSpendingPatterns] = useState<SpendingPattern[] | null>(null);
    const [isLoadingPatterns, setIsLoadingPatterns] = useState(false);

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
  
    useEffect(() => {
        generateMonthlyBills(viewingDate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fixedBills, viewingDate]); 

    const handleUpdateMonthlyBillAmount = (billId: string, newAmount: number) => {
      setMonthlyBills(prevBills => prevBills.map(b => b.id === billId ? { ...b, amount: newAmount } : b));
    };

    const handleSetBillPaid = (billId: string, paidDate: string) => {    
      setMonthlyBills(prevBills => 
        prevBills.map(b => {
          if (b.id === billId) {
            const newBill = { ...b, status: TransactionStatus.Paid, paidDate: paidDate };
            
            const transactionExists = transactions.some(t => t.description === newBill.name && new Date(t.date).getMonth() + 1 === newBill.month && new Date(t.date).getFullYear() === newBill.year);
            
            if (!transactionExists) {
              const newTransaction: Transaction = {
                id: generateId(),
                description: newBill.name,
                amount: newBill.amount,
                date: paidDate,
                category: 'Dívidas', // Default category for fixed bills
                source: 'Conta Corrente BB', // Default source
                type: TransactionType.Fixed,
              };
              setTransactions(prevTransactions => [...prevTransactions, newTransaction]);
            }
            return newBill;
          }
          return b;
        })
      );
    };

    const addTransaction = (transaction: Omit<Transaction, 'id' | 'type'>) => {
        setTransactions([...transactions, { ...transaction, id: generateId(), type: TransactionType.Variable }]);
    };

    const confirmTransactions = (confirmed: Transaction[]) => {
        setTransactions(prev => [...prev, ...confirmed]);
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
        const patterns = await analyzeSpendingPatterns(transactions);
        setSpendingPatterns(patterns);
        setIsLoadingPatterns(false);
    };

    const viewingMonth = viewingDate.getMonth() + 1;
    const viewingYear = viewingDate.getFullYear();
    const viewingMonthBills = useMemo(() => monthlyBills.filter(b => b.month === viewingMonth && b.year === viewingYear), [monthlyBills, viewingMonth, viewingYear]);
    const viewingMonthTransactions = useMemo(() => transactions.filter(t => new Date(t.date).getMonth() + 1 === viewingMonth && new Date(t.date).getFullYear() === viewingYear), [transactions, viewingMonth, viewingYear]);
    
    const handleMonthChange = (direction: 'next' | 'prev') => {
      setViewingDate(currentDate => {
        const newDate = new Date(currentDate);
        const newMonth = direction === 'next' ? newDate.getMonth() + 1 : newDate.getMonth() -1;
        newDate.setMonth(newMonth);
        return newDate;
      })
    }
    
    const renderView = () => {
        switch (view) {
            case 'dashboard':
                return <Dashboard 
                    monthlyBills={viewingMonthBills} 
                    transactions={viewingMonthTransactions} 
                    onSetBillPaid={handleSetBillPaid} 
                    onAddTransaction={addTransaction}
                    categories={categories}
                    sources={sources}
                    viewingDate={viewingDate}
                    onMonthChange={handleMonthChange}
                    onUpdateMonthlyBillAmount={handleUpdateMonthlyBillAmount}
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
                    onImport={(parsed) => {
                        const newUncategorized = parsed.filter(p => !transactions.some(t => t.description === p.description && t.date === p.date && t.amount === p.amount))
                            .map(p => ({ ...p, suggestedCategory: categoryPatterns[p.description.toUpperCase()] }));
                        setUncategorized(newUncategorized);
                    }}
                    uncategorizedTransactions={uncategorized}
                    onConfirm={confirmTransactions}
                    categories={categories}
                    sources={sources}
                />;
            case 'settings':
                return <SettingsPage 
                    fixedBills={fixedBills}
                    setFixedBills={setFixedBills}
                    categories={categories}
                    setCategories={setCategories}
                    sources={sources}
                    setSources={setSources}
                />;
            default:
                return <Dashboard 
                    monthlyBills={viewingMonthBills} 
                    transactions={viewingMonthTransactions} 
                    onSetBillPaid={handleSetBillPaid} 
                    onAddTransaction={addTransaction}
                    categories={categories}
                    sources={sources}
                    viewingDate={viewingDate}
                    onMonthChange={handleMonthChange}
                    onUpdateMonthlyBillAmount={handleUpdateMonthlyBillAmount}
                />;
        }
    };
    
    // FIX: Specify that the icon prop accepts a className to fix typing error with React.cloneElement.
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