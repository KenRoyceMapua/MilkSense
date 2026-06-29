/* ================================================
   MAKATI MILK BANK - COMPLETE APPLICATION LOGIC
   ================================================ */

import { supabase } from './src/supabase.js';

// Current edit mode for forms
let editingId = null;
let editingType = null;

// Data structure
const db = {
  inventory: [],
  donors: [],
  beneficiaries: [],
  activity: []
};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
  console.log('App initialized');
  
  // Check authentication - redirect to login if not authenticated
  checkAuthStatus();
  
  // Initialize theme
  initializeTheme();
  
  loadDataFromStorage();
  await updateDashboard();
  markFirstNavItemActive();
  
  // Setup user menu
  setupUserMenu();
});

/* ================================================
   THEME MANAGEMENT (Light/Dark Mode)
   ================================================ */

function initializeTheme() {
  // Check if user has a saved theme preference
  const savedTheme = localStorage.getItem('milkbank_theme');
  
  // Check system preference if no saved preference
  if (!savedTheme) {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      setTheme('dark');
    } else {
      setTheme('light');
    }
  } else {
    setTheme(savedTheme);
  }
  
  // Setup toggle button
  setupThemeToggle();
}

function setTheme(theme) {
  const body = document.body;
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.querySelector('.theme-icon');
  
  if (theme === 'dark') {
    body.classList.add('dark');
    if (themeIcon) themeIcon.textContent = '🌙';
  } else {
    body.classList.remove('dark');
    if (themeIcon) themeIcon.textContent = '☀️';
  }
  
  localStorage.setItem('milkbank_theme', theme);
}

function setupThemeToggle() {
  const themeToggle = document.getElementById('themeToggle');
  
  if (themeToggle) {
    themeToggle.addEventListener('click', function() {
      const isDark = document.body.classList.contains('dark');
      const newTheme = isDark ? 'light' : 'dark';
      setTheme(newTheme);
    });
  }
}

/* ================================================
   DATA MANAGEMENT (LocalStorage)
   ================================================ */

function saveDataToStorage() {
  localStorage.setItem('milkbank_inventory', JSON.stringify(db.inventory));
  localStorage.setItem('milkbank_donors', JSON.stringify(db.donors));
  localStorage.setItem('milkbank_beneficiaries', JSON.stringify(db.beneficiaries));
  localStorage.setItem('milkbank_activity', JSON.stringify(db.activity));
}

async function loadDataFromStorage() {
  const { data: inventory } = await supabase
    .from('inventory')
    .select('*, donors(name)')
    .order('created_at', { ascending: false });
  const { data: donors } = await supabase.from('donors').select('*').order('created_at', { ascending: false });
  const { data: beneficiaries } = await supabase.from('beneficiaries').select('*').order('created_at', { ascending: false });

  db.inventory = inventory || [];
  db.donors = donors || [];
  db.beneficiaries = beneficiaries || [];

  console.log('Data loaded from Supabase:', db);
}

/* ================================================
   PAGE NAVIGATION
   ================================================ */

function switchPage(pageName) {
  // Hide all pages
  const pages = document.querySelectorAll('.page');
  pages.forEach(page => page.classList.remove('active'));

  // Show selected page
  const targetPage = document.getElementById(pageName);
  if (targetPage) {
    targetPage.classList.add('active');
    
    // Load page-specific data
    if (pageName === 'inventory') {
      loadInventoryTable();
    } else if (pageName === 'donors') {
      loadDonorsList();
    } else if (pageName === 'beneficiaries') {
      loadBeneficiariesList();
    } else if (pageName === 'reports') {
      loadReports();
    }
  }

  // Update active nav item
  updateActiveNavItem(pageName);
}

function markFirstNavItemActive() {
  const firstNavItem = document.querySelector('.nav-item');
  if (firstNavItem) {
    firstNavItem.classList.add('active');
  }
}

function updateActiveNavItem(pageName) {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => item.classList.remove('active'));

  // Find nav item that corresponds to this page
  navItems.forEach(item => {
    const match = item.textContent.trim().toLowerCase();
    if (match.includes(pageName.toLowerCase())) {
      item.classList.add('active');
    }
  });
}

