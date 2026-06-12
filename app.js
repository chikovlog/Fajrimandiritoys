// --- STATE & DATA UTAMA ---
let currentUser = null;
let theme = localStorage.getItem('theme') || 'light';
let receiptWidthFormat = '58mm';

let activeFilterStartDate = null;
let activeFilterEndDate = null;
let currentAuthRoleSelection = "OWNER"; 

// Data Akses Utama Akun Owner (Kunci Mati)
const ownerAccount = {
    username: "Owner_Irsyad",
    password: "Cidalung"
};

let cashiers = JSON.parse(localStorage.getItem('pos_cashiers')) || [];

let receiptConfig = JSON.parse(localStorage.getItem('pos_receipt_config')) || {
    storeName: 'KASIR FAJRI TOYS',
    slogan: 'Pusat Retail Mainan & Elektronik',
    address: 'Cikalong, Jawa Barat',
    footer: 'TERIMA KASIH'
};

let products = JSON.parse(localStorage.getItem('pos_products')) || [
    { id: 'SKU-001', name: 'Pistol Mainan anak', hpp: 90000, price: 125000, stock: 10 },
    { id: 'SKU-002', name: 'Deterjen Cair Premium', hpp: 15000, price: 25000, stock: 50 },
    { id: 'SKU-003', name: 'Meja TV Minimalis', hpp: 250000, price: 400000, stock: 10 },
    { id: 'SKU-004', name: 'Kipas Angin Berdiri', hpp: 120000, price: 180000, stock: 15 }
];

let cart = [];
let transactions = JSON.parse(localStorage.getItem('pos_transactions')) || [];

// --- UTILS & FORMATTING ---
const Toast = Swal.mixin({
    shadow: true, toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, timerProgressBar: true
});

const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(theme);
    checkLoginSession();
    setupEventListeners();
    renderReceiptPreview();
});

const applyTheme = (currentTheme) => {
    const html = document.documentElement;
    const icon = document.getElementById('themeIcon');
    if (currentTheme === 'dark') { html.classList.add('dark'); icon.classList.replace('fa-moon', 'fa-sun'); }
    else { html.classList.remove('dark'); icon.classList.replace('fa-sun', 'fa-moon'); }
};

document.getElementById('themeToggle').addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    applyTheme(theme);
});

// --- ENGINE TAB SWITCHER LOGIN FORM ---
const handleTabSwitch = (role) => {
    currentAuthRoleSelection = role;
    const tabOwner = document.getElementById('tabOwner');
    const tabKasir = document.getElementById('tabKasir');
    const labelUser = document.getElementById('labelUsername');
    const inputUser = document.getElementById('authUsername');

    if (role === 'OWNER') {
        tabOwner.className = "flex-1 pb-3 border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 transition";
        tabKasir.className = "flex-1 pb-3 border-b-2 border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition";
        labelUser.innerText = "Username Owner";
        inputUser.placeholder = "Masukkan username owner...";
    } else {
        tabKasir.className = "flex-1 pb-3 border-b-2 border-blue-600 text-blue-600 dark:text-blue-400 transition";
        tabOwner.className = "flex-1 pb-3 border-b-2 border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition";
        labelUser.innerText = "Nama / Username Kasir";
        inputUser.placeholder = "Masukkan nama kasir terdaftar...";
    }
};

document.getElementById('authForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const inputUser = document.getElementById('authUsername').value.trim();
    const inputPass = document.getElementById('authPassword').value;

    if (currentAuthRoleSelection === "OWNER") {
        if (inputUser === ownerAccount.username && inputPass === ownerAccount.password) {
            loginSuccess({ username: ownerAccount.username, role: 'owner' });
        } else {
            Swal.fire({ icon: 'error', title: 'Akses Ditolak', text: 'Username atau Password Owner Salah!' });
        }
    } else {
        const matchedKasir = cashiers.find(k => k.realName === inputUser && k.password === inputPass);
        if (matchedKasir) {
            loginSuccess({ username: matchedKasir.realName, role: 'kasir' });
        } else {
            Swal.fire({ icon: 'error', title: 'Gagal Masuk', text: 'Nama Kasir belum terdaftar atau Password salah!' });
        }
    }
});

const loginSuccess = (userObj) => {
    currentUser = userObj;
    sessionStorage.setItem('pos_user', JSON.stringify(currentUser));
    document.getElementById('authForm').reset();
    renderApp();
};

const checkLoginSession = () => {
    const sessionUser = sessionStorage.getItem('pos_user');
    if (sessionUser) { currentUser = JSON.parse(sessionUser); renderApp(); }
};

document.getElementById('logoutBtn').addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('pos_user');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('userMenu').classList.add('hidden');
    handleTabSwitch('OWNER'); 
});

const renderApp = () => {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('userMenu').classList.remove('hidden');
    document.getElementById('userNameDisplay').innerText = `Halo, ${currentUser.username}`;

    const ownerMenus = document.getElementById('ownerMenus');
    if (currentUser.role === 'owner') { ownerMenus.classList.remove('hidden'); }
    else { ownerMenus.classList.add('hidden'); }

    switchView('view-kasir');
    updateAllViews();
};

