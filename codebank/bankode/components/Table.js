// Bankode Dashboard - Table Component
// Reusable table component for displaying transaction data

class BankodeTable {
    /**
     * Create a new table
     * @param {Object} options - Table options
     * @param {string} options.id - Table ID
     * @param {Array} options.columns - Column definitions
     * @param {Array} options.data - Table data
     * @param {boolean} options.searchable - Enable search
     * @param {boolean} options.sortable - Enable sorting
     */
    constructor(options) {
        this.options = {
            id: options.id || 'table-' + Math.random().toString(36).substr(2, 9),
            columns: options.columns || [],
            data: options.data || [],
            searchable: options.searchable || false,
            sortable: options.sortable || false,
            ...options
        };

        this.currentData = [...this.options.data];
        this.sortColumn = null;
        this.sortDirection = 'asc';
        this.element = this.createElement();
    }

    /**
     * Create table element
     * @returns {HTMLElement} Table container element
     */
    createElement() {
        const container = document.createElement('div');
        container.id = this.options.id;
        container.className = 'bankode-table';

        // Add search if enabled
        if (this.options.searchable) {
            container.innerHTML = `
                <div class="mb-4">
                    <input type="text" placeholder="Search..." class="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500" id="${this.options.id}-search">
                </div>
            `;

            const searchInput = container.querySelector(`#${this.options.id}-search`);
            searchInput.addEventListener('input', this.debounce(() => {
                this.filterData(searchInput.value);
            }, 300));
        }

        // Create table structure
        const table = document.createElement('table');
        table.className = 'w-full';

        // Create header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        headerRow.className = 'border-b border-gray-700';

        this.options.columns.forEach(column => {
            const th = document.createElement('th');
            th.className = 'text-left p-2';
            th.textContent = column.title;

            if (this.options.sortable && column.sortable !== false) {
                th.style.cursor = 'pointer';
                th.addEventListener('click', () => this.sortByColumn(column.key));
                th.innerHTML = `${column.title} <i class="fas fa-sort text-xs"></i>`;
            }

            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        // Create body
        const tbody = document.createElement('tbody');
        tbody.id = `${this.options.id}-body`;
        table.appendChild(tbody);

        container.appendChild(table);

        // Render data after element is fully constructed
        setTimeout(() => this.renderData(), 0);

        return container;
    }

    /**
     * Render table data
     */
    renderData() {
        const tbody = this.element.querySelector(`#${this.options.id}-body`);
        if (!tbody) return;

        tbody.innerHTML = '';

        if (this.currentData.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td colspan="${this.options.columns.length}" class="text-center py-4 text-gray-400">No data available</td>`;
            tbody.appendChild(tr);
            return;
        }

        this.currentData.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.className = index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-700';

            this.options.columns.forEach(column => {
                const td = document.createElement('td');
                td.className = 'p-2';

                if (column.formatter) {
                    td.innerHTML = column.formatter(row[column.key], row);
                } else {
                    td.textContent = row[column.key] !== undefined ? row[column.key] : '';
                }

                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });
    }

    /**
     * Update table data
     * @param {Array} data - New data
     */
    updateData(data) {
        this.options.data = data;
        this.currentData = [...data];
        this.renderData();
    }

    /**
     * Filter table data
     * @param {string} searchTerm - Search term
     */
    filterData(searchTerm) {
        if (!searchTerm) {
            this.currentData = [...this.options.data];
        } else {
            const term = searchTerm.toLowerCase();
            this.currentData = this.options.data.filter(row =>
                this.options.columns.some(column =>
                    String(row[column.key]).toLowerCase().includes(term)
                )
            );
        }

        this.renderData();
    }

    /**
     * Sort table by column
     * @param {string} columnKey - Column key to sort by
     */
    sortByColumn(columnKey) {
        if (this.sortColumn === columnKey) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = columnKey;
            this.sortDirection = 'asc';
        }

        this.currentData.sort((a, b) => {
            const aValue = a[columnKey];
            const bValue = b[columnKey];

            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return this.sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
            }

            return this.sortDirection === 'asc'
                ? String(aValue).localeCompare(String(bValue))
                : String(bValue).localeCompare(String(aValue));
        });

        this.renderData();
        this.updateSortIndicators();
    }

    /**
     * Update sort indicators in header
     */
    updateSortIndicators() {
        const headers = this.element.querySelectorAll('th');
        headers.forEach((header, index) => {
            const column = this.options.columns[index];
            if (column.sortable !== false) {
                const icon = header.querySelector('i');
                if (icon) {
                    if (column.key === this.sortColumn) {
                        icon.className = this.sortDirection === 'asc'
                            ? 'fas fa-sort-up text-xs'
                            : 'fas fa-sort-down text-xs';
                    } else {
                        icon.className = 'fas fa-sort text-xs';
                    }
                }
            }
        });
    }

    /**
     * Debounce function
     * @param {Function} func - Function to debounce
     * @param {number} wait - Time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function(...args) {
            const context = this;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    /**
     * Get table element
     * @returns {HTMLElement} Table element
     */
    getElement() {
        return this.element;
    }
}

// Export Table component
window.BankodeTable = BankodeTable;