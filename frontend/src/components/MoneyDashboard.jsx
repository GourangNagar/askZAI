import React, { useState, useEffect, useRef } from 'react';
import Chart from 'chart.js/auto';
import { Pencil, Trash2, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const MoneyDashboard = ({ token }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Edit Modal State
  const [editModal, setEditModal] = useState({ show: false, tx: null });
  const [editAmount, setEditAmount] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editDesc, setEditDesc] = useState('');

  // Report Modal State
  const [showReportPrompt, setShowReportPrompt] = useState(false);
  const [reportMonthInput, setReportMonthInput] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportText, setReportText] = useState('');

  // Indian Rupee Formatter
  const formatINR = (amount) => new Intl.NumberFormat('en-IN').format(amount);

  // Profile Categories for Edit
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  // Date filtering state
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const changeMonth = (offset) => {
    setCurrentMonth(prev => {
      const d = new Date(prev);
      d.setMonth(d.getMonth() + offset);
      return d;
    });
  };

  const filteredTransactions = transactions.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date);
    // Fallback if parsing fails
    if (isNaN(d.getTime())) return true;
    return d.getFullYear() === currentMonth.getFullYear() && d.getMonth() === currentMonth.getMonth();
  });

  useEffect(() => {
    if (filteredTransactions.length >= 0) {
      renderChart();
    }
    
    // Watch for theme toggles to dynamically redraw the chart with correct colors
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          renderChart();
        }
      });
    });
    observer.observe(document.body, { attributes: true });
    return () => observer.disconnect();
  }, [transactions, currentMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch Transactions
      const txRes = await fetch(`http://${window.location.hostname}:8001/api/finances`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (txRes.ok) {
        setTransactions(await txRes.json());
      }

      // Fetch Profile Categories
      const pRes = await fetch(`http://${window.location.hostname}:8001/api/profile`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.custom_categories) setCategories(pData.custom_categories);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const deleteTx = async (id) => {
    if (!window.confirm("Delete transaction?")) return;
    try {
      await fetch(`http://${window.location.hostname}:8001/api/finances/${id}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      setTransactions(prev => prev.filter(t => t.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  const openEdit = (tx) => {
    setEditModal({ show: true, tx });
    setEditAmount(tx.amount);
    setEditCategory(tx.category);
    setEditDesc(tx.description);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        amount: parseFloat(editAmount),
        category: editCategory,
        description: editDesc
      };
      const res = await fetch(`http://${window.location.hostname}:8001/api/finances/${editModal.tx.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setEditModal({ show: false, tx: null });
        fetchData(); // Refresh to ensure data integrity
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generateReport = async (monthStr) => {
    setShowReportPrompt(false);
    setShowReport(true);
    setReportLoading(true);
    setReportText('');
    
    try {
      const res = await fetch(`http://${window.location.hostname}:8001/api/generate_report`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ month: monthStr })
      });
      const data = await res.json();
      if (res.ok) {
        setReportText(data.report);
      } else {
        setReportText("Failed to generate report.");
      }
    } catch (err) {
      setReportText("Network error. Could not connect to Zai.");
    } finally {
      setReportLoading(false);
    }
  };

  const renderChart = () => {
    if (!chartRef.current) return;
    if (chartInstance.current) chartInstance.current.destroy();

    const expenseTransactions = filteredTransactions.filter(t => t.type === 'expense');
    const totalInc = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
    const totalExp = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
    const remainingBudget = totalInc - totalExp;

    const catMap = {};
    expenseTransactions.forEach(t => {
      catMap[t.category] = (catMap[t.category] || 0) + t.amount;
    });

    const labels = Object.keys(catMap);
    const data = Object.values(catMap);

    const distinctColors = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#6366f1'];
    const backgroundColors = labels.map((_, i) => distinctColors[i % distinctColors.length]);

    if (remainingBudget > 0) {
      labels.push('Remaining Budget');
      data.push(remainingBudget);
      backgroundColors.push('#10b981'); // Emerald green for safe remaining budget
    }

    const isLightMode = document.body.classList.contains('light-theme');
    const textColor = isLightMode ? '#0f172a' : '#00ff00';
    const borderColor = isLightMode ? '#ffffff' : '#0a0a0a';

    chartInstance.current = new Chart(chartRef.current, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColor,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { color: textColor, font: { family: 'system-ui' } } }
        }
      }
    });
  };

  const totalExpense = filteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const totalIncome = filteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalSaved = totalIncome - totalExpense;

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const displayMonth = `${monthNames[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;

  // Budget calculations
  const now = new Date();
  const isCurrentMonth = currentMonth.getFullYear() === now.getFullYear() && currentMonth.getMonth() === now.getMonth();
  const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
  const daysLeft = isCurrentMonth ? Math.max(1, daysInMonth - now.getDate()) : 0;
  const perDayBudget = daysLeft > 0 ? (totalSaved / daysLeft).toFixed(2) : "0.00";

  return (
    <div style={{ padding: '1rem' }}>
      <div className="month-picker">
        <button className="month-nav" onClick={() => changeMonth(-1)}><ChevronLeft size={24} /></button>
        <span style={{ color: 'var(--primary)' }}>{displayMonth}</span>
        <button className="month-nav" onClick={() => changeMonth(1)}><ChevronRight size={24} /></button>
      </div>
      <div className="finance-summary-grid">
        <div className="finance-card income-card">
          <h3>Income</h3>
          <p>₹{formatINR(totalIncome)}</p>
        </div>
        <div className="finance-card expense-card">
          <h3>Expense</h3>
          <p>₹{formatINR(totalExpense)}</p>
        </div>
        <div className="finance-card save-card">
          <h3>Saved</h3>
          <p>₹{formatINR(totalSaved)}</p>
        </div>
      </div>

      <div className="finance-summary-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="finance-card" style={{ borderLeft: '3px solid var(--accent)' }}>
          <h3>Days Left</h3>
          <p style={{ color: 'var(--text-main)' }}>{isCurrentMonth ? daysLeft : '-'}</p>
        </div>
        <div className="finance-card" style={{ borderLeft: '3px solid var(--save-color)' }}>
          <h3>Daily Budget</h3>
          <p style={{ color: 'var(--save-color)' }}>₹{isCurrentMonth ? formatINR(perDayBudget) : '-'}</p>
        </div>
      </div>

      <div className="chart-container">
        <canvas ref={chartRef}></canvas>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '0.5rem' }}>
        <h3 style={{ color: 'var(--primary)', margin: 0 }}>RECENT TRANSACTIONS</h3>
        <button 
          onClick={() => {
            setReportMonthInput(`${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, '0')}`);
            setShowReportPrompt(true);
          }} 
          style={{ background: 'transparent', border: '1px solid var(--primary)', borderRadius: '4px', padding: '0.25rem 0.5rem', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
        >
          <FileText size={16} />
          <span style={{ fontSize: '0.75rem', fontWeight: 'bold' }}>AI REPORT</span>
        </button>
      </div>

      {loading ? (
        <div className="empty-state">Loading ledger...</div>
      ) : filteredTransactions.length === 0 ? (
        <div className="empty-state">No transactions in {displayMonth}.</div>
      ) : (
        filteredTransactions.map(t => (
          <div key={t.id} className="memory-card">
            <div className="memory-content">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <strong style={{ color: t.type === 'expense' ? 'var(--danger)' : t.type === 'income' ? 'var(--success)' : 'var(--save-color)' }}>
                  {t.type.toUpperCase()}: {formatINR(t.amount)} {t.currency}
                </strong>
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{t.category}</span>
              </div>
              <div className="memory-fact">{t.description}</div>
              <div className="memory-meta"><span>{t.date}</span></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button className="edit-btn" onClick={() => openEdit(t)}><Pencil size={16} /></button>
              <button className="delete-btn" onClick={() => deleteTx(t.id)}><Trash2 size={16} /></button>
            </div>
          </div>
        ))
      )}

      {/* Edit Modal */}
      {editModal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Edit Transaction</h3>
              <button className="close-btn" onClick={() => setEditModal({ show: false, tx: null })}>&times;</button>
            </div>
            <form onSubmit={saveEdit}>
              <div className="form-group">
                <label>Amount</label>
                <input type="number" step="0.01" value={editAmount} onChange={e => setEditAmount(e.target.value)} required />
              </div>
              <div className="form-group">
                <label>Category</label>
                <select value={editCategory} onChange={e => setEditCategory(e.target.value)} required>
                  <option value="" disabled>Select Category</option>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  {!categories.includes(editCategory) && <option value={editCategory}>{editCategory}</option>}
                </select>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={editDesc} onChange={e => setEditDesc(e.target.value)} rows="3"></textarea>
              </div>
              <button type="submit" className="primary-btn">Save Changes</button>
            </form>
          </div>
        </div>
      )}

      {/* AI Report Prompt Modal */}
      {showReportPrompt && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Generate Zai Report</h3>
              <button className="close-btn" onClick={() => setShowReportPrompt(false)}>&times;</button>
            </div>
            <div className="form-group">
              <label>Select Month</label>
              <input 
                type="month" 
                value={reportMonthInput}
                onChange={e => setReportMonthInput(e.target.value)}
              />
            </div>
            <button className="primary-btn" onClick={() => generateReport(reportMonthInput)}>
              Generate Report
            </button>
          </div>
        </div>
      )}

      {/* AI Report Modal */}
      {showReport && (
        <div className="modal-overlay" onClick={() => setShowReport(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <FileText /> {displayMonth} Executive Report
            </h2>
            <div style={{ color: 'var(--text-main)', lineHeight: '1.6', fontSize: '0.95rem' }}>
              {reportLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem' }}>
                  <div className="loader" style={{ marginBottom: '1rem' }}></div>
                  <p>Zai is intensely analyzing your finances...</p>
                </div>
              ) : (
                <div className="markdown-report" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <ReactMarkdown>{reportText}</ReactMarkdown>
                </div>
              )}
            </div>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button className="primary-btn" onClick={() => setShowReport(false)} style={{ width: 'auto' }}>CLOSE</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MoneyDashboard;