/* ================================================
   MODAL MANAGEMENT
   ================================================ */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('show');
    modal.classList.remove('hidden');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('show');
    modal.classList.add('hidden');
  }
}

function showAlert(message) {
  const modal = document.getElementById('alertModal');
  const msgElement = document.getElementById('alertMessage');
  if (msgElement) msgElement.textContent = message;
  openModal('alertModal');
}

/* ================================================
   FORM: INVENTORY
   ================================================ */

function populateDonorDropdown() {
  const select = document.getElementById('invDonorName');
  if (!select) return;

  select.innerHTML = '<option value="">Select a donor...</option>';
  db.donors.forEach(donor => {
    const option = document.createElement('option');
    option.value = donor.id;
    option.textContent = donor.name;
    select.appendChild(option);
  });
}

function openInventoryForm() {
  editingId = null;
  editingType = null;
  document.getElementById('inventoryForm').reset();
  document.getElementById('inventoryModalTitle').textContent = 'Add Milk Record';
  populateDonorDropdown();
  openModal('inventoryModal');
}

function editInventory(id) {
  const item = db.inventory.find(i => i.id === id);
  if (item) {
    editingId = id;
    editingType = 'inventory';
    document.getElementById('inventoryModalTitle').textContent = 'Edit Milk Record';
    populateDonorDropdown();
    document.getElementById('invDonorName').value = item.donor_id || '';
    document.getElementById('invQuantity').value = item.volume_ml;
    document.getElementById('invStatus').value = item.status;
    openModal('inventoryModal');
  }
}

function openDispenseForm(inventoryId) {
  editingId = inventoryId;
  
  // 1. Find the item card in your active DOM to grab its maximum capacity safely
  const container = document.getElementById('inventoryList');
  const items = db?.inventory || []; 
  const currentItem = items.find(item => item.id === inventoryId);
  
  const volumeInput = document.getElementById('dispenseVolume');
  if (currentItem && volumeInput) {
    // Dynamically set safety boundaries straight on the HTML input element
    volumeInput.max = currentItem.volume_ml;
    volumeInput.placeholder = `Max ${currentItem.volume_ml} ml`;
    volumeInput.value = currentItem.volume_ml; // Defaults to full, but allows typing less
  }

  const select = document.getElementById('dispenseBeneficiary');
  select.innerHTML = '<option value="">Select a beneficiary...</option>';
  
  const beneficiaries = db?.beneficiaries || [];
  beneficiaries.forEach(b => {
    const option = document.createElement('option');
    option.value = b.id;
    option.textContent = b.baby_name || b.family_name;
    select.appendChild(option);
  });

  document.getElementById('dispenseForm').reset();
  if (currentItem && volumeInput) {
    volumeInput.value = currentItem.volume_ml; 
  }
  openModal('dispenseModal');
}

async function dispenseRecord(event) {
  event.preventDefault();

  const inventoryId = editingId;
  const beneficiaryId = document.getElementById('dispenseBeneficiary').value;
  const volume = parseInt(document.getElementById('dispenseVolume').value);

  if (!beneficiaryId || !volume || volume <= 0) {
    showAlert('⚠️ Please enter a valid volume!');
    return;
  }

  // 1. Fetch the absolute latest volume from Supabase directly to prevent matching bugs
  const { data: currentItem, error: fetchError } = await supabase
    .from('inventory')
    .select('volume_ml')
    .eq('id', inventoryId)
    .single();

  if (fetchError || !currentItem) {
    showAlert('⚠️ Error fetching current stock: ' + (fetchError?.message || 'Item not found'));
    return;
  }

  const totalAvailable = parseInt(currentItem.volume_ml);
  if (volume > totalAvailable) {
    showAlert(`⚠️ Cannot dispense more than the available ${totalAvailable}ml!`);
    return;
  }

  // 2. Calculate remaining volume safely
  const remainingVolume = totalAvailable - volume;
  const updatedStatus = remainingVolume <= 0 ? 'dispensed' : 'pasteurized';

  // 3. Update the original inventory row with the accurate remaining math
  const { error: invError } = await supabase
    .from('inventory')
    .update({ 
      volume_ml: remainingVolume,
      status: updatedStatus 
    })
    .eq('id', inventoryId);

  if (invError) { showAlert('⚠️ Error updating inventory: ' + invError.message); return; }

  // 4. Log the transaction details
  const { data: { user } } = await supabase.auth.getUser();
  const { error: logError } = await supabase
    .from('dispensing_logs')
    .insert({
      inventory_id: inventoryId,
      beneficiary_id: beneficiaryId,
      volume_ml: volume,
      dispensed_by: user?.id
    });

  if (logError) { showAlert('⚠️ Error saving log: ' + logError.message); return; }

  // 5. Update UI
  if (typeof addActivity === 'function') addActivity(`Dispensed ${volume}ml to beneficiary`);
  if (typeof loadDataFromStorage === 'function') await loadDataFromStorage();
  if (typeof loadInventoryTable === 'function') loadInventoryTable();
  
  closeModal('dispenseModal');
  if (typeof updateDashboard === 'function') await updateDashboard();
  showAlert(`✓ ${volume}ml dispensed successfully!`);
}

