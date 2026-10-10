import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import FabMenu from "../../Components/FAB/FabMenu"
import NewIncExpModal from "../../Components/NewIncExpModal/NewIncExpModal"
import { getUserById} from "../../Server/Server"
import { collection, onSnapshot, query, where } from "firebase/firestore"
import { db } from "../../services/firebase/firebaseConfig"
import "./CashBook.css"
import DeleteItemModal from "../../Components/DeleteItemModal/DeleteItemModal"

const formatYearMonth = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
};

export default function CashBook({user}){
    const [client,setClient] = useState(undefined)
    const [cashTransactions,setCashTransactions] = useState(null)
    const [selectedMonth, setSelectedMonth] = useState(() => formatYearMonth(new Date()));
    const [modalOpen,setModalOpen] = useState(false)
    const [deleteModalOpen,setDeleteModalOpen] = useState(false)
    const [itemToBeDeleted,setItemToBeDeleted] = useState(null)
    const [modalType,setModalType] = useState("income")

    const monthOptions = Array.from({ length: 6 }).map((_, i) => {
        const d = new Date();
        d.setMonth(d.getMonth() - i); // Go back i months
        return formatYearMonth(d);
    });

    const { groupedAndSortedTransactions, monthTotals } = useMemo(() => {
        const groups = {};

        // 1. Initialize variables to track the entire month's totals
        let monthIncomeTotal = 0;
        let monthExpenseTotal = 0;

        // 2. Group, accumulate day totals, AND accumulate month totals in a single pass
        for (const trans of (cashTransactions || [])) {
            const { date, type, amount } = trans;
            const numAmount = Number(amount) || 0;

            // Accumulate into month totals
            if (type === "income") {
                monthIncomeTotal += numAmount;
            } else if (type === "expenditure") {
                monthExpenseTotal += numAmount;
            }

            // Grouping logic by date
            if (!groups[date]) {
                groups[date] = { 
                    date, 
                    incomes: [], 
                    expenses: [],
                    dayIncomeTotal: 0,
                    dayExpenseTotal: 0,
                    dayNetBalance: 0 
                };
            }

            if (type === "income") {
                groups[date].incomes.push(trans);
                groups[date].dayIncomeTotal += numAmount;
            } else if (type === "expenditure") {
                groups[date].expenses.push(trans);
                groups[date].dayExpenseTotal += numAmount;
            }
        }

        // 3. Map, clean decimals, and calculate dayNetBalance
        const groupedAndSorted = Object.values(groups)
            .map(day => {
                const net = day.dayIncomeTotal - day.dayExpenseTotal;
                
                return {
                    ...day,
                    // Fix JavaScript floating-point issues by rounding to 2 decimals
                    dayIncomeTotal: Number(day.dayIncomeTotal.toFixed(2)),
                    dayExpenseTotal: Number(day.dayExpenseTotal.toFixed(2)),
                    dayNetBalance: Number(net.toFixed(2)) 
                };
            })
            // Sort by date newest to oldest
            .sort((a, b) => new Date(b.date) - new Date(a.date));

        // 4. Create the final clean month totals object
        const finalMonthTotals = {
            incomeTotal: Number(monthIncomeTotal.toFixed(2)),
            expenseTotal: Number(monthExpenseTotal.toFixed(2)),
            netBalance: Number((monthIncomeTotal - monthExpenseTotal).toFixed(2))
        };

        return { 
            groupedAndSortedTransactions: groupedAndSorted, 
            monthTotals: finalMonthTotals 
        };

    }, [cashTransactions]); // Recalculates only when transaction data changes

    
    useEffect(() => {
        if (!user?.uid) return;
        
        const fetchClient = async () => {
            try {
                const userFromDb = await getUserById(user.uid);
                setClient(userFromDb);
            } catch (error) {
                console.error("Error fetching user:", error);
            }
        };
        fetchClient();
    }, [user?.uid]);


    useEffect(() => {
        if (!user?.uid) return;

        // Reset your transactions state when changing months so old months don't flash
        setCashTransactions([]);

        // Query filtering by both clientId AND the selected yearMonth string
        // Note: Ensure your Firestore documents have a "yearMonth" field matching "YYYY-MM"
        const q = query(
            collection(db, "transaction"), 
            where("clientId", "==", user.uid),
            where("month", "==", selectedMonth) 
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            snapshot.docChanges().forEach((change) => {
                const changedDoc = { id: change.doc.id, ...change.doc.data() };

                if (change.type === "added") {
                    setCashTransactions((prev) => [...(prev || []), changedDoc]);
                }
                if (change.type === "modified") {
                    setCashTransactions((prev) => 
                        prev?.map((tx) => tx.id === changedDoc.id ? changedDoc : tx)
                    );
                }
                if (change.type === "removed") {
                    setCashTransactions((prev) => 
                        prev?.filter((tx) => tx.id !== changedDoc.id)
                    );
                }
            });
        }, (error) => {
            console.error("Listener error:", error);
        });

        return () => unsubscribe();

    }, [user?.uid, selectedMonth]);

    const fabItems = [
        {
            label:"income",
            onClick:() => {
                setModalType("income")
                setModalOpen(true)
            },
            icon:"inc"
        },
        {
            label:"expenditure",
            onClick:() => {
                setModalType("expenditure")
                setModalOpen(true)
            },
            icon:"exp"
        }
    ]

    const closeModal = () => setModalOpen(false)
    const openDeleteItemModal = (itemId) => {
        setItemToBeDeleted(itemId)
        setDeleteModalOpen(true)
    }
    const closeDeleteItemModal = () => {
        setItemToBeDeleted(null)
        setDeleteModalOpen(false)   
    }

    return (
        <section>
            <h1>Client {client?.name}</h1>

            <div className="month-selector">
                <label htmlFor="month-select">Filter by Month: </label>
                <select 
                    id="month-select" 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(e.target.value)}
                >
                    {monthOptions.map((month) => (
                        <option key={month} value={month}>
                            {month}
                        </option>
                    ))}
                </select>
            </div>
            
            {/* Summary Cards Container */}
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
            marginBottom: '24px',
            fontFamily: 'system-ui, sans-serif'
        }}>
            {/* Income Card */}
            <div style={{
                backgroundColor: '#f0fdf4', // Light green
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#16a34a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Total Income
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: '700', color: '#14532d' }}>
                    R{monthTotals.incomeTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
            </div>

            {/* Expense Card */}
            <div style={{
                backgroundColor: '#fef2f2', // Light red
                border: '1px solid #fecaca',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <p style={{ margin: 0, fontSize: '14px', color: '#dc2626', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Total Expenses
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '28px', fontWeight: '700', color: '#7f1d1d' }}>
                    R{monthTotals.expenseTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
            </div>

            {/* Net Balance Card */}
            <div style={{
                // Dynamically shift colors based on a positive or negative balance
                backgroundColor: monthTotals.netBalance >= 0 ? '#eff6ff' : '#fff7ed', // Light blue vs light orange
                border: monthTotals.netBalance >= 0 ? '1px solid #bfdbfe' : '1px solid #ffedd5',
                borderRadius: '12px',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
            }}>
                <p style={{ 
                    margin: 0, 
                    fontSize: '14px', 
                    color: monthTotals.netBalance >= 0 ? '#2563eb' : '#ea580c', 
                    fontWeight: '600', 
                    textTransform: 'uppercase', 
                    letterSpacing: '0.05em' 
                }}>
                    Net Balance
                </p>
                <p style={{ 
                    margin: '8px 0 0 0', 
                    fontSize: '28px', 
                    fontWeight: '700', 
                    color: monthTotals.netBalance >= 0 ? '#1e3a8a' : '#7c2d12' 
                }}>
                    {monthTotals.netBalance < 0 ? '-' : ''}R{Math.abs(monthTotals.netBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </p>
            </div>
        </div>


            <div className="transactions-timeline">
                {groupedAndSortedTransactions?.map(group => (
                <div key={group.date} className="date-group" style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    padding: '20px',
                    marginBottom: '20px',
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
                    fontFamily: 'system-ui, sans-serif'
                }}>
                    {/* Date Header for this specific group */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        borderBottom: '2px solid #f1f5f9',
                        paddingBottom: '12px',
                        marginBottom: '16px'
                    }}>
                        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: '700', color: '#1e293b' }}>
                            {group.date}
                        </h2>
                        {/* Pro-Tip: Adding your computed day net balance here keeps the view highly functional */}
                        <span style={{
                            fontSize: '13px',
                            fontWeight: '600',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            backgroundColor: group.dayNetBalance >= 0 ? '#dcfce7' : '#fee2e2',
                            color: group.dayNetBalance >= 0 ? '#15803d' : '#b91c1c'
                        }}>
                            Daily Net: {group.dayNetBalance >= 0 ? '+' : ''}R{group.dayNetBalance}
                        </span>
                    </div>
                    
                    <div className="transactions"
                        style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                        gap: '24px',
                        marginBottom: '16px'
                    }}
                    >
                    {/* Incomes Section for this day */}
                    <div className="incomes">
                        <h3 style={{ 
                            margin: '0 0 12px 0', 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#16a34a', 
                            textTransform: 'uppercase', 
                            letterSpacing: '0.05em' 
                        }}>
                            Incomes
                        </h3>
                        {group.incomes.length === 0 ? (
                            <p style={{ margin: 0, padding: '12px', color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                                No incomes today
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {group.incomes.map((income, index) => (
                                    <div key={income.id || index} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 14px',
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '8px',
                                        border: '1px solid #f1f5f9',
                                        transition: 'background-color 0.2s'
                                    }}>
                                        <div style={{ flex: 1, fontWeight: '500', color: '#334155', fontSize: '14px' }}>
                                            {income.lineItem}
                                        </div>
                                        <div style={{ fontWeight: '600', color: '#16a34a', fontSize: '14px', marginRight: '16px' }}>
                                            +R{Number(income.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                        <button 
                                            onClick={() => openDeleteItemModal(income.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#94a3b8',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => { e.target.style.color = '#ef4444'; e.target.style.backgroundColor = '#fee2e2'; }}
                                            onMouseLeave={(e) => { e.target.style.color = '#94a3b8'; e.target.style.backgroundColor = 'transparent'; }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {group.incomes.length !== 0 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '12px',
                                padding: '10px 14px 0 14px',
                                borderTop: '1px dashed #e2e8f0',
                                fontSize: '14px'
                            }}>
                                <strong style={{ fontWeight: '600', color: '#64748b', textTransform: 'lowercase' }}>
                                    total incomes
                                </strong>
                                <span style={{ fontWeight: '700', color: '#16a34a' }}>
                                    R{group.dayIncomeTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                        
                    </div>

                    {/* Expenditures Section for this day */}
                    <div className="expenditures">
                        <h3 style={{ 
                            margin: '0 0 12px 0', 
                            fontSize: '13px', 
                            fontWeight: '600', 
                            color: '#dc2626', // Crimson Red
                            textTransform: 'uppercase', 
                            letterSpacing: '0.05em' 
                        }}>
                            Expenses
                        </h3>
                        {group.expenses.length === 0 ? (
                            <p style={{ margin: 0, padding: '12px', color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', textAlign: 'center', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                                No expenses today
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {group.expenses.map((expense, index) => (
                                    <div key={expense.id || index} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '10px 14px',
                                        backgroundColor: '#f8fafc',
                                        borderRadius: '8px',
                                        border: '1px solid #f1f5f9'
                                    }}>
                                        <div style={{ flex: 1, fontWeight: '500', color: '#334155', fontSize: '14px' }}>
                                            {expense.lineItem}
                                        </div>
                                        <div style={{ fontWeight: '600', color: '#dc2626', fontSize: '14px', marginRight: '16px' }}>
                                            -R{Number(expense.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                        </div>
                                        <button 
                                            onClick={() => openDeleteItemModal(expense.id)}
                                            style={{
                                                background: 'none',
                                                border: 'none',
                                                color: '#94a3b8',
                                                cursor: 'pointer',
                                                fontWeight: '600',
                                                fontSize: '14px',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => { e.target.style.color = '#ef4444'; e.target.style.backgroundColor = '#fee2e2'; }}
                                            onMouseLeave={(e) => { e.target.style.color = '#94a3b8'; e.target.style.backgroundColor = 'transparent'; }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                        {group.expenses.length !== 0 && (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                marginTop: '12px',
                                padding: '10px 14px 0 14px',
                                borderTop: '1px dashed #e2e8f0',
                                fontSize: '14px'
                            }}>
                                <strong style={{ fontWeight: '600', color: '#64748b' }}>
                                    Total Expenses
                                </strong>
                                <span style={{ fontWeight: '700', color: '#dc2626' }}>
                                    R{group.dayExpenseTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                            </div>
                        )}
                        
                    </div>
                    {/* Day Summary Footer Bar */}
                    <div className={group.dayNetBalance < 0 ? "total net loss" : "total net profit"} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '20px',
                        padding: '12px 16px',
                        backgroundColor: group.dayNetBalance < 0 ? '#fef2f2' : '#f0fdf4', // Soft red vs soft green background
                        border: group.dayNetBalance < 0 ? '1px solid #fee2e2' : '1px solid #dcfce7',
                        borderRadius: '8px'
                    }}>
                        <strong style={{ 
                            fontWeight: '600', 
                            fontSize: '14px', 
                            color: group.dayNetBalance < 0 ? '#991b1b' : '#166534',
                            textTransform: 'capitalize' 
                        }}>
                            {group.date} Summary ({group.dayNetBalance < 0 ? "loss" : "profit"})
                        </strong>
                        <strong style={{ 
                            fontWeight: '700', 
                            fontSize: '16px', 
                            color: group.dayNetBalance < 0 ? '#991b1b' : '#166534' 
                        }}>
                            {group.dayNetBalance < 0 ? '-' : ''}R{Math.abs(group.dayNetBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </strong>
                    </div>

                    </div>
                </div>
                ))}
            </div>

            <FabMenu items={fabItems}/>
            {modalOpen && <NewIncExpModal userId={user.uid} onClose={closeModal} type={modalType}/>}
            {deleteModalOpen && <DeleteItemModal itemId={itemToBeDeleted} onClose={closeDeleteItemModal}/>}
        </section>

    )
}