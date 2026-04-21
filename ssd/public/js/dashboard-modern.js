/**
 * Modern Dashboard JavaScript
 * Handles dynamic statistics loading, charts, and interactivity with custom date range support
 */

// Global chart instances
let salesChart = null;
let revenueSourceChart = null;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    // Set default dates to current month
    setDefaultDates();

    // Load initial statistics (current month by default)
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    loadStatistics(null, startDate, endDate);

    // Setup custom date range apply button
    const applyCustomDatesBtn = document.getElementById('applyCustomDates');
    if (applyCustomDatesBtn) {
        applyCustomDatesBtn.addEventListener('click', function() {
            applyCustomDateRange();
        });
    }

    // Setup date input validation
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (startDateInput) {
        startDateInput.addEventListener('change', function() {
            // Update end date minimum to match start date
            if (endDateInput && this.value) {
                endDateInput.min = this.value;

                // If end date is before start date, update it to match start date
                if (endDateInput.value && new Date(endDateInput.value) < new Date(this.value)) {
                    endDateInput.value = this.value;
                }
            }
        });
    }
});

/**
 * Set default dates for custom range (current month)
 */
function setDefaultDates() {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');

    if (startDateInput) {
        startDateInput.value = formatDateForInput(firstDay);
    }
    if (endDateInput) {
        endDateInput.value = formatDateForInput(lastDay);
        endDateInput.min = formatDateForInput(firstDay);
    }
}

/**
 * Format date for input element (YYYY-MM-DD)
 */
function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Apply custom date range and load statistics
 */
function applyCustomDateRange() {
    const startDate = document.getElementById('startDate').value;
    const endDate = document.getElementById('endDate').value;
    const dateError = document.getElementById('dateError');
    const dateErrorMessage = document.getElementById('dateErrorMessage');

    // Validate dates are selected
    if (!startDate || !endDate) {
        dateError.style.display = 'flex';
        dateErrorMessage.textContent = 'Veuillez sélectionner les deux dates';
        return;
    }

    // Validate end date is after or equal to start date
    if (new Date(endDate) < new Date(startDate)) {
        dateError.style.display = 'flex';
        dateErrorMessage.textContent = 'La date de fin doit être postérieure ou égale à la date de début';
        return;
    }

    // Validate dates are not in the future
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (new Date(startDate) > today || new Date(endDate) > today) {
        dateError.style.display = 'flex';
        dateErrorMessage.textContent = 'Les dates ne peuvent pas être dans le futur';
        return;
    }

    // Hide error message
    dateError.style.display = 'none';

    // Load statistics with custom date range
    loadStatistics(null, startDate, endDate);
}

/**
 * Load statistics via AJAX
 *
 * @param {string} period - Selected time period (not used, kept for compatibility)
 * @param {string} startDate - Custom start date
 * @param {string} endDate - Custom end date
 */
function loadStatistics(period, startDate = null, endDate = null) {
    // Show loading spinner
    showLoading();

    // Prepare request body with dates
    const requestBody = {
        start_date: startDate,
        end_date: endDate,
        period: 'current_month' // Fallback value, dates will take priority
    };

    console.log('Request Body:', requestBody); // Debug log

    // AJAX request to get statistics
    fetch(window.dashboardStatisticsUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify(requestBody)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Response Data:', data); // Debug log

        // Update overview statistics
        updateOverviewStats(data.overview);

        // Update top products
        updateTopProducts(data.top_products);

        // Update charts
        updateSalesChart(data.sales_chart);
        updateRevenueSourceChart(data.revenue_by_source);

        // Hide loading spinner
        hideLoading();
    })
    .catch(error => {
        console.error('Error loading statistics:', error);
        hideLoading();
        showError('Erreur lors du chargement des statistiques: ' + error.message);
    });
}

/**
 * Update overview statistics cards
 *
 * @param {Object} data - Overview statistics data
 */