async function saveInventory(event) {
  event.preventDefault();

  const donorId = document.getElementById('invDonorName').value;
  const quantity = parseInt(document.getElementById('invQuantity').value);
  const status = document.getElementById('invStatus').value.toLowerCase();

  if (!donorId || !quantity || !status) {
    showAlert('⚠️ Please fill in all fields!');
    return;
  }

  if (editingId) {
    const { error } = await supabase
      .from('inventory')
      .update({ volume_ml: quantity, status, donor_id: donorId })
      .eq('id', editingId);
    if (error) { showAlert('Error: ' + error.message); return; }
  } else {
    const { error } = await supabase
      .from('inventory')
      .insert({ volume_ml: quantity, status, donor_id: donorId });
    if (error) { showAlert('Error: ' + error.message); return; }
  }

  await loadDataFromStorage();
  loadInventoryTable();
  closeModal('inventoryModal');
  await updateDashboard();
  showAlert('✓ Milk record saved successfully!');
}

async function deleteInventory(id) {
  if (confirm('Are you sure you want to delete this inventory record?')) {
    const { error } = await supabase.from('inventory').delete().eq('id', id);
    if (error) { showAlert('Error: ' + error.message); return; }
    await loadDataFromStorage();
    loadInventoryTable();
    await updateDashboard();
    showAlert('✓ Inventory record deleted!');
  }
}

function loadInventoryTable() {
  const container = document.getElementById('inventoryList');
  const badge = document.getElementById('stockCountBadge');
  
  if (!container) return;
  container.innerHTML = '';

  if (db.inventory.length === 0) {
    container.innerHTML = '<p class="empty-state">No inventory records. Add one to get started!</p>';
    if (badge) badge.textContent = '0 items';
    return;
  }

  if (badge) badge.textContent = db.inventory.length + ' items';

  db.inventory.forEach(item => {
    const card = document.createElement('div');
    card.className = 'inventory-item-card';

    let statusClass = 'status-fresh';
    let barWidth = '100%';
    let icon = '🍼'; 
    let timeText = 'Fresh donation';

    if (item.status === 'pasteurized') {
      statusClass = 'status-pasteurized';
      barWidth = '50%';
      icon = '❄️';
      timeText = 'Ready for dispensing';
    } else if (item.status === 'dispensed') {
      statusClass = 'status-dispensed';
      barWidth = '0%';
      icon = '📦';
      timeText = 'Distributed to beneficiary';
    }

    const dateAdded = new Date(item.created_at).toLocaleDateString();

    card.innerHTML = `
      <div class="inv-card-icon">${icon}</div>
      <div class="inv-card-content">
        <div class="inv-card-header">
          <span class="inv-donor-name">${item.donors?.name || 'Unknown donor'}</span>
          <span class="inv-badge ${statusClass}">${item.status}</span>
        </div>
        <div class="inv-card-details">
          ${item.volume_ml} ml • Added ${dateAdded}
        </div>
        <div class="inv-progress-container">
          <div class="inv-progress-bar ${statusClass}-bar" style="width: ${barWidth};"></div>
        </div>
        <div class="inv-card-footer">
          <span class="inv-time-text">${timeText}</span>
          <div class="inv-actions">
            ${item.status === 'pasteurized' ? `<button class="btn-text" onclick="openDispenseForm('${item.id}')">Dispense</button>` : ''}
            <button class="btn-text" onclick="editInventory('${item.id}')">Edit</button>
            <button class="btn-text text-danger" onclick="deleteInventory('${item.id}')">Delete</button>
          </div>
        </div>
      </div>
    `;
    container.appendChild(card);
  });
}

