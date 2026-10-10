import React, { useState, useMemo } from 'react';

export default function YearMonthSelect() {
  // 1. Calculate the last 6 year-months (YYYY-MM)
  const options = useMemo(() => {
    const list = [];
    const date = new Date();

    for (let i = 0; i < 6; i++) {
      const d = new Date(date.getFullYear(), date.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      
      list.push(`${year}-${month}`);
    }
    return list;
  }, []);

  // 2. Manage the selected value in state (defaults to the current month)
  const [selectedMonth, setSelectedMonth] = useState(options[0]);
  

  return (
    <div style={{ fontFamily: 'sans-serif', margin: '20px' }}>
      <label htmlFor="month-select" style={{ marginRight: '10px', fontWeight: 'bold' }}>
        Select Month: 
      </label>
      
      {/* 3. Render the selectable list */}
      <select 
        id="month-select"
        value={selectedMonth} 
        onChange={(e) => setSelectedMonth(e.target.value)}
      >
        {options.map((month) => (
          <option key={month} value={month}>
            {month}
          </option>
        ))}
      </select>

      <p style={{ marginTop: '15px' }}>
        Selected Value: <strong>{selectedMonth}</strong>
      </p>
    </div>
  );
}