// --- SET UP LISTENERS GLOBAL ---
const setupEventListeners = () => {
    document.getElementById('tabOwner').addEventListener('click', () => handleTabSwitch('OWNER'));
    document.getElementById('tabKasir').addEventListener('click', () => handleTabSwitch('KASIR'));

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            switchView(target);
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('bg-blue-50', 'dark:bg-gray-700', 'text-blue-600', 'dark:text-blue-400');
            });
            e.currentTarget.classList.add('bg-blue-50', 'dark:bg-gray-700', 'text-blue-600', 'dark:text-blue-400');
        });
    });

    document.getElementById('searchProduct').addEventListener('input', (e) => renderProducts(e.target.value));
    document.getElementById('uangBayar').addEventListener('input', () => { calculateChange(); renderReceiptPreview(); });
    document.getElementById('diskonTrx').addEventListener('input', () => { updateCartUI(); renderReceiptPreview(); });
    
    document.getElementById('custName').addEventListener('input', renderReceiptPreview);
    document.getElementById('custPhone').addEventListener('input', renderReceiptPreview);
    document.getElementById('custAddress').addEventListener('input', renderReceiptPreview);

    document.getElementById('btnCheckout').addEventListener('click', processCheckout);
    document.getElementById('formBarang').addEventListener('submit', saveProduct);
    document.getElementById('btnResetForm').addEventListener('click', resetProductForm);
    document.getElementById('btnResetLaporan').addEventListener('click', secureResetLaporan);
    
    document.getElementById('btnFormat58').addEventListener('click', () => switchReceiptFormat('58mm'));
    document.getElementById('btnFormat80').addEventListener('click', () => switchReceiptFormat('80mm'));
    document.getElementById('btnPrintLive').addEventListener('click', executeBypassPrint);

    document.getElementById('btnOpenReceiptModal').addEventListener('click', () => {
        document.getElementById('receiptModal').classList.remove('hidden');
    });
    document.getElementById('btnCloseReceiptModal').addEventListener('click', () => {
        document.getElementById('receiptModal').classList.add('hidden');
    });

    document.getElementById('itemHpp').addEventListener('input', calculateInputBarangMargin);
    document.getElementById('itemPrice').addEventListener('input', calculateInputBarangMargin);
    document.getElementById('formPengaturanNota').addEventListener('submit', saveReceiptConfig);

    document.getElementById('btnApplyDateFilter').addEventListener('click', applyDashboardDateFilter);
    document.getElementById('btnClearDateFilter').addEventListener('click', clearDashboardDateFilter);
    
    document.getElementById('btnExportExcel').addEventListener('click', exportToExcel);
    document.getElementById('btnExportPdf').addEventListener('click', exportToPDF);
    document.getElementById('btnCaptureKasir').addEventListener('click', executeKasirScreenCapture);
    document.getElementById('formTambahKasir').addEventListener('submit', createCashierAccount);
};

const switchView = (viewId) => {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    if(viewId === 'view-laporan') calculateDashboard();
    if(viewId === 'view-pengaturan') renderPengaturanForm(); 
    if(viewId === 'view-kelola-kasir-toko') renderKasirManagementTable(); 
};

const updateAllViews = () => {
    renderProducts();
    renderStok();
    renderKelolaBarang();
    renderKasirHistory(); 
};

// --- MANAGEMENT KASIR ---
const createCashierAccount = (e) => {
    e.preventDefault();
    const rName = document.getElementById('kasirRealName').value.trim();
    const customPass = document.getElementById('kasirCustomPass').value;

    if (cashiers.some(k => k.realName.toLowerCase() === rName.toLowerCase()) || rName === ownerAccount.username) {
        return Swal.fire({ icon: 'error', text: 'Nama Kasir tersebut sudah terdaftar, gunakan nama lain!' });
    }

    const newKasirObj = { realName: rName, password: customPass };
    cashiers.push(newKasirObj);
    localStorage.setItem('pos_cashiers', JSON.stringify(cashiers));

    document.getElementById('formTambahKasir').reset();
    renderKasirManagementTable();
    Swal.fire({ icon: 'success', text: 'Akses Anggota Kasir Baru Berhasil Dibuat!' });
};

