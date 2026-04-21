/**
 * Modern Dashboard JavaScript
 * Handles dynamic statistics loading, charts, and interactivity
 */

// Global chart instances
let salesChart = null;
let revenueSourceChart = null;

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load initial statistics
    loadStatistics('current_month');

    // Setup period filter listener
    const periodFilter = document.getElementById('periodFilter');
    if (periodFilter) {
        periodFilter.addEventListener('change', function() {
            loadStatistics(this.value);
        });
    }
});



/**
 * Load statistics via AJAX
 *
 * @param {string} period - Selected time period
 */
function loadStatistics(period) {
    // Show loading spinner
    showLoading();

    // AJAX request to get statistics
    fetch('/SOBITAS-FULL-PROJECT/backend/public/admin/dashboard/statistics', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
        },
        body: JSON.stringify({ period: period })
    })
    .then(response => response.json())
    .then(data => {
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
        console.log(error);
        hideLoading();
        // showError('Erreur lors du chargement des statistiques');
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