/* ================================================
   FORM: DONOR
   ================================================ */

function openDonorForm() {
  editingId = null;
  editingType = null;
  document.getElementById('donorForm').reset();
  document.getElementById('donorModalTitle').textContent = 'Register Donor';
  openModal('donorModal');
}

function editDonor(id) {
  const donor = db.donors.find(d => d.id === id);
  if (donor) {
    editingId = id;
    editingType = 'donor';
    document.getElementById('donorModalTitle').textContent = 'Edit Donor';
    document.getElementById('donorName').value = donor.name;
    document.getElementById('donorPhone').value = donor.phone;
    document.getElementById('donorBloodType').value = donor.bloodType || '';
    document.getElementById('donorEmail').value = donor.email || '';
    openModal('donorModal');
  }
}

async function saveDonor(event) {
  event.preventDefault();

  const name = document.getElementById('donorName').value.trim();
  const phone = document.getElementById('donorPhone').value.trim();
  const email = document.getElementById('donorEmail').value.trim();
  const bloodType = document.getElementById('donorBloodType').value;

  if (!name || !phone) {
    showAlert('⚠️ Please fill in required fields!');
    return;
  }

  if (editingId) {
    const { error } = await supabase
      .from('donors')
      .update({ name, contact_number: phone, email, blood_type: bloodType })
      .eq('id', editingId);

    if (error) { showAlert('⚠️ Error: ' + error.message); return; }
    addActivity(`Updated donor: ${name}`);
  } else {
    const { error } = await supabase
      .from('donors')
      .insert({ name, contact_number: phone, email, blood_type: bloodType });

    if (error) { showAlert('⚠️ Error: ' + error.message); return; }
    addActivity(`Registered new donor: ${name}`);
  }

  await loadDataFromStorage();
  loadDonorsList();
  closeModal('donorModal');
  await updateDashboard();
  showAlert('✓ Donor registered successfully!');
}

async function deleteDonor(id) {
  if (confirm('Are you sure you want to delete this donor?')) {
    const { error } = await supabase.from('donors').delete().eq('id', id);
    if (error) { showAlert('⚠️ Error: ' + error.message); return; }

    addActivity(`Deleted donor`);
    await loadDataFromStorage();
    loadDonorsList();
    await updateDashboard();
    showAlert('✓ Donor deleted!');
  }
}

