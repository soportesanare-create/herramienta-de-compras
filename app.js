let inventoryData = { insumos: [], medicamentos: [] };
let currentView = 'dashboard';
let currentTab = 'insumos';

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('inventory_data.json');
        inventoryData = await response.json();
        
        initApp();
    } catch (error) {
        console.error('Error loading inventory data:', error);
    }
});

function initApp() {
    setupNavigation();
    setupTabs();
    updateDashboard();
    renderInventory();
    renderCatalogo();
    setupSearch();
    setupAutocomplete();
}

function setupNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            const viewId = item.getAttribute('data-view');
            
            // Update active menu
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            
            // Switch views
            const views = document.querySelectorAll('.view-container');
            views.forEach(v => v.classList.remove('active'));
            
            const targetView = document.getElementById(`view-${viewId}`);
            if (targetView) targetView.classList.add('active');
            
            currentView = viewId;
        });
    });
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.getAttribute('data-tab');
            renderInventory();
        });
    });
}

function updateDashboard() {
    const totalInsumos = inventoryData.insumos.length;
    const totalMedicamentos = inventoryData.medicamentos.length;
    
    document.getElementById('stat-insumos').textContent = totalInsumos.toLocaleString();
    document.getElementById('stat-medicamentos').textContent = totalMedicamentos.toLocaleString();
    
    // Calculate total cost (simplified)
    let totalCost = 0;
    inventoryData.insumos.forEach(item => {
        const val = parseFloat(String(item.TOTAL).replace(/[^0-9.-]+/g,""));
        if (!isNaN(val)) totalCost += val;
    });
    inventoryData.medicamentos.forEach(item => {
        const val = parseFloat(String(item.TOTAL).replace(/[^0-9.-]+/g,""));
        if (!isNaN(val)) totalCost += val;
    });
    
    document.getElementById('stat-total-cost').textContent = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(totalCost);

    renderCharts();
}