function updateOverviewStats(data) {
    // Format numbers with thousand separators
    const formatNumber = (num) => {
        return new Intl.NumberFormat('fr-TN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    // Update total revenue
    document.getElementById('totalRevenue').textContent = formatNumber(data.total_revenue) + ' TND';

    // Update total orders
    document.getElementById('totalOrders').textContent = data.total_orders;

    // Update new clients
    document.getElementById('newClients').textContent = data.new_clients;

    // Update average order value
    document.getElementById('avgOrderValue').textContent = formatNumber(data.average_order_value) + ' TND';
}

/**
 * Update top products section
 *
 * @param {Array} products - Top products data
 */
function updateTopProducts(products) {
    const grid = document.getElementById('topProductsGrid');

    if (!products || products.length === 0) {
        grid.innerHTML = '<div style="text-align: center; padding: 40px; color: #6b7280;">Aucun produit vendu pendant cette période</div>';
        return;
    }

    // Format currency
    const formatCurrency = (num) => {
        return new Intl.NumberFormat('fr-TN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(num);
    };

    // Generate product cards HTML
    let html = '';
    products.forEach((product, index) => {
        html += `
            <div class="product-card">
                <div class="product-rank">#${index + 1}</div>
                <div class="product-info">
                    <div class="product-name">${escapeHtml(product.name)}</div>
                    <div class="product-stats">
                        <div class="product-stat">
                            <span class="product-stat-label">Quantité vendue</span>
                            <span class="product-stat-value">${product.quantity}</span>
                        </div>
                        <div class="product-stat">
                            <span class="product-stat-label">Revenu total</span>
                            <span class="product-stat-value product-stat-revenue">${formatCurrency(product.revenue)} TND</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    grid.innerHTML = html;
}

/**
 * Update sales chart
 *
 * @param {Array} data - Sales chart data
 */
function updateSalesChart(data) {
    const ctx = document.getElementById('salesChart');
    if (!ctx) return;

    // Destroy existing chart
    if (salesChart) {
        salesChart.destroy();
    }

    // Extract labels and values
    const labels = data.map(item => item.label);
    const values = data.map(item => item.value);

    // Create new chart
    salesChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Chiffre d\'affaires (TND)',
                data: values,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 4,
                pointHoverRadius: 6,
                pointBackgroundColor: '#3b82f6',
                pointBorderColor: '#fff',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        font: {
                            size: 13,
                            weight: '600'
                        },
                        color: '#1f2937',
                        padding: 15
                    }
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return 'CA: ' + context.parsed.y.toFixed(2) + ' TND';
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        font: {
                            size: 12
                        },
                        color: '#6b7280',
                        callback: function(value) {
                            return value.toFixed(0) + ' TND';
                        }
                    },
                    grid: {
                        color: '#f3f4f6',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        font: {
                            size: 12
                        },
                        color: '#6b7280'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Update revenue source chart (pie/doughnut)
 *
 * @param {Array} data - Revenue by source data
 */
function updateRevenueSourceChart(data) {
    const ctx = document.getElementById('revenueSourceChart');
    if (!ctx) return;

    // Destroy existing chart
    if (revenueSourceChart) {
        revenueSourceChart.destroy();
    }

    // Filter out zero values
    const filteredData = data.filter(item => item.revenue > 0);

    if (filteredData.length === 0) {
        ctx.parentElement.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 300px; color: #6b7280;">Aucune donnée disponible</div>';
        return;
    }

    // Extract labels and values
    const labels = filteredData.map(item => item.source);
    const values = filteredData.map(item => item.revenue);

    // Define colors
    const colors = [
        '#3b82f6', // Blue
        '#10b981', // Green
        '#f59e0b', // Orange
        '#8b5cf6', // Purple
    ];

    // Create new chart
    revenueSourceChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderWidth: 3,
                borderColor: '#fff',
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        font: {
                            size: 13,
                            weight: '600'
                        },
                        color: '#1f2937',
                        padding: 15,
                        usePointStyle: true,
                        pointStyle: 'circle'
                    }
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    titleFont: {
                        size: 14,
                        weight: '600'
                    },
                    bodyFont: {
                        size: 13
                    },
                    padding: 12,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = ((value / total) * 100).toFixed(1);
                            return label + ': ' + value.toFixed(2) + ' TND (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

/**
 * Show loading spinner
 */
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'flex';
    document.getElementById('statisticsContent').style.opacity = '0.5';
}

/**
 * Hide loading spinner
 */
function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
    document.getElementById('statisticsContent').style.opacity = '1';
}

/**
 * Show error message
 *
 * @param {string} message - Error message
 */
function showError(message) {
    alert(message);
}

/**
 * Escape HTML to prevent XSS
 *
 * @param {string} text - Text to escape
 * @return {string} - Escaped text
 */
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
