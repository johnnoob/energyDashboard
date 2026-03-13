// Global variables
let dashboardData = null;
let filteredData = [];
let charts = {};

// Dominant colors for charts (beautiful modern palette)
const chartColors = [
    'rgba(67, 97, 238, 0.8)',   // Primary
    'rgba(76, 201, 240, 0.8)',  // Success
    'rgba(114, 9, 183, 0.8)',   // Purple
    'rgba(247, 37, 133, 0.8)',  // Pink
    'rgba(252, 163, 17, 0.8)',  // Orange
    'rgba(0, 150, 199, 0.8)',   // Blue
    'rgba(72, 149, 239, 0.8)',  // Light Blue
    'rgba(86, 11, 173, 0.8)'    // Deep Purple
];

const borderColors = chartColors.map(c => c.replace('0.8', '1'));

// Initialize the application
Chart.register(ChartDataLabels);

document.addEventListener('DOMContentLoaded', async () => {
    initThemeToggle();
    setChartDefaults();
    
    try {
        await loadData();
        populateFilters();
        setupEventListeners();
        filterAndUpdateDashboard();
    } catch (error) {
        console.error("Failed to initialize dashboard:", error);
    }
});

// Theme Management
function initThemeToggle() {
    const themeBtn = document.getElementById('theme-toggle');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = localStorage.getItem('theme') || (prefersDark ? 'dark' : 'light');
    
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    themeBtn.addEventListener('click', () => {
        let theme = document.documentElement.getAttribute('data-theme');
        theme = theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        updateThemeIcon(theme);
        updateChartThemes();
    });
}

function updateThemeIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (theme === 'dark') {
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-sun"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>';
    } else {
        btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-moon"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
    }
}

// Chart.js Configuration
function setChartDefaults() {
    Chart.defaults.font.family = "'Noto Sans TC', 'Inter', sans-serif";
    updateChartThemes();
}

function updateChartThemes() {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#6c757d';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
    
    Chart.defaults.color = textColor;
    Chart.defaults.scale.grid.color = gridColor;
    
    // Rerender all charts if they exist
    Object.values(charts).forEach(chart => {
        if (chart.options.scales) {
            if (chart.options.scales.x) chart.options.scales.x.grid.color = gridColor;
            if (chart.options.scales.y) chart.options.scales.y.grid.color = gridColor;
        }
        chart.update();
    });
}

// Data Fetching
async function loadData() {
    try {
        const response = await fetch('data.json');
        dashboardData = await response.json();
    } catch (e) {
        console.error("Error loading JSON. Fallback to empty state.", e);
        dashboardData = { months: [], categories: [], companies: [], records: [] };
    }
}

// UI Setup
function populateFilters() {
    if (!dashboardData || !dashboardData.categories) return;

    const catSelect = document.getElementById('category-select');
    const compSelect = document.getElementById('company-select');
    
    dashboardData.categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        catSelect.appendChild(opt);
    });
    
    dashboardData.companies.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        compSelect.appendChild(opt);
    });
}

function setupEventListeners() {
    document.getElementById('category-select').addEventListener('change', filterAndUpdateDashboard);
    document.getElementById('company-select').addEventListener('change', filterAndUpdateDashboard);
    document.getElementById('reset-filters').addEventListener('click', () => {
        document.getElementById('category-select').value = 'all';
        document.getElementById('company-select').value = 'all';
        filterAndUpdateDashboard();
    });
}

// Core Logic
function filterAndUpdateDashboard() {
    const catFilter = document.getElementById('category-select').value;
    const compFilter = document.getElementById('company-select').value;
    
    filteredData = dashboardData.records.filter(r => {
        const catMatch = catFilter === 'all' || r.category === catFilter;
        const compMatch = compFilter === 'all' || r.company === compFilter;
        return catMatch && compMatch;
    });
    
    updateSummaryStats();
    updateTrendChart();
    updateCategoryChart();
    updateCompanyChart();
    updateDataTable();
}

