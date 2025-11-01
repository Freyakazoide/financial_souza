
import React, { useMemo, useState, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Transaction, MonthlyBill, MonthlyIncome, TransactionStatus, IncomeStatus, FixedBill, RecurringIncome } from '../types';
import { Card, Button, Input } from './common';
import { PlusIcon, TrashIcon } from './icons';

interface CashFlowPageProps {
  allTransactions: Transaction[];
  monthlyBills: MonthlyBill[];
  monthlyIncomes: MonthlyIncome[];
}

// Define a type for our simulation events
interface ScenarioEvent {
    id: string;
    name: string;
    amount: number;
    day: number;
    type: 'income' | 'expense';
}

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const CustomTooltip = ({ active, payload, label }: { active?: boolean, payload?: any[], label?: string }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-700 p-3 border border-slate-600 rounded-lg shadow-xl text-sm">
        <p className="font-bold text-slate-200">{label}</p>
        <p className="text-primary font-semibold mt-1">
          Saldo: <span className="text-white">{formatCurrency(payload[0].value)}</span>
        </p>
      </div>
    );
  }
  return null;
};

const CashFlowPage: React.FC<CashFlowPageProps> = ({ allTransactions, monthlyBills, monthlyIncomes }) => {
    const [scenarios, setScenarios] = useState<ScenarioEvent[]>([]);
    const [scenarioName, setScenarioName] = useState('');
    const [scenarioAmount, setScenarioAmount] = useState('');
    const [scenarioDay, setScenarioDay] = useState('');
    const scenarioNameInputRef = useRef<HTMLInputElement>(null);

    const handleAddScenario = (type: 'income' | 'expense') => {
        const amount = parseFloat(scenarioAmount);
        const day = parseInt(scenarioDay, 10);
        if (scenarioName.trim() && !isNaN(amount) && amount > 0 && !isNaN(day) && day >= 1 && day <= 31) {
            setScenarios(prev => [...prev, {
                id: Math.random().toString(36).substring(2, 9),
                name: scenarioName.trim(),
                amount,
                day,
                type,
            }]);
            setScenarioName('');
            setScenarioAmount('');
            setScenarioDay('');
            scenarioNameInputRef.current?.focus();
        }
    };
    
    const handleRemoveScenario = (id: string) => {
        setScenarios(prev => prev.filter(s => s.id !== id));
    };

    const projectionData = useMemo(() => {
        // Create augmented lists of monthly bills and incomes including scenarios
        const simulatedBills: MonthlyBill[] = [...monthlyBills];
        const simulatedIncomes: MonthlyIncome[] = [...monthlyIncomes];
        const today = new Date();
        
        scenarios.forEach(scenario => {
            for (let i = 0; i < 2; i++) { // Generate for current and next month
                const targetDate = new Date(today.getFullYear(), today.getMonth() + i, 1);
                const year = targetDate.getFullYear();
                const month = targetDate.getMonth() + 1;

                if (scenario.type === 'expense') {
                    simulatedBills.push({
                        id: `sim-${scenario.id}-${i}`,
                        fixedBillId: `sim-${scenario.id}`,
                        name: `[Sim] ${scenario.name}`,
                        month,
                        year,
                        status: TransactionStatus.Pending,
                        amount: scenario.amount,
                        dueDay: scenario.day,
                    });
                } else { // income
                    simulatedIncomes.push({
                        id: `sim-${scenario.id}-${i}`,
                        recurringIncomeId: `sim-${scenario.id}`,
                        name: `[Sim] ${scenario.name}`,
                        month,
                        year,
                        status: IncomeStatus.Pending,
                        amount: scenario.amount,
                        incomeDay: scenario.day,
                    });
                }
            }
        });

        // 1. Calculate current total balance from all transactions
        const totalIncome = allTransactions
            .filter(t => t.entryType === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        const totalExpense = allTransactions
            .filter(t => t.entryType === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        const currentBalance = totalIncome - totalExpense;

        // 2. Map future events (pending bills and incomes) for the next 30 days
        const events = new Map<string, number>();
        const projectionStartDate = new Date();
        projectionStartDate.setHours(0, 0, 0, 0);
        const endDate = new Date(projectionStartDate);
        endDate.setDate(projectionStartDate.getDate() + 30);

        simulatedBills
            .filter(b => b.status === TransactionStatus.Pending)
            .forEach(b => {
                const dueDate = new Date(b.year, b.month - 1, b.dueDay);
                dueDate.setHours(0, 0, 0, 0);
                if (dueDate >= projectionStartDate && dueDate <= endDate) {
                    const dateKey = dueDate.toISOString().split('T')[0];
                    events.set(dateKey, (events.get(dateKey) || 0) - b.amount);
                }
            });
        
        simulatedIncomes
            .filter(i => i.status === IncomeStatus.Pending)
            .forEach(i => {
                const incomeDate = new Date(i.year, i.month - 1, i.incomeDay);
                incomeDate.setHours(0, 0, 0, 0);
                if (incomeDate >= projectionStartDate && incomeDate <= endDate) {
                    const dateKey = incomeDate.toISOString().split('T')[0];
                    events.set(dateKey, (events.get(dateKey) || 0) + i.amount);
                }
            });

        // 3. Generate daily data points for the chart
        const data = [];
        let runningBalance = currentBalance;
        for (let i = 0; i <= 30; i++) {
            const currentDate = new Date(projectionStartDate);
            currentDate.setDate(projectionStartDate.getDate() + i);
            const dateKey = currentDate.toISOString().split('T')[0];

            if (i === 0) { // Add today's starting point
                 data.push({
                    date: currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), 
                    fullDate: dateKey,
                    balance: runningBalance
                });
            }

            const dayNetChange = events.get(dateKey) || 0;
            if (dayNetChange !== 0) {
                runningBalance += dayNetChange;
                data.push({
                    date: currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                    fullDate: dateKey,
                    balance: runningBalance
                });
            }
        }
        
        // Ensure the last day is present for a full 30-day line
        const lastDataPointDate = data.length > 0 ? new Date(data[data.length-1].fullDate) : new Date(0);
        const endDateKey = endDate.toISOString().split('T')[0];
        if(data.length === 0 || lastDataPointDate < endDate){
             data.push({
                date: endDate.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                fullDate: endDateKey,
                balance: runningBalance
            });
        }
        
        return data.filter((item, index, self) => index === self.findIndex(t => t.fullDate === item.fullDate));
    }, [allTransactions, monthlyBills, monthlyIncomes, scenarios]);

    const lowestBalancePoint = useMemo(() => {
      if (!projectionData || projectionData.length === 0) return null;
      return projectionData.reduce((min, p) => p.balance < min.balance ? p : min, projectionData[0]);
    }, [projectionData]);


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-slate-100">Projeção de Fluxo de Caixa</h1>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    {lowestBalancePoint && (
                        <Card title="Resumo da Projeção" className="border-l-4 border-info">
                            <div className="flex flex-col sm:flex-row justify-around text-center gap-4">
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-300">Saldo Atual</h3>
                                    <p className="text-2xl font-bold text-white">{formatCurrency(projectionData[0]?.balance || 0)}</p>
                                </div>
                                <div>
                                    <h3 className="text-lg font-semibold text-slate-300">Menor Saldo Projetado</h3>
                                    <p className={`text-2xl font-bold ${lowestBalancePoint.balance < 0 ? 'text-danger' : 'text-warning'}`}>{formatCurrency(lowestBalancePoint.balance)}</p>
                                    <p className="text-sm text-slate-400">em {new Date(lowestBalancePoint.fullDate + 'T12:00:00Z').toLocaleDateString('pt-BR', {day: 'numeric', month: 'long'})}</p>
                                </div>
                            </div>
                        </Card>
                    )}
                    <Card>
                        <h2 className="text-xl font-bold text-slate-100 mb-4">Previsão de Saldo para 30 Dias</h2>
                        <ResponsiveContainer width="100%" height={400}>
                            <AreaChart
                                data={projectionData}
                                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                            >
                                <defs>
                                    <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.8}/>
                                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                <XAxis dataKey="date" tick={{ fill: '#94a3b8' }} />
                                <YAxis tickFormatter={(value) => formatCurrency(Number(value))} tick={{ fill: '#94a3b8' }} width={100} />
                                <Tooltip content={<CustomTooltip />} />
                                <ReferenceLine y={0} stroke="#f87171" strokeDasharray="4 4" strokeWidth={2} />
                                <Area type="monotone" dataKey="balance" stroke="#2dd4bf" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </div>
                <div className="lg:col-span-1">
                    <Card title="Simulador de Cenários" className="border-l-4 border-accent h-full">
                        <div className="flex flex-col h-full">
                            <div className="space-y-4">
                                <Input ref={scenarioNameInputRef} label="Descrição" placeholder="ex: Projeto Freelance" value={scenarioName} onChange={e => setScenarioName(e.target.value)} />
                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Valor" type="number" placeholder="500.00" value={scenarioAmount} onChange={e => setScenarioAmount(e.target.value)} />
                                    <Input label="Dia" type="number" min="1" max="31" placeholder="15" value={scenarioDay} onChange={e => setScenarioDay(e.target.value)} />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <Button onClick={() => handleAddScenario('income')} variant="secondary" className="bg-success/20 text-success hover:bg-success/40">Adicionar Receita</Button>
                                    <Button onClick={() => handleAddScenario('expense')} variant="secondary" className="bg-danger/20 text-danger hover:bg-danger/40">Adicionar Despesa</Button>
                                </div>
                            </div>
                            
                            <hr className="border-neutral my-6"/>

                            <div className="flex-grow min-h-[100px]">
                                <h3 className="text-lg font-semibold text-slate-200 mb-2">Cenários Ativos</h3>
                                {scenarios.length > 0 ? (
                                    <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
                                        {scenarios.map(s => (
                                            <div key={s.id} className="flex justify-between items-center p-2 bg-neutral/50 rounded-lg">
                                                <div>
                                                    <p className={`font-semibold ${s.type === 'income' ? 'text-success' : 'text-danger'}`}>{s.name}</p>
                                                    <p className="text-xs text-slate-400">Dia {s.day} - {formatCurrency(s.amount)}</p>
                                                </div>
                                                <Button onClick={() => handleRemoveScenario(s.id)} variant="danger" className="p-1 h-auto text-xs"><TrashIcon className="w-4 h-4" /></Button>
                                            </div>
                                        ))}
                                        <div className="text-center pt-2">
                                            <Button onClick={() => setScenarios([])} variant="ghost" size="sm" className="text-xs">Limpar Tudo</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center text-slate-400 text-sm py-4">
                                        <p>Adicione uma receita ou despesa hipotética para ver o impacto na sua projeção.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default CashFlowPage;