const renderKasirManagementTable = () => {
    const tbody = document.getElementById('kasirTokoTableBody');
    if(!tbody) return; tbody.innerHTML = '';
    if (cashiers.length === 0) {
        tbody.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-gray-400 italic">Belum ada anggota kasir terdaftar</td></tr>`;
        return;
    }
    cashiers.forEach((k, idx) => {
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 text-xs">
                <td class="p-3 border-b dark:border-gray-600 font-bold text-blue-500">${k.realName}</td>
                <td class="p-3 border-b dark:border-gray-600 font-mono select-none">
                    <span id="kasirPassText-${idx}">••••••</span>
                    <button type="button" onclick="toggleKasierPasswordView(${idx})" class="ml-2 text-gray-400 hover:text-blue-500 transition focus:outline-none">
                        <i class="fas fa-eye text-[11px]" id="kasirPassIcon-${idx}"></i>
                    </button>
                </td>
                <td class="p-3 border-b dark:border-gray-600 text-right">
                    <button onclick="deleteCashierAccount(${idx})" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md text-xs transition"><i class="fas fa-trash-alt"></i> Hapus Akses</button>
                </td>
            </tr>`;
    });
};

window.toggleKasierPasswordView = (idx) => {
    const textEl = document.getElementById(`kasirPassText-${idx}`);
    const iconEl = document.getElementById(`kasirPassIcon-${idx}`);
    const realPassword = cashiers[idx].password;

    if (textEl.innerText === "••••••") {
        textEl.innerText = realPassword;
        iconEl.classList.replace("fa-eye", "fa-eye-slash");
    } else {
        textEl.innerText = "••••••";
        iconEl.classList.replace("fa-eye-slash", "fa-eye");
    }
};

window.deleteCashierAccount = (idx) => {
    Swal.fire({ title: 'Hapus Akses?', text: 'Akun kasir ini tidak akan bisa login lagi.', icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33' }).then((res) => {
        if (res.isConfirmed) {
            cashiers.splice(idx, 1); localStorage.setItem('pos_cashiers', JSON.stringify(cashiers));
            renderKasirManagementTable(); updateAllViews();
        }
    });
};

// --- SCREEN CAPTURE MIRROR ---
const executeKasirScreenCapture = () => {
    const todayStr = new Date().toLocaleDateString('id-ID'); const todayTrxCheck = transactions.filter(t => t.date.includes(todayStr));
    if (todayTrxCheck.length === 0) return Swal.fire({ icon: 'warning', text: 'Belum ada data penjualan hari ini!' });
    Toast.fire({ icon: 'info', title: 'Memotret laporan harian...' });
    const originalArea = document.getElementById('captureTargetArea'); const isDark = document.documentElement.classList.contains('dark');
    const virtualClone = originalArea.cloneNode(true);
    virtualClone.style.position = "fixed"; virtualClone.style.top = "-9999px"; virtualClone.style.left = "-9999px"; virtualClone.style.width = "420px"; virtualClone.style.height = "auto"; virtualClone.style.maxHeight = "none"; virtualClone.style.overflow = "visible";
    const internalScrollList = virtualClone.querySelector('#kasirHistoryList'); if (internalScrollList) { internalScrollList.style.maxHeight = "none"; internalScrollList.style.overflow = "visible"; internalScrollList.style.height = "auto"; }
    document.body.appendChild(virtualClone);
    html2canvas(virtualClone, { backgroundColor: isDark ? '#1f2937' : '#ffffff', scale: 2.5, useCORS: true, logging: false }).then(canvas => {
        const downloadLink = document.createElement('a'); downloadLink.download = `Laporan_Kasir_FajriToys_${Date.now()}.png`; downloadLink.href = canvas.toDataURL('image/png'); downloadLink.click();
        document.body.removeChild(virtualClone); Toast.fire({ icon: 'success', title: 'Gambar diunduh!' });
    }).catch(err => { if(document.body.contains(virtualClone)) document.body.removeChild(virtualClone); });
};

// --- POS ENGINE ---
const renderProducts = (searchQuery = '') => {
    const list = document.getElementById('productList'); list.innerHTML = '';
    const filtered = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase()));
    filtered.forEach(p => {
        const div = document.createElement('div');
        div.className = `p-3 border rounded-xl cursor-pointer transition transform hover:scale-105 select-none ${p.stock <= 0 ? 'bg-red-50 border-red-200 opacity-60' : 'bg-gray-50 dark:bg-gray-700 dark:border-gray-600 hover:border-blue-500'}`;
        div.innerHTML = `
            <div class="text-[10px] text-gray-400 font-mono">${p.id}</div>
            <div class="font-bold text-xs line-clamp-2 min-h-[32px]">${p.name}</div>
            <div class="text-blue-500 font-bold text-sm mt-1">${formatRupiah(p.price)}</div>
            <div class="text-[10px] text-gray-400">Stok: ${p.stock}</div>`;
        if(p.stock > 0) div.onclick = () => addToCart(p);
        list.appendChild(div);
    });
};

const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) { if (existing.qty >= product.stock) return Toast.fire({ icon: 'warning', title: 'Stok terbatas!' }); existing.qty++; } 
    else { cart.push({ ...product, qty: 1 }); }
    updateCartUI(); renderReceiptPreview();
};

const updateCartUI = () => {
    const container = document.getElementById('cartItems'); container.innerHTML = ''; let subtotal = 0;
    if (cart.length === 0) { container.innerHTML = `<div class="text-center text-gray-400 mt-10 text-sm">Keranjang kosong</div>`; } 
    else {
        cart.forEach((item, idx) => {
            subtotal += item.price * item.qty; let currentMarginPct = Math.round(((item.price - item.hpp) / item.hpp) * 100);
            container.innerHTML += `
                <div class="p-3 bg-gray-50 dark:bg-gray-700/60 rounded-xl border dark:border-gray-600 space-y-2 text-xs">
                    <div class="flex justify-between items-start gap-2">
                        <div class="w-4/5"><h4 class="font-bold truncate">${item.name}</h4></div>
                        <button onclick="removeCartItem(${idx})" class="text-red-400 text-xs"><i class="fas fa-trash"></i></button>
                    </div>
                    <div class="grid grid-cols-2 gap-2 bg-white dark:bg-gray-800 p-2 rounded-lg border text-[11px]">
                        <div><span class="block text-[9px] text-gray-400">Harga Jual (Rp)</span><input type="number" value="${item.price}" onchange="updateCartItemPrice(${idx}, this.value, 'price')" class="w-full bg-transparent font-bold text-blue-500 outline-none"></div>
                        <div><span class="block text-[9px] text-gray-400">Margin (%)</span><input type="number" value="${currentMarginPct}" onchange="updateCartItemPrice(${idx}, this.value, 'margin')" class="w-full bg-transparent font-bold text-purple-500 outline-none"></div>
                    </div>
                    <div class="flex justify-between items-center pt-2 border-t border-dashed dark:border-gray-600 mt-1">
                        <div class="flex items-center bg-gray-200 dark:bg-gray-600 rounded-lg p-0.5 font-black">
                            <button type="button" onclick="changeQty(${idx}, -1)" class="w-7 h-7 bg-white dark:bg-gray-700 rounded-md text-center text-red-500 shadow-sm font-bold text-sm active:scale-95 transition">-</button>
                            <span class="font-black text-sm px-3 min-w-[28px] text-center">${item.qty}</span>
                            <button type="button" onclick="changeQty(${idx}, 1)" class="w-7 h-7 bg-white dark:bg-gray-700 rounded-md text-center text-green-600 shadow-sm font-bold text-sm active:scale-95 transition">+</button>
                        </div>
                        <span class="font-bold text-gray-700 dark:text-gray-200">${formatRupiah(item.price * item.qty)}</span>
                    </div>
                </div>`;
        });
    }
    let diskon = parseInt(document.getElementById('diskonTrx').value || 0); let totalAkhir = Math.max(0, subtotal - diskon);
    document.getElementById('cartSubtotal').innerText = formatRupiah(subtotal); document.getElementById('cartTotal').innerText = formatRupiah(totalAkhir);
    document.getElementById('cartTotal').setAttribute('data-subtotal', subtotal); document.getElementById('cartTotal').setAttribute('data-total', totalAkhir);
    calculateChange();
};

window.changeQty = (idx, delta) => { 
    let item = cart[idx]; 
    let prod = products.find(p => p.id === item.id); 
    item.qty += delta; 
    if(item.qty > prod.stock) { item.qty = prod.stock; Toast.fire({icon:'warning', title:'Batas maksimum stok barang tercapai!'}); } 
    if(item.qty <= 0) cart.splice(idx, 1); 
    updateCartUI(); 
    renderReceiptPreview(); 
};

window.updateCartItemPrice = (index, value, fieldType) => {
    let item = cart[index]; let num = parseFloat(value) || 0; let minPriceAllowed = Math.ceil(item.hpp * 1.30);
    if (fieldType === 'price') {
        if (num < minPriceAllowed) { Toast.fire({ icon: 'warning', title: 'Harga dikunci otomatis ke untung minimal 30%!' }); item.price = minPriceAllowed; } 
        else { item.price = Math.ceil(num); }
    } else if (fieldType === 'margin') {
        if (num < 30) { Toast.fire({ icon: 'warning', title: 'Keuntungan minimal diatur sistem sebesar 30%.' }); num = 30; }
        item.price = Math.ceil(item.hpp * (1 + (num / 100)));
    }
    updateCartUI(); renderReceiptPreview();
};

const calculateChange = () => {
    let total = parseInt(document.getElementById('cartTotal').getAttribute('data-total') || 0); let bayar = parseInt(document.getElementById('uangBayar').value || 0);
    let kembali = bayar - total; let el = document.getElementById('uangKembali');
    if (bayar > 0 && kembali >= 0) { el.innerText = formatRupiah(kembali); el.className = 'font-bold text-green-500 text-sm'; } 
    else if (bayar > 0 && kembali < 0) { el.innerText = 'Uang Kurang!'; el.className = 'font-bold text-red-500 text-sm'; } 
    else { el.innerText = 'Rp 0'; el.className = 'font-bold text-gray-500 text-sm'; }
};

const renderReceiptPreview = () => {
    const paper = document.getElementById('thermalPaper'); if(!paper) return;
    const cName = document.getElementById('custName').value.trim() || '-'; const cPhone = document.getElementById('custPhone').value.trim() || '-'; const cAddr = document.getElementById('custAddress').value.trim() || '-';
    const diskon = parseInt(document.getElementById('diskonTrx').value || 0); const bayar = parseInt(document.getElementById('uangBayar').value || 0);
    const subtotal = parseInt(document.getElementById('cartTotal').getAttribute('data-subtotal') || 0); const total = parseInt(document.getElementById('cartTotal').getAttribute('data-total') || 0); const kembali = Math.max(0, bayar - total);
    const maxChars = (receiptWidthFormat === '58mm') ? 32 : 48; const makeLine = (char = '-') => char.repeat(maxChars); const fillSpace = (left, right) => { let length = maxChars - (left.length + right.length); return left + " ".repeat(length > 0 ? length : 1) + right; };

    let receiptTxt = `<div class="text-center font-bold text-sm uppercase">${receiptConfig.storeName}</div>`;
    if(receiptConfig.slogan) receiptTxt += `<div class="text-center text-[10px]">${receiptConfig.slogan}</div>`;
    if(receiptConfig.address) receiptTxt += `<div class="text-center text-[10px] mb-2">${receiptConfig.address}</div>`;
    receiptTxt += `<div>${makeLine('.')}</div>`;
    receiptTxt += `<div class="text-[10px]">${fillSpace('Waktu Nota:', new Date().toLocaleDateString('id-ID'))}</div>`;
    receiptTxt += `<div class="text-[10px]">${fillSpace('Kasir Operator:', currentUser ? currentUser.username.toUpperCase() : 'SYSTEM')}</div>`;
    
    if (cName !== '-' || cPhone !== '-' || cAddr !== '-') {
        receiptTxt += `<div>${makeLine('.')}</div>`;
        if(cName !== '-') receiptTxt += `<div class="text-[10px]">Nama: ${cName}</div>`;
        if(cPhone !== '-') receiptTxt += `<div class="text-[10px]">HP: ${cPhone}</div>`;
        if(cAddr !== '-') receiptTxt += `<div class="text-[10px] truncate">Alamat: ${cAddr}</div>`;
    }
    receiptTxt += `<div>${makeLine('-')}</div>`;
    if (cart.length === 0) { receiptTxt += `<div class="text-center text-gray-400 italic text-[11px] my-4">[ Belum Ada Item ]</div>`; } 
    else {
        cart.forEach(item => {
            receiptTxt += `<div class="font-bold text-[11px]">${item.name}</div>`;
            let spec = `  ${item.qty} x ${formatRupiah(item.price).replace('Rp ', '')}`; let priceSub = formatRupiah(item.price * item.qty).replace('Rp ', '');
            receiptTxt += `<div class="text-[11px]">${fillSpace(spec, priceSub)}</div>`;
        });
    }
    receiptTxt += `<div>${makeLine('-')}</div>`;
    receiptTxt += `<div class="text-[11px]">${fillSpace('Subtotal:', formatRupiah(subtotal).replace('Rp ', ''))}</div>`;
    if(diskon > 0) receiptTxt += `<div class="text-[11px] text-red-600">${fillSpace('Diskon:', '-' + formatRupiah(diskon).replace('Rp ', ''))}</div>`;
    receiptTxt += `<div class="text-[11px] font-bold">${fillSpace('TOTAL AKHIR:', formatRupiah(total).replace('Rp ', ''))}</div>`;
    receiptTxt += `<div class="text-[11px]">${fillSpace('Tunai Bayar:', formatRupiah(bayar).replace('Rp ', ''))}</div>`;
    receiptTxt += `<div class="text-[11px] font-bold">${fillSpace('Kembalian:', formatRupiah(kembali).replace('Rp ', ''))}</div>`;
    receiptTxt += `<div>${makeLine('.')}</div>`;
    if(receiptConfig.footer) receiptTxt += `<div class="text-center text-[10px] mt-2 font-bold">${receiptConfig.footer}</div>`;
    paper.innerHTML = receiptTxt;
};

const processCheckout = () => {
    if (cart.length === 0) return Toast.fire({ icon: 'error', text: 'Keranjang belanja kosong!' });
    const total = parseInt(document.getElementById('cartTotal').getAttribute('data-total')); const bayar = parseInt(document.getElementById('uangBayar').value || 0);
    if (bayar < total) return Swal.fire({ icon: 'error', text: 'Uang tunai pembayaran kurang!' });

    cart.forEach(item => { const idx = products.findIndex(p => p.id === item.id); if (idx > -1) products[idx].stock -= item.qty; });
    const hppTotal = cart.reduce((sum, item) => sum + (item.hpp * item.qty), 0);
    
    const trx = {
        id: `TRX-${Date.now()}`, timestamp: Date.now(), date: new Date().toLocaleString('id-ID'),
        customer: { name: document.getElementById('custName').value.trim() || 'Umum', phone: document.getElementById('custPhone').value.trim() || '-', address: document.getElementById('custAddress').value.trim() || '-' },
        items: [...cart], subtotal: parseInt(document.getElementById('cartTotal').getAttribute('data-subtotal')), diskon: parseInt(document.getElementById('diskonTrx').value || 0), total: total, hpp: hppTotal, laba: total - hppTotal, bayar: bayar
    };
    transactions.push(trx);
    localStorage.setItem('pos_products', JSON.stringify(products)); localStorage.setItem('pos_transactions', JSON.stringify(transactions));
    cart = []; document.getElementById('uangBayar').value = ''; document.getElementById('diskonTrx').value = '0';
    document.getElementById('custName').value = ''; document.getElementById('custPhone').value = ''; document.getElementById('custAddress').value = '';
    updateCartUI(); updateAllViews(); renderReceiptPreview();
    Swal.fire({ title: 'Transaksi Sukses!', text: 'Cetak nota thermal pembeli?', icon: 'success', showCancelButton: true }).then((res) => { if(res.isConfirmed) executeBypassPrint(); });
};

const renderKasirHistory = () => {
    const container = document.getElementById('kasirHistoryList'); if(!container) return; container.innerHTML = '';
    const todayStr = new Date().toLocaleDateString('id-ID'); const todayTrx = transactions.filter(t => t.date.includes(todayStr)).reverse();
    let todayOmsetSum = 0; let todayLabaSum = 0; let todayHppSum = 0; // Tambahan Hpp Tracker
    if(todayTrx.length === 0) {
        container.innerHTML = `<div class="text-gray-400 italic text-center py-4 text-xs">Belum ada aktivitas penjualan hari ini</div>`;
        document.getElementById('todayKasirOmset').innerText = "Rp 0"; document.getElementById('todayKasirLaba').innerText = "Rp 0"; document.getElementById('todayKasirMargin').innerText = "0%"; return;
    }
    todayTrx.forEach(t => {
        todayOmsetSum += t.total; todayLabaSum += t.laba; todayHppSum += t.hpp;
        const itemDetailsText = t.items.map(i => `${i.qty}x ${i.name}`).join(', '); 
        
        // CORITICAL FIX: Rumus Persentase Margin Kasir Kecil Terhadap HPP
        const trxMarginPct = t.hpp > 0 ? Math.round((t.laba / t.hpp) * 100) : 0;
        
        const timeParts = t.date.split(/[\s,]+/)[1] || t.date;
        container.innerHTML += `
            <div class="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-lg border dark:border-gray-600 shadow-sm text-xs flex flex-col gap-1 text-gray-800 dark:text-gray-100">
                <div class="flex justify-between items-center w-full">
                    <div class="truncate max-w-[75%]"><span class="font-mono font-bold text-blue-500">${t.id}</span> <span class="text-purple-500 font-semibold px-0.5">[${timeParts}]</span> <span class="font-semibold">• Pelanggan: ${t.customer.name}</span></div>
                    <div class="flex items-center gap-3"><span class="font-bold text-green-600">${formatRupiah(t.total)}</span> <button onclick="printOldTransactionFromKasir('${t.id}')" class="text-gray-400 hover:text-blue-500"><i class="fas fa-print"></i></button></div>
                </div>
                <div class="flex justify-between items-center text-[10px] text-gray-400 border-t border-dashed dark:border-gray-600 pt-1 mt-0.5">
                    <span class="truncate max-w-[75%] italic"><i class="fas fa-shopping-bag mr-1 text-[9px]"></i>${itemDetailsText}</span>
                    <span class="font-bold text-purple-600">Profit: ${trxMarginPct}%</span>
                </div>
            </div>`;
    });
    // CRITICAL FIX: Rumus Persentase Margin Widget Kasir Utama Terhadap Total HPP Berjalan
    const todayMarginPct = todayHppSum > 0 ? Math.round((todayLabaSum / todayHppSum) * 100) : 0;
    document.getElementById('todayKasirOmset').innerText = formatRupiah(todayOmsetSum); document.getElementById('todayKasirLaba').innerText = formatRupiah(todayLabaSum); document.getElementById('todayKasirMargin').innerText = `${todayMarginPct}%`;
};

// --- DATA FINANCIAL DASHBOARD GLOBAL OWNER ---
const calculateDashboard = () => {
    let dOmset = 0, dHpp = 0, dLaba = 0; let wOmset = 0, wHpp = 0, wLaba = 0; let mOmset = 0, mHpp = 0, mLaba = 0;
    const now = new Date(); const tStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); const wStart = tStart - (7 * 24 * 60 * 60 * 1000); const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    let targetedTransactions = [...transactions]; if (activeFilterStartDate && activeFilterEndDate) { targetedTransactions = transactions.filter(t => t.timestamp >= activeFilterStartDate && t.timestamp <= activeFilterEndDate); }
    targetedTransactions.forEach(t => { const ts = t.timestamp || tStart; if (ts >= tStart) { dOmset += t.total; dHpp += t.hpp; dLaba += t.laba; } if (ts >= wStart) { wOmset += t.total; wHpp += t.hpp; wLaba += t.laba; } if (ts >= mStart) { mOmset += t.total; mHpp += t.hpp; mLaba += t.laba; } });
    
    // CRITICAL FIX: Mengubah Rumus Pembagian Box Ringkasan Laporan Agar Dibagi HPP, Bukan Omset Jual
    const margin = (l, h) => h > 0 ? Math.round((l / h) * 100) : 0;
    
    document.getElementById('dayOmset').innerText = formatRupiah(dOmset); document.getElementById('dayHpp').innerText = formatRupiah(dHpp); document.getElementById('dayLaba').innerText = formatRupiah(dLaba); document.getElementById('dayMargin').innerText = `${margin(dLaba, dHpp)}%`;
    document.getElementById('weekOmset').innerText = formatRupiah(wOmset); document.getElementById('weekHpp').innerText = formatRupiah(wHpp); document.getElementById('weekLaba').innerText = formatRupiah(wLaba); document.getElementById('weekMargin').innerText = `${margin(wLaba, wHpp)}%`;
    document.getElementById('monthOmset').innerText = formatRupiah(mOmset); document.getElementById('monthHpp').innerText = formatRupiah(mHpp); document.getElementById('monthLaba').innerText = formatRupiah(mLaba); document.getElementById('monthMargin').innerText = `${margin(mLaba, mHpp)}%`;
    renderRiwayat(targetedTransactions);
};

const renderRiwayat = (targetedTrx) => {
    const tbody = document.getElementById('riwayatTableBody'); tbody.innerHTML = '';
    if (targetedTrx.length === 0) { tbody.innerHTML = `<tr><td colspan="8" class="p-4 text-center text-gray-400 italic">Tidak ditemukan riwayat data transaksi</td></tr>`; return; }
    targetedTrx.forEach((t) => {
        const originalIdx = transactions.length - 1 - transactions.slice().reverse().findIndex(realTrx => realTrx.id === t.id);
        
        // CRITICAL FIX: Mengubah Rumus Persentase Nota Utama Menjadi Terhadap HPP Modal Nyata
        const trxMarginPct = t.hpp > 0 ? Math.round((t.laba / t.hpp) * 100) : 0;

        tbody.innerHTML += `
            <tr class="text-xs hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="p-3 border-b dark:border-gray-600 whitespace-nowrap">${t.date}</td>
                <td class="p-3 border-b dark:border-gray-600 font-mono text-[11px]">${t.id}</td>
                <td class="p-3 border-b dark:border-gray-600 font-semibold">${t.customer ? t.customer.name : 'Umum'}</td>
                <td class="p-3 border-b dark:border-gray-600">${t.items.reduce((s, i) => s + i.qty, 0)} Item</td>
                
                <!-- HASIL REVISI MUTLAK: Tampilan Persentase Akurat Sekarang Keluar 39% Sesuai Teori Modal Toko -->
                <td class="p-3 border-b dark:border-gray-600 font-bold text-purple-600 dark:text-purple-400">${trxMarginPct}%</td>
                <td class="p-3 border-b dark:border-gray-600 font-bold text-blue-500">${formatRupiah(t.total)}</td>
                <td class="p-3 border-b dark:border-gray-600 font-bold text-green-600 dark:text-green-400">${formatRupiah(t.laba)}</td>
                
                <td class="p-3 border-b dark:border-gray-600 text-center space-x-1 whitespace-nowrap">
                    <button onclick="printOldTransaction(${originalIdx})" class="bg-blue-50 text-blue-600 px-2 py-1 rounded border border-blue-200"><i class="fas fa-print"></i> Cetak</button>
                    <button onclick="secureEditTransaction(${originalIdx})" class="bg-orange-50 text-orange-600 px-2 py-1 rounded border border-orange-200"><i class="fas fa-edit"></i> Edit</button>
                    <button onclick="secureDeleteTransaction(${originalIdx})" class="bg-red-50 text-red-600 px-2 py-1 rounded border border-red-200"><i class="fas fa-trash-alt"></i> Hapus</button>
                </td>
            </tr>`;
    });
};

const renderKelolaBarang = () => {
    const tbody = document.getElementById('kelolaTableBody'); tbody.innerHTML = ''; let totalModal = 0;
    products.forEach((p, idx) => {
        totalModal += (p.hpp * p.stock);
        const itemProfitMarginPct = Math.round(((p.price - p.hpp) / p.hpp) * 100);
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 text-xs"><td class="p-3 border-b"><div class="font-mono text-gray-400">${p.id}</div><div class="font-bold">${p.name}</div></td><td class="p-3 border-b"><div>Modal: ${formatRupiah(p.hpp)}</div><div class="text-blue-500">Jual: ${formatRupiah(p.price)}</div><div class="text-purple-600 dark:text-purple-400 font-bold text-[10px]">Margin Untung: ${itemProfitMarginPct}%</div></td><td class="p-3 border-b font-bold">${p.stock}</td><td class="p-3 border-b text-right space-x-1 whitespace-nowrap"><button onclick="editProduct(${idx})" class="bg-yellow-500 text-white p-1 rounded-md text-xs"><i class="fas fa-edit"></i></button> <button onclick="deleteProduct(${idx})" class="bg-red-500 text-white p-1 rounded-md text-xs"><i class="fas fa-trash"></i></button></td></tr>`;
    });
    document.getElementById('totalModalBarang').innerText = formatRupiah(totalModal);
};