function loadDonorsList() {
  const container = document.getElementById('donorsList');
  container.innerHTML = '';

  if (db.donors.length === 0) {
    container.innerHTML = '<p class="empty-state" style="grid-column: 1/-1;">No donors registered yet. Add one to get started!</p>';
    return;
  }

  db.donors.forEach(donor => {
    const card = document.createElement('div');
    card.className = 'donor-card';
    card.innerHTML = `
      <h4>${donor.name}</h4>
      <p><strong>Phone:</strong> ${donor.contact_number || 'N/A'}</p>
      <p><strong>Email:</strong> ${donor.email || 'N/A'}</p>
      <p><strong>Blood Type:</strong> ${donor.blood_type || 'N/A'}</p>
      <p class="last-donation">Registered: ${new Date(donor.created_at).toLocaleDateString()}</p>
      <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
        <button class="btn-small" onclick="editDonor('${donor.id}')">Edit</button>
        <button class="btn-small" onclick="deleteDonor('${donor.id}')" style="background: #ef4444;">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

/* ================================================
   FORM: BENEFICIARY
   ================================================ */

function openBeneficiaryForm() {
  editingId = null;
  editingType = null;
  document.getElementById('beneficiaryForm').reset();
  document.getElementById('beneficiaryModalTitle').textContent = 'Register Beneficiary';
  openModal('beneficiaryModal');
}

function editBeneficiary(id) {
  const b = db.beneficiaries.find(x => x.id === id);
  if (b) {
    editingId = id;
    editingType = 'beneficiary';
    document.getElementById('beneficiaryModalTitle').textContent = 'Edit Beneficiary';
    document.getElementById('childName').value = b.baby_name || '';
    document.getElementById('motherName').value = b.family_name || '';
    document.getElementById('contactPhone').value = b.contact_number || '';
    document.getElementById('childAge').value = b.child_age || '';
    document.getElementById('medicalNotes').value = b.medical_notes || '';
    openModal('beneficiaryModal');
  }
}

async function saveBeneficiary(event) {
  event.preventDefault();

  const childName = document.getElementById('childName').value.trim();
  const motherName = document.getElementById('motherName').value.trim();
  const contactPhone = document.getElementById('contactPhone').value.trim();
  const childAge = parseInt(document.getElementById('childAge').value);
  const medicalNotes = document.getElementById('medicalNotes').value.trim();

  if (!childName || !motherName || !contactPhone || !childAge) {
    showAlert('⚠️ Please fill in all required fields!');
    return;
  }

  if (editingId) {
    const { error } = await supabase
      .from('beneficiaries')
      .update({
        baby_name: childName,
        family_name: motherName,
        contact_number: contactPhone,
        child_age: childAge,
        medical_notes: medicalNotes
      })
      .eq('id', editingId);

    if (error) { showAlert('⚠️ Error: ' + error.message); return; }
    addActivity(`Updated beneficiary: ${childName}`);
  } else {
    const { error } = await supabase
      .from('beneficiaries')
      .insert({
        baby_name: childName,
        family_name: motherName,
        contact_number: contactPhone,
        child_age: childAge,
        medical_notes: medicalNotes
      });

    if (error) { showAlert('⚠️ Error: ' + error.message); return; }
    addActivity(`Registered beneficiary: ${childName} (Mother: ${motherName})`);
  }

  await loadDataFromStorage();
  loadBeneficiariesList();
  closeModal('beneficiaryModal');
  await updateDashboard();
  showAlert('✓ Beneficiary registered successfully!');
}

async function deleteBeneficiary(id) {
  if (confirm('Are you sure you want to delete this beneficiary?')) {
    const { error } = await supabase.from('beneficiaries').delete().eq('id', id);
    if (error) { showAlert('⚠️ Error: ' + error.message); return; }

    addActivity(`Deleted beneficiary`);
    await loadDataFromStorage();
    loadBeneficiariesList();
    await updateDashboard();
    showAlert('✓ Beneficiary deleted!');
  }
}

function loadBeneficiariesList() {
  const container = document.getElementById('beneficiariesList');
  container.innerHTML = '';

  if (db.beneficiaries.length === 0) {
    container.innerHTML = '<p class="empty-state" style="grid-column: 1/-1;">No beneficiaries registered yet. Add one to get started!</p>';
    return;
  }

  db.beneficiaries.forEach(b => {
    const card = document.createElement('div');
    card.className = 'beneficiary-card';
    card.innerHTML = `
      <div class="card-header">
        <h4>${b.baby_name || 'Unnamed'}</h4>
        <span class="status-badge">${b.is_active ? 'Active' : 'Inactive'}</span>
      </div>
      <p><strong>Mother:</strong> ${b.family_name}</p>
      <p><strong>Phone:</strong> ${b.contact_number || 'N/A'}</p>
      <p><strong>Age:</strong> ${b.child_age || 'N/A'} months</p>
      ${b.medical_notes ? `<p><strong>Notes:</strong> ${b.medical_notes}</p>` : ''}
      <div style="margin-top: 1rem; display: flex; gap: 0.5rem;">
        <button class="btn-small" onclick="editBeneficiary('${b.id}')">Edit</button>
        <button class="btn-small" onclick="deleteBeneficiary('${b.id}')" style="background: #ef4444;">Delete</button>
      </div>
    `;
    container.appendChild(card);
  });
}

/* ================================================
   DASHBOARD UPDATES
   ================================================ */

async function updateDashboard() {
  // CHANGED: Instead of relying on local db arrays (which are empty on login/refresh),
  // we fetch live, fresh data directly from all Supabase tables.
  const { data: currentInv } = await supabase.from('inventory').select('volume_ml, status');
  const { data: currentDonors } = await supabase.from('donors').select('id');
  const { data: currentBen } = await supabase.from('beneficiaries').select('id');
  const { data: logs } = await supabase.from('dispensing_logs').select('volume_ml');

  const inventoryItems = currentInv || [];

  // CHANGED: Calculates total from live Supabase records instead of db.inventory
  const totalMilk = inventoryItems.reduce((sum, item) => sum + Number(item.volume_ml || 0), 0);
  
  // CHANGED: Calculates counts from live Supabase tables instead of db lengths
  const totalDonors = currentDonors ? currentDonors.length : 0;
  const totalBeneficiaries = currentBen ? currentBen.length : 0;
  const totalDistributed = logs ? logs.reduce((sum, log) => sum + Number(log.volume_ml || 0), 0) : 0;

  document.getElementById('totalMilk').textContent = totalMilk;
  document.getElementById('totalDonors').textContent = totalDonors;
  document.getElementById('totalBeneficiaries').textContent = totalBeneficiaries;
  document.getElementById('totalDistributed').textContent = totalDistributed;

  // CHANGED: Filters the live inventoryItems variable instead of empty local db
  const freshMilk = inventoryItems
    .filter(item => item.status === 'fresh')
    .reduce((sum, item) => sum + Number(item.volume_ml || 0), 0);
  const pasteurizedMilk = inventoryItems
    .filter(item => item.status === 'pasteurized')
    .reduce((sum, item) => sum + Number(item.volume_ml || 0), 0);
  
  const dispensedMilk = totalDistributed;

  document.getElementById('statusFresh').textContent = freshMilk + ' ml';
  document.getElementById('statusPasteurized').textContent = pasteurizedMilk + ' ml';
  document.getElementById('statusDispensed').textContent = dispensedMilk + ' ml';

  const maxMilk = Math.max(freshMilk, pasteurizedMilk, dispensedMilk) || 100;
  document.getElementById('barFresh').style.width = ((freshMilk / maxMilk) * 100) + '%';
  document.getElementById('barPasteurized').style.width = ((pasteurizedMilk / maxMilk) * 100) + '%';
  document.getElementById('barDispensed').style.width = ((dispensedMilk / maxMilk) * 100) + '%';

  await updateRecentActivity();
}

async function updateRecentActivity() {
  const container = document.getElementById('recentActivity');
  container.innerHTML = '';

  const { data: activity } = await supabase
    .from('activity_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(8);

  if (!activity || activity.length === 0) {
    container.innerHTML = '<p class="empty-state">No activity yet</p>';
    return;
  }

  activity.forEach(item => {
    const el = document.createElement('div');
    el.className = 'activity-item';
    const iconMap = {
      'Added': '➕', 'Updated': '✏️', 'Deleted': '🗑️', 'Registered': '📝', 'Distributed': '📦'
    };
    const icon = Object.keys(iconMap).find(key => item.message.includes(key))
      ? iconMap[Object.keys(iconMap).find(key => item.message.includes(key))]
      : '📌';

    el.innerHTML = `
      <div class="activity-icon">${icon}</div>
      <div class="activity-details">
        <p class="activity-title">${item.message}</p>
        <p class="activity-meta">${new Date(item.created_at).toLocaleString()}</p>
      </div>
    `;
    container.appendChild(el);
  });
}

async function addActivity(message) {
  const { error } = await supabase.from('activity_log').insert({ message });
  if (error) console.error('Activity log error:', error);
}

/* ================================================
   REPORTS
   ================================================ */

async function loadReports() {
  // FIX: Fetch total volume directly from dispensing logs so partial dispenses display accurately
  const { data: logs } = await supabase.from('dispensing_logs').select('volume_ml');
  const totalDistributed = logs ? logs.reduce((sum, log) => sum + Number(log.volume_ml || 0), 0) : 0;

  const totalDonated = db.inventory.reduce((sum, item) => sum + Number(item.volume_ml || 0), 0) + totalDistributed;
  const currentStock = totalDonated - totalDistributed;
  const activeDonors = db.donors.length;

  document.getElementById('reportDonated').textContent = totalDonated + ' ml';
  document.getElementById('reportDistributed').textContent = totalDistributed + ' ml';
  document.getElementById('reportStock').textContent = currentStock + ' ml';
  document.getElementById('reportActiveDonors').textContent = activeDonors;
}

function generateReport(type) {
  const totalDonated = db.inventory.reduce((sum, item) => sum + Number(item.volume_ml || 0), 0);
  const freshMilk = db.inventory
    .filter(item => item.status === 'fresh')
    .reduce((sum, item) => sum + Number(item.volume_ml || 0), 0);
  const totalBeneficiaries = db.beneficiaries.length;

  let message = `${type.charAt(0).toUpperCase() + type.slice(1)} Report Generated!\n\n`;
  message += `Total Donations: ${totalDonated} ml\n`;
  message += `Fresh Milk: ${freshMilk} ml\n`;
  message += `Active Beneficiaries: ${totalBeneficiaries}\n`;
  message += `Active Donors: ${db.donors.length}\n`;

  showAlert(message);
}

/* ================================================
   ACCESSIBILITY & GLOBAL FUNCTIONS
   ================================================ */

// Make functions globally accessible

/* ================================================
   AUTHENTICATION & SESSION MANAGEMENT
   ================================================ */

async function checkAuthStatus() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'signin.html';
  }
}

function handleLogout() {
  // Confirm logout with user
  if (confirm('Are you sure you want to logout?')) {
    // Clear authentication session
    localStorage.removeItem('isLoggedIn');
    
    // Log the logout action
    console.log('User logged out at', new Date().toLocaleTimeString());
    
    // Redirect to login page
    window.location.href = 'signin.html';
  }
}

function setupUserMenu() {
  const userMenuTrigger = document.getElementById('userMenuTrigger');
  const userMenuDropdown = document.getElementById('userMenuDropdown');
  
  if (userMenuTrigger && userMenuDropdown) {
    // Toggle dropdown on click
    userMenuTrigger.addEventListener('click', function(e) {
      e.stopPropagation();
      userMenuDropdown.classList.toggle('show');
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!userMenuTrigger.contains(e.target) && !userMenuDropdown.contains(e.target)) {
        userMenuDropdown.classList.remove('show');
      }
    });
    
    // Close dropdown when menu item is clicked (will happen via handleLogout)
    const menuItems = userMenuDropdown.querySelectorAll('.menu-item');
    menuItems.forEach(item => {
      item.addEventListener('click', function() {
        setTimeout(() => {
          userMenuDropdown.classList.remove('show');
        }, 100);
      });
    });
  }
}

// Make functions globally accessible
window.switchPage = switchPage;
window.openModal = openModal;
window.closeModal = closeModal;
window.showAlert = showAlert;
window.openInventoryForm = openInventoryForm;
window.editInventory = editInventory;
window.deleteInventory = deleteInventory;
window.openDonorForm = openDonorForm;
window.editDonor = editDonor;
window.deleteDonor = deleteDonor;
window.openBeneficiaryForm = openBeneficiaryForm;
window.editBeneficiary = editBeneficiary;
window.deleteBeneficiary = deleteBeneficiary;
window.loadReports = loadReports;
window.generateReport = generateReport;
window.saveInventory = saveInventory;
window.saveDonor = saveDonor;
window.saveBeneficiary = saveBeneficiary;
window.handleLogout = handleLogout;
window.checkAuthStatus = checkAuthStatus;
window.setupUserMenu = setupUserMenu;
window.openDispenseForm = openDispenseForm;
window.dispenseRecord = dispenseRecord;

console.log('✓ Makati Milk Bank System Ready');