function renderCharts() {
    const ctxInvest = document.getElementById('chart-investment').getContext('2d');
    const ctxLoc = document.getElementById('chart-location').getContext('2d');

    // Chart 1: Insumos vs Medicamentos Investment
    let insumosTotal = 0;
    inventoryData.insumos.forEach(item => {
        const val = parseFloat(String(item.TOTAL).replace(/[^0-9.-]+/g,""));
        if (!isNaN(val)) insumosTotal += val;
    });

    let medsTotal = 0;
    inventoryData.medicamentos.forEach(item => {
        const val = parseFloat(String(item.TOTAL).replace(/[^0-9.-]+/g,""));
        if (!isNaN(val)) medsTotal += val;
    });

    new Chart(ctxInvest, {
        type: 'bar',
        data: {
            labels: ['Insumos', 'Medicamentos'],
            datasets: [{
                label: 'Inversión (MXN)',
                data: [insumosTotal, medsTotal],
                backgroundColor: ['#0064d1', '#00b0ff'],
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });

    // Chart 2: Distribution by Location (using 'CENTRO DE VIDA')
    const locations = {};
    [...inventoryData.insumos, ...inventoryData.medicamentos].forEach(item => {
        const loc = item['CENTRO DE VIDA'] || 'NO DEFINIDO';
        locations[loc] = (locations[loc] || 0) + 1;
    });

    new Chart(ctxLoc, {
        type: 'doughnut',
        data: {
            labels: Object.keys(locations),
            datasets: [{
                data: Object.values(locations),
                backgroundColor: ['#354a5f', '#0070d2', '#00b0ff', '#889ab1', '#e2e5e9'],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: { position: 'bottom' }
            }
        }
    });
}

function renderInventory(filterText = '') {
    const tableBody = document.getElementById('table-body');
    const tableHeaders = document.getElementById('table-headers');
    const data = inventoryData[currentTab];
    
    if (!data || data.length === 0) return;

    // Setup headers based on the first item
    const keys = Object.keys(data[0]);
    tableHeaders.innerHTML = keys.map(key => `<th>${key}</th>`).join('');

    // Filter data
    const filteredData = data.filter(item => {
        const searchText = filterText.toLowerCase();
        return Object.values(item).some(val => 
            String(val).toLowerCase().includes(searchText)
        );
    });

    // Render body
    tableBody.innerHTML = filteredData.map(item => {
        return `<tr>${keys.map(key => `<td>${item[key]}</td>`).join('')}</tr>`;
    }).join('');
}

function setupSearch() {
    document.getElementById('inventory-search').addEventListener('input', (e) => {
        renderInventory(e.target.value);
    });

    const catSearch = document.getElementById('catalogo-search');
    if (catSearch) {
        catSearch.addEventListener('input', (e) => {
            renderCatalogo(e.target.value);
        });
    }
}

function renderCatalogo(filterText = '') {
    const tableBody = document.getElementById('catalogo-body');
    if (!tableBody) return;

    // Combine insumos and medicamentos
    const allItems = [...inventoryData.insumos, ...inventoryData.medicamentos];
    
    // Group by ID/Description
    const catalogMap = new Map();
    allItems.forEach(item => {
        if (!item['ID'] && !item['DESCRIPCIÓN']) return; // Skip empty rows
        
        const id = item['ID'] || 'S/N';
        const desc = item['DESCRIPCIÓN'] || item['DESCRIPCIN'] || 'Sin Descripción';
        const location = item['CENTRO DE VIDA'] || 'NO DEFINIDO';
        const qty = parseFloat(item['CANTIDAD']) || 0;
        const unit = item['UMC'] || 'PZA';
        
        const key = `${id}-${location}`;
        
        if (catalogMap.has(key)) {
            const existing = catalogMap.get(key);
            existing.qty += qty;
        } else {
            catalogMap.set(key, { id, desc, location, qty, unit });
        }
    });
    
    let catalogList = Array.from(catalogMap.values());
    
    if (filterText) {
        const searchText = filterText.toLowerCase();
        catalogList = catalogList.filter(item => 
            item.desc.toLowerCase().includes(searchText) || 
            item.id.toString().toLowerCase().includes(searchText) ||
            item.location.toLowerCase().includes(searchText)
        );
    }
    
    tableBody.innerHTML = catalogList.map(item => `
        <tr>
            <td>${item.id}</td>
            <td>${item.desc}</td>
            <td>${item.location}</td>
            <td><strong>${item.qty}</strong></td>
            <td>${item.unit}</td>
        </tr>
    `).join('');
}

function addReqRow() {
    const body = document.getElementById('req-items-body');
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="item-id-input" list="medications-id-list" placeholder="ID" onchange="autoFillItem(this, 'id')"></td>
        <td><input type="text" class="item-desc-input" list="medications-desc-list" placeholder="Buscar medicamento..." onchange="autoFillItem(this, 'desc')"></td>
        <td><input type="number" value="1" style="width: 80px;"></td>
        <td><input type="text" class="item-unit-input" value="PZA" style="width: 80px;"></td>
        <td><i class="fas fa-trash" style="color: red; cursor: pointer;" onclick="this.parentElement.parentElement.remove()"></i></td>
    `;
    body.appendChild(row);
}

function addMovRow() {
    const body = document.querySelector('#view-movements tbody');
    if (!body) return;
    const row = document.createElement('tr');
    row.innerHTML = `
        <td><input type="text" class="item-id-input" list="medications-id-list" placeholder="ID" onchange="autoFillItem(this, 'id')"></td>
        <td><input type="text" class="item-desc-input" list="medications-desc-list" placeholder="Descripción" onchange="autoFillItem(this, 'desc')"></td>
        <td><input type="number" value="1" style="width: 80px;"></td>
        <td><input type="text" placeholder="Lote y Fecha"></td>
        <td><i class="fas fa-trash" style="color: red; cursor: pointer;" onclick="this.parentElement.parentElement.remove()"></i></td>
    `;
    body.appendChild(row);
}

let uniqueItems = [];

function setupAutocomplete() {
    const allItems = [...inventoryData.insumos, ...inventoryData.medicamentos];
    const map = new Map();
    
    allItems.forEach(item => {
        if (!item['ID'] && !item['DESCRIPCIÓN']) return;
        const id = String(item['ID'] || '').trim();
        const desc = String(item['DESCRIPCIÓN'] || item['DESCRIPCIN'] || '').trim();
        const unit = item['UMC'] || 'PZA';
        if (id || desc) {
            map.set(id + '-' + desc, { id, desc, unit });
        }
    });
    
    uniqueItems = Array.from(map.values());
    
    const idList = document.getElementById('medications-id-list');
    const descList = document.getElementById('medications-desc-list');
    
    if (idList && descList) {
        idList.innerHTML = '';
        descList.innerHTML = '';
        
        uniqueItems.forEach(item => {
            if (item.id) {
                const opt1 = document.createElement('option');
                opt1.value = item.id;
                idList.appendChild(opt1);
            }
            if (item.desc) {
                const opt2 = document.createElement('option');
                opt2.value = item.desc;
                descList.appendChild(opt2);
            }
        });
    }
}

function autoFillItem(input, type) {
    const row = input.closest('tr');
    const idInput = row.querySelector('.item-id-input');
    const descInput = row.querySelector('.item-desc-input');
    const unitInput = row.querySelector('.item-unit-input');
    
    const val = input.value.trim().toLowerCase();
    if (!val) return;
    
    let matchedItem = null;
    if (type === 'id') {
        matchedItem = uniqueItems.find(item => item.id.toLowerCase() === val);
        if (matchedItem && descInput) descInput.value = matchedItem.desc;
    } else if (type === 'desc') {
        matchedItem = uniqueItems.find(item => item.desc.toLowerCase() === val);
        if (matchedItem && idInput) idInput.value = matchedItem.id;
    }
    
    if (matchedItem && unitInput) {
        unitInput.value = matchedItem.unit;
    }
}

function exportToExcel() {
    alert('Función de exportación a Excel activada. Generando archivo...');
}