const saveProduct = (e) => {
    e.preventDefault(); const idObj = document.getElementById('editId').value;
    const itemObj = { id: document.getElementById('itemSku').value.trim(), name: document.getElementById('itemName').value.trim(), hpp: parseInt(document.getElementById('itemHpp').value) || 0, price: parseInt(document.getElementById('itemPrice').value) || 0, stock: parseInt(document.getElementById('itemStock').value) || 0 };
    if (itemObj.hpp > 0) { const calculatedMargin = Math.round(((itemObj.price - itemObj.hpp) / itemObj.hpp) * 100); if (calculatedMargin < 30) { Swal.fire({ icon: 'error', text: 'Margin keuntungan wajib minimal 30%!' }); return; } }
    if (idObj === "") { if (products.some(p => p.id === itemObj.id)) return Swal.fire({ icon: 'error', text: 'SKU duplikat!' }); products.push(itemObj); } else { products[parseInt(idObj)] = itemObj; }
    localStorage.setItem('pos_products', JSON.stringify(products)); resetProductForm(); updateAllViews();
};

const calculateInputBarangMargin = () => {
    const hpp = parseInt(document.getElementById('itemHpp').value) || 0; const price = parseInt(document.getElementById('itemPrice').value) || 0;
    const previewEl = document.getElementById('inputBarangMarginPreview'); if (!previewEl) return;
    if (hpp <= 0) { previewEl.innerText = "Margin Keuntungan: 0%"; previewEl.className = "text-xs mt-1 font-semibold text-gray-400"; return; }
    const marginPct = Math.round(((price - hpp) / hpp) * 100);
    if (marginPct < 30) { previewEl.innerText = `Margin Keuntungan: ${marginPct}% (⚠️ Di bawah batas 30%!)`; previewEl.className = "text-xs mt-1 font-bold text-red-500"; } 
    else { previewEl.innerText = `Margin Keuntungan: ${marginPct}% (✓ Aman)`; previewEl.className = "text-xs mt-1 font-bold text-green-500"; }
};