function updateSummaryStats() {
    let totalVol = 0;
    filteredData.forEach(r => {
        Object.values(r.monthly_data).forEach(val => totalVol += val);
    });
    
    // Format numbers nicely
    document.getElementById('total-volume').textContent = totalVol.toLocaleString(undefined, { maximumFractionDigits: 0 });
    document.getElementById('total-records').textContent = filteredData.length.toLocaleString();
}

function getRecordTotal(record) {
    return Object.values(record.monthly_data).reduce((sum, val) => sum + val, 0);
}

// Charts
function updateTrendChart() {
    const ctx = document.getElementById('trendChart').getContext('2d');
    
    // Aggregate data by month
    const monthlyTotals = {};
    dashboardData.months.forEach(m => monthlyTotals[m] = 0);
    
    filteredData.forEach(r => {
        dashboardData.months.forEach(m => {
            monthlyTotals[m] += r.monthly_data[m] || 0;
        });
    });
    
    const labels = dashboardData.months;
    const data = dashboardData.months.map(m => monthlyTotals[m]);
    
    if (charts.trend) charts.trend.destroy();
    
    // Gradient fill for beautiful line chart
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(67, 97, 238, 0.4)');
    gradient.addColorStop(1, 'rgba(67, 97, 238, 0.0)');
    
    charts.trend = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '總進出口量 (Volume)',
                data: data,
                borderColor: 'rgba(67, 97, 238, 1)',
                backgroundColor: gradient,
                borderWidth: 3,
                tension: 0.4, // Smooth curves
                fill: true,
                pointBackgroundColor: 'rgba(255, 255, 255, 1)',
                pointBorderColor: 'rgba(67, 97, 238, 1)',
                pointBorderWidth: 2,
                pointRadius: 4,
                pointHoverRadius: 6
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    titleFont: { size: 14, family: "'Noto Sans TC', sans-serif" },
                    bodyFont: { size: 13, family: "'Inter', sans-serif" },
                    padding: 12,
                    cornerRadius: 8,
                },
                datalabels: {
                    display: false // Hide on line chart
                }
            },
            scales: {
                y: { beginAtZero: true },
                x: { grid: { display: false } }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });
}

function updateCategoryChart() {
    const ctx = document.getElementById('categoryChart').getContext('2d');
    
    // Aggregate by category
    const catTotals = {};
    filteredData.forEach(r => {
        if (!catTotals[r.category]) catTotals[r.category] = 0;
        catTotals[r.category] += getRecordTotal(r);
    });
    
    // Sort and get top
    const sortedCats = Object.entries(catTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8); // Max 8 segments
        
    const labels = sortedCats.map(item => item[0].substring(0, 15) + (item[0].length > 15 ? '...' : ''));
    const data = sortedCats.map(item => item[1]);
    
    if (charts.category) charts.category.destroy();
    
    charts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: chartColors,
                borderColor: borderColors,
                borderWidth: 1,
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%', // Thin modern donut
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8,
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            let label = context.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed !== null) {
                                label += new Intl.NumberFormat().format(context.parsed);
                            }
                            
                            // Calculate percentage
                            let dataset = context.chart.data.datasets[context.datasetIndex];
                            let total = dataset.data.reduce((acc, current) => acc + current, 0);
                            let percentage = ((context.parsed / total) * 100).toFixed(1) + '%';
                            
                            return `${label} (${percentage})`;
                        }
                    }
                },
                datalabels: {
                    color: '#ffffff',
                    font: {
                        weight: 'bold',
                        size: 11,
                        family: "'Inter', sans-serif"
                    },
                    formatter: (value, ctx) => {
                        let total = ctx.dataset.data.reduce((acc, current) => acc + current, 0);
                        let percentage = ((value / total) * 100).toFixed(1);
                        if (percentage < 3) return null; // Hide if slice is too small
                        return percentage + '%';
                    },
                    textShadowBlur: 4,
                    textShadowColor: 'rgba(0, 0, 0, 0.8)'
                }
            }
        }
    });
}