const renderStok = () => { const tbody = document.getElementById('stokTableBody'); tbody.innerHTML = ''; products.forEach(p => { tbody.innerHTML += `<tr class="hover:bg-gray-50 text-sm"><td class="p-3 border-b font-mono">${p.id}</td><td class="p-3 border-b font-semibold">${p.name}</td><td class="p-3 border-b text-blue-500 font-bold">${formatRupiah(p.price)}</td><td class="p-3 border-b font-bold">${p.stock}</td></tr>`; }); };
const executeBypassPrint = () => { let section = document.getElementById('printSection'); if (!section) { section = document.createElement('div'); section.id = 'printSection'; document.body.appendChild(section); } section.innerHTML = document.getElementById('thermalPaper').innerHTML; window.print(); };
window.printOldTransaction = (idx) => { if (idx === -1) return; const t = transactions[idx]; const tempCart = [...cart]; const tempName = document.getElementById('custName').value; const tempPhone = document.getElementById('custPhone').value; const tempAddr = document.getElementById('custAddress').value; const tempDiskon = document.getElementById('diskonTrx').value; const tempBayar = document.getElementById('uangBayar').value; cart = t.items; document.getElementById('custName').value = t.customer.name; document.getElementById('custPhone').value = t.customer.phone; document.getElementById('custAddress').value = t.customer.address; document.getElementById('diskonTrx').value = t.diskon; document.getElementById('uangBayar').value = t.bayar || t.total; updateCartUI(); renderReceiptPreview(); setTimeout(() => { executeBypassPrint(); cart = tempCart; document.getElementById('custName').value = tempName; document.getElementById('custPhone').value = tempPhone; document.getElementById('custAddress').value = tempAddr; document.getElementById('diskonTrx').value = tempDiskon; document.getElementById('uangBayar').value = tempBayar; updateCartUI(); renderReceiptPreview(); }, 150); };
window.printOldTransactionFromKasir = (id) => { const idx = transactions.findIndex(t => t.id === id); if (idx > -1) window.printOldTransaction(idx); };
window.secureEditTransaction = (idx) => { if (idx === -1) return; if (cart.length > 0) return Swal.fire({ icon: 'error', text: 'Selesaikan transaksi aktif kasir terlebih dahulu!' }); const t = transactions[idx]; Swal.fire({ title: 'Koreksi Transaksi', text: `Kembalikan nota ${t.id} ke kasir?`, icon: 'warning', showCancelButton: true }).then((res) => { if (res.isConfirmed) { t.items.forEach(oldItem => { const pIdx = products.findIndex(p => p.id === oldItem.id); if (pIdx > -1) products[pIdx].stock += oldItem.qty; }); cart = [...t.items]; document.getElementById('custName').value = t.customer.name === 'Umum' ? '' : t.customer.name; document.getElementById('custPhone').value = t.customer.phone === '-' ? '' : t.customer.phone; document.getElementById('custAddress').value = t.customer.address === '-' ? '' : t.customer.address; document.getElementById('diskonTrx').value = t.diskon; document.getElementById('uangBayar').value = t.bayar || t.total; transactions.splice(idx, 1); localStorage.setItem('pos_products', JSON.stringify(products)); localStorage.setItem('pos_transactions', JSON.stringify(transactions)); updateCartUI(); updateAllViews(); switchView('view-kasir'); } }); };
window.secureDeleteTransaction = (idx) => { if (idx === -1) return; if (!currentUser || currentUser.role !== 'owner') return; const t = transactions[idx]; Swal.fire({ title: 'Hapus?', text: 'Masukkan password Owner:', input: 'password', showCancelButton: true }).then((res) => { if (res.isConfirmed && res.value === ownerAccount.password) { transactions.splice(idx, 1); localStorage.setItem('pos_transactions', JSON.stringify(transactions)); calculateDashboard(); updateAllViews(); } }); };
const secureResetLaporan = () => { if (!currentUser || currentUser.role !== 'owner') return; Swal.fire({ title: 'Reset?', text: 'Masukkan password Owner:', input: 'password', showCancelButton: true }).then((res) => { if (res.isConfirmed && res.value === ownerAccount.password) { transactions = []; localStorage.setItem('pos_transactions', JSON.stringify(transactions)); clearDashboardDateFilter(); } }); };
const applyDashboardDateFilter = () => { const startInput = document.getElementById('filterStartDate').value; const endInput = document.getElementById('filterEndDate').value; if (!startInput || !endInput) return Swal.fire({ icon: 'warning', text: 'Tentukan tanggal!' }); activeFilterStartDate = new Date(startInput + 'T00:00:00').getTime(); activeFilterEndDate = new Date(endInput + 'T23:59:59').getTime(); document.getElementById('filterStatusLabel').innerText = `Rentang: ${new Date(activeFilterStartDate).toLocaleDateString('id-ID')} - ${new Date(activeFilterEndDate).toLocaleDateString('id-ID')}`; calculateDashboard(); };
const clearDashboardDateFilter = () => { document.getElementById('filterStartDate').value = ''; document.getElementById('filterEndDate').value = ''; activeFilterStartDate = null; activeFilterEndDate = null; document.getElementById('filterStatusLabel').innerText = "Menampilkan: Semua Data Transaksi"; calculateDashboard(); };
const removeCartItem = (idx) => { cart.splice(idx, 1); updateCartUI(); renderReceiptPreview(); };
const resetProductForm = () => { document.getElementById('formBarang').reset(); document.getElementById('editId').value = ''; document.getElementById('inputBarangMarginPreview').innerText = "Margin Keuntungan: 0%"; document.getElementById('inputBarangMarginPreview').className = "text-xs mt-1 font-semibold text-gray-400"; };
const saveReceiptConfig = (e) => { e.preventDefault(); receiptConfig.storeName = document.getElementById('cfgStoreName').value.trim(); receiptConfig.slogan = document.getElementById('cfgSlogan').value.trim(); receiptConfig.address = document.getElementById('cfgAddress').value.trim(); receiptConfig.footer = document.getElementById('cfgFooter').value.trim(); localStorage.setItem('pos_receipt_config', JSON.stringify(receiptConfig)); renderReceiptPreview(); Toast.fire({ icon: 'success', title: 'Nota disimpan!' }); };