function updateCompanyChart() {
    const ctx = document.getElementById('companyChart').getContext('2d');
    
    // Aggregate by company
    const compTotals = {};
    filteredData.forEach(r => {
        if (!compTotals[r.company]) compTotals[r.company] = 0;
        compTotals[r.company] += getRecordTotal(r);
    });
    
    // Sort and get top 5
    const sortedComps = Object.entries(compTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
        
    const labels = sortedComps.map(item => item[0].substring(0, 15) + (item[0].length > 15 ? '...' : ''));
    const data = sortedComps.map(item => item[1]);
    
    if (charts.company) charts.company.destroy();
    
    charts.company = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: '總量 (Volume)',
                data: data,
                backgroundColor: 'rgba(76, 201, 240, 0.7)', // Success color
                borderColor: 'rgba(76, 201, 240, 1)',
                borderWidth: 1,
                borderRadius: 6 // Rounded modern bars
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat().format(context.parsed.y);
                            }
                            
                            // Calculate percentage from total volume of the filtered dataset
                            let total = filteredData.reduce((sum, r) => sum + getRecordTotal(r), 0);
                            let percentage = total > 0 ? ((context.parsed.y / total) * 100).toFixed(1) + '%' : '0%';
                            
                            return `${label} (${percentage})`;
                        }
                    }
                },
                datalabels: {
                    color: () => document.documentElement.getAttribute('data-theme') === 'dark' ? '#f8fafc' : '#2b2d42',
                    anchor: 'end',
                    align: 'top',
                    offset: 4,
                    font: {
                        weight: 'bold',
                        size: 11,
                        family: "'Inter', sans-serif"
                    },
                    formatter: (value) => {
                        let total = filteredData.reduce((sum, r) => sum + getRecordTotal(r), 0);
                        let percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                        if (percentage < 1) return null;
                        return percentage + '%';
                    }
                }
            },
            layout: {
               padding: { top: 20 }
            },
            scales: {
                y: { beginAtZero: true },
                x: { grid: { display: false } }
            }
        }
    });
}

function updateDataTable() {
    // Update headers first
    const thead = document.getElementById('data-table-head');
    thead.innerHTML = '';
    
    // Create header row
    const hr = document.createElement('tr');
    hr.innerHTML = `
        <th>類別 (Category)</th>
        <th>貨品名稱 (Product)</th>
        <th>廠商名稱 (Company)</th>
    `;
    
    // Add a column header for each month
    dashboardData.months.forEach(m => {
        hr.innerHTML += `<th>${m}</th>`;
    });
    
    // Add total header at the end
    hr.innerHTML += `<th>總計 (Total)</th>`;
    thead.appendChild(hr);

    // Update body
    const tbody = document.getElementById('data-table-body');
    tbody.innerHTML = '';
    
    // Add top 15 rows for preview
    const rowsToShow = filteredData
        .map(r => ({ ...r, total: getRecordTotal(r) }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 15);
        
    rowsToShow.forEach(r => {
        const tr = document.createElement('tr');
        
        // Base columns
        let rowHTML = `
            <td><span style="font-weight:500">${r.category}</span></td>
            <td>${r.product_name}</td>
            <td>${r.company}</td>
        `;
        
        // Month columns
        dashboardData.months.forEach(m => {
            const val = r.monthly_data[m] || 0;
            // Format to 1 decimal place, grey out if zero
            const displayVal = val.toLocaleString(undefined, {maximumFractionDigits: 1});
            const colorStyle = val === 0 ? 'color:var(--text-secondary); opacity:0.5;' : '';
            rowHTML += `<td style="${colorStyle}">${displayVal}</td>`;
        });
        
        // Total column
        rowHTML += `<td style="color:var(--primary); font-weight:600">${r.total.toLocaleString(undefined, {maximumFractionDigits: 1})}</td>`;
        
        tr.innerHTML = rowHTML;
        tbody.appendChild(tr);
    });
    
    const colCount = 4 + dashboardData.months.length;
    
    if (filteredData.length > 15) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${colCount}" style="text-align:center; color:var(--text-secondary); font-style:italic;">顯示前 15 筆記錄 (Showing top 15 records)...</td>`;
        tbody.appendChild(tr);
    } else if (filteredData.length === 0) {
        const tr = document.createElement('tr');
        tr.innerHTML = `<td colspan="${colCount}" style="text-align:center; padding: 2rem;">查無資料 (No data found)</td>`;
        tbody.appendChild(tr);
    }
}
