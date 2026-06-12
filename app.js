// --- STATE & DATA AWAL ---
let currentUser = null;
let theme = localStorage.getItem('theme') || 'light';
let receiptWidthFormat = '58mm';

let products = JSON.parse(localStorage.getItem('pos_products')) || [
    { id: 'SKU-001', name: 'Layanan Cuci Komplit', hpp: 3000, price: 6000, stock: 999 },
    { id: 'SKU-002', name: 'Deterjen Cair Premium', hpp: 15000, price: 25000, stock: 50 },
    { id: 'SKU-003', name: 'Meja TV Minimalis', hpp: 250000, price: 400000, stock: 10 },
    { id: 'SKU-004', name: 'Kipas Angin Berdiri', hpp: 120000, price: 180000, stock: 15 }
];

let cart = [];
let transactions = JSON.parse(localStorage.getItem('pos_transactions')) || [];

// --- UTILITAS ---
const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 1500, timerProgressBar: true
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
    if (currentTheme === 'dark') {
        html.classList.add('dark');
        icon.classList.replace('fa-moon', 'fa-sun');
    } else {
        html.classList.remove('dark');
        icon.classList.replace('fa-sun', 'fa-moon');
    }
};

document.getElementById('themeToggle').addEventListener('click', () => {
    theme = theme === 'light' ? 'dark' : 'light';
    localStorage.setItem('theme', theme);
    applyTheme(theme);
});

// --- SISTEM LOGIN ---
document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value.trim();
    const pass = document.getElementById('password').value.trim();

    if (user === 'kasir' && pass === 'kasir123') {
        loginSuccess({ username: 'kasir', role: 'kasir' });
    } else if (user === 'owner' && pass === 'owner123') {
        loginSuccess({ username: 'owner', role: 'owner' });
    } else {
        Swal.fire({ icon: 'error', title: 'Login Gagal', text: 'Username atau Password salah!' });
    }
});

const loginSuccess = (userObj) => {
    currentUser = userObj;
    sessionStorage.setItem('pos_user', JSON.stringify(currentUser));
    renderApp();
};

const checkLoginSession = () => {
    const sessionUser = sessionStorage.getItem('pos_user');
    if (sessionUser) {
        currentUser = JSON.parse(sessionUser);
        renderApp();
    }
};

document.getElementById('logoutBtn').addEventListener('click', () => {
    currentUser = null;
    sessionStorage.removeItem('pos_user');
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
    document.getElementById('userMenu').classList.add('hidden');
});

const renderApp = () => {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('userMenu').classList.remove('hidden');
    document.getElementById('userNameDisplay').innerText = `Halo, ${currentUser.username}`;

    const ownerMenus = document.getElementById('ownerMenus');
    if (currentUser.role === 'owner') {
        ownerMenus.classList.remove('hidden');
    } else {
        ownerMenus.classList.add('hidden');
    }

    switchView('view-kasir');
    updateAllViews();
};

// --- EVENTS ---
const setupEventListeners = () => {
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
    
    // Integrasi Cetak Struk via System Hardware OS
    document.getElementById('btnPrintLive').addEventListener('click', () => {
        window.print();
    });
};

const switchView = (viewId) => {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    if(viewId === 'view-laporan') calculateDashboard();
};

const switchReceiptFormat = (format) => {
    receiptWidthFormat = format;
    const btn58 = document.getElementById('btnFormat58');
    const btn80 = document.getElementById('btnFormat80');
    const paper = document.getElementById('thermalPaper');

    if(format === '58mm') {
        btn58.className = "px-2.5 py-1 rounded-md font-bold bg-white dark:bg-gray-800 shadow-sm transition text-gray-900 dark:text-white";
        btn80.className = "px-2.5 py-1 rounded-md transition text-gray-500 dark:text-gray-400";
        paper.className = "bg-white text-gray-900 p-4 shadow-md font-mono text-xs border border-gray-300 transition-all duration-200 w-[260px]";
    } else {
        btn80.className = "px-2.5 py-1 rounded-md font-bold bg-white dark:bg-gray-800 shadow-sm transition text-gray-900 dark:text-white";
        btn58.className = "px-2.5 py-1 rounded-md transition text-gray-500 dark:text-gray-400";
        paper.className = "bg-white text-gray-900 p-4 shadow-md font-mono text-xs border border-gray-300 transition-all duration-200 w-[360px]";
    }
    renderReceiptPreview();
};

const updateAllViews = () => {
    renderProducts();
    renderStok();
    renderKelolaBarang();
};

// --- KASIR UTAMA ---
const renderProducts = (searchQuery = '') => {
    const list = document.getElementById('productList');
    list.innerHTML = '';
    const filtered = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase()));

    filtered.forEach(p => {
        const div = document.createElement('div');
        div.className = `p-3 border rounded-xl cursor-pointer transition transform hover:scale-105 select-none ${p.stock <= 0 ? 'bg-red-50 border-red-200 opacity-60' : 'bg-gray-50 dark:bg-gray-700 dark:border-gray-600 hover:border-blue-500'}`;
        div.innerHTML = `
            <div class="text-[10px] text-gray-400 font-mono">${p.id}</div>
            <div class="font-bold text-xs line-clamp-2 min-h-[32px]">${p.name}</div>
            <div class="text-blue-500 font-bold text-sm mt-1">${formatRupiah(p.price)}</div>
            <div class="text-[10px] text-gray-400">Stok: ${p.stock}</div>
        `;
        if(p.stock > 0) div.onclick = () => addToCart(p);
        list.appendChild(div);
    });
};

const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        if (existing.qty >= product.stock) return Toast.fire({ icon: 'warning', title: 'Stok terbatas!' });
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
    renderReceiptPreview();
};

window.updateCartItemPrice = (index, value, fieldType) => {
    let item = cart[index];
    let num = parseFloat(value) || 0;
    let minPriceAllowed = Math.ceil(item.hpp * 1.30);

    if (fieldType === 'price') {
        if (num < minPriceAllowed) {
            Swal.fire({
                icon: 'warning',
                title: 'Margin Terlalu Rendah',
                text: `Harga ditolak! Batas keuntungan minimal 30% dari modal. Harga disesuaikan ke minimal aman: ${formatRupiah(minPriceAllowed)}`,
                timer: 3000
            });
            item.price = minPriceAllowed;
        } else {
            item.price = Math.ceil(num);
        }
    } else if (fieldType === 'margin') {
        if (num < 30) {
            Swal.fire({
                icon: 'warning',
                title: 'Margin Dikunci',
                text: 'Keuntungan minimal diatur sistem sebesar 30% dari HPP.',
                timer: 2000
            });
            num = 30;
        }
        item.price = Math.ceil(item.hpp * (1 + (num / 100)));
    }

    updateCartUI();
    renderReceiptPreview();
};

const updateCartUI = () => {
    const container = document.getElementById('cartItems');
    container.innerHTML = '';
    let subtotal = 0;

    if (cart.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-400 mt-10 text-sm">Keranjang masih kosong</div>`;
    } else {
        cart.forEach((item, idx) => {
            subtotal += item.price * item.qty;
            let currentMarginPct = Math.round(((item.price - item.hpp) / item.hpp) * 100);

            container.innerHTML += `
                <div class="p-3 bg-gray-50 dark:bg-gray-700/60 rounded-xl border dark:border-gray-600 space-y-2">
                    <div class="flex justify-between items-start gap-2">
                        <div class="w-4/5">
                            <h4 class="text-xs font-bold truncate">${item.name}</h4>
                            <p class="text-[10px] text-gray-400">HPP/Modal: ${formatRupiah(item.hpp)}</p>
                        </div>
                        <button onclick="removeCartItem(${idx})" class="text-red-400 hover:text-red-600 text-xs"><i class="fas fa-trash"></i></button>
                    </div>

                    <div class="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-gray-800 p-2 rounded-lg border dark:border-gray-600">
                        <div>
                            <span class="block text-[9px] text-gray-400">Harga Jual (Rp)</span>
                            <input type="number" value="${item.price}" onchange="updateCartItemPrice(${idx}, this.value, 'price')" class="w-full bg-transparent font-bold text-blue-500 outline-none">
                        </div>
                        <div>
                            <span class="block text-[9px] text-gray-400">Profit Margin (%)</span>
                            <input type="number" value="${currentMarginPct}" onchange="updateCartItemPrice(${idx}, this.value, 'margin')" class="w-full bg-transparent font-bold text-purple-500 outline-none">
                        </div>
                    </div>

                    <div class="flex justify-between items-center text-xs pt-1 border-t border-dashed dark:border-gray-600">
                        <div class="flex items-center gap-2">
                            <button onclick="changeQty(${idx}, -1)" class="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded text-center">-</button>
                            <span class="font-bold">${item.qty}</span>
                            <button onclick="changeQty(${idx}, 1)" class="w-5 h-5 bg-gray-200 dark:bg-gray-600 rounded text-center">+</button>
                        </div>
                        <span class="font-bold text-gray-600 dark:text-gray-300">${formatRupiah(item.price * item.qty)}</span>
                    </div>
                </div>
            `;
        });
    }

    let diskon = parseInt(document.getElementById('diskonTrx').value || 0);
    let totalAkhir = Math.max(0, subtotal - diskon);

    document.getElementById('cartSubtotal').innerText = formatRupiah(subtotal);
    document.getElementById('cartTotal').innerText = formatRupiah(totalAkhir);
    document.getElementById('cartTotal').setAttribute('data-subtotal', subtotal);
    document.getElementById('cartTotal').setAttribute('data-total', totalAkhir);
    calculateChange();
};

window.changeQty = (idx, delta) => {
    let item = cart[idx];
    let prod = products.find(p => p.id === item.id);
    item.qty += delta;
    if(item.qty > prod.stock) { item.qty = prod.stock; Toast.fire({icon:'warning', title:'Stok habis'}); }
    if(item.qty <= 0) cart.splice(idx, 1);
    updateCartUI();
    renderReceiptPreview();
};

window.removeCartItem = (idx) => {
    cart.splice(idx, 1);
    updateCartUI();
    renderReceiptPreview();
};

const calculateChange = () => {
    let total = parseInt(document.getElementById('cartTotal').getAttribute('data-total') || 0);
    let bayar = parseInt(document.getElementById('uangBayar').value || 0);
    let kembali = bayar - total;
    let el = document.getElementById('uangKembali');

    if (bayar > 0 && kembali >= 0) {
        el.innerText = formatRupiah(kembali);
        el.className = 'font-bold text-green-500 text-sm';
    } else if (bayar > 0 && kembali < 0) {
        el.innerText = 'Uang Kurang!';
        el.className = 'font-bold text-red-500 text-sm';
    } else {
        el.innerText = 'Rp 0';
        el.className = 'font-bold text-gray-500 text-sm';
    }
};

// --- LIVE PREVIEW GENERATOR ---
const renderReceiptPreview = () => {
    const paper = document.getElementById('thermalPaper');
    
    const cName = document.getElementById('custName').value.trim() || '-';
    const cPhone = document.getElementById('custPhone').value.trim() || '-';
    const cAddr = document.getElementById('custAddress').value.trim() || '-';
    const diskon = parseInt(document.getElementById('diskonTrx').value || 0);
    const bayar = parseInt(document.getElementById('uangBayar').value || 0);
    const subtotal = parseInt(document.getElementById('cartTotal').getAttribute('data-subtotal') || 0);
    const total = parseInt(document.getElementById('cartTotal').getAttribute('data-total') || 0);
    const kembali = Math.max(0, bayar - total);

    const maxChars = (receiptWidthFormat === '58mm') ? 32 : 48;
    const makeLine = (char = '-') => char.repeat(maxChars);
    const fillSpace = (left, right) => {
        let spaceLength = maxChars - (left.length + right.length);
        return left + " ".repeat(spaceLength > 0 ? spaceLength : 1) + right;
    };

    let htmlContent = "";
    
    htmlContent += `<div class="text-center font-bold text-sm uppercase">FAJRI MANDIRI TOYS</div>`;
    htmlContent += `<div class="text-center text-[10px]">Pusat Mainan & Elektronik</div>`;
    htmlContent += `<div class="text-center text-[10px] mb-2">Telp: 0812-XXXX-XXXX</div>`;
    htmlContent += `<div>${makeLine('.')}</div>`;
    
    htmlContent += `<div class="text-[10px]">${fillSpace('Waktu:', new Date().toLocaleDateString('id-ID'))}</div>`;
    htmlContent += `<div class="text-[10px]">${fillSpace('Kasir:', currentUser ? currentUser.username.toUpperCase() : 'MOCK')}</div>`;
    
    if (cName !== '-' || cPhone !== '-' || cAddr !== '-') {
        htmlContent += `<div>${makeLine('.')}</div>`;
        htmlContent += `<div class="text-[10px] font-bold">PELANGGAN:</div>`;
        if(cName !== '-') htmlContent += `<div class="text-[10px]">Nama: ${cName}</div>`;
        if(cPhone !== '-') htmlContent += `<div class="text-[10px]">HP: ${cPhone}</div>`;
        if(cAddr !== '-') htmlContent += `<div class="text-[10px] truncate">Alamat: ${cAddr}</div>`;
    }
    
    htmlContent += `<div>${makeLine('-')}</div>`;

    if (cart.length === 0) {
        htmlContent += `<div class="text-center text-gray-400 italic text-[11px] my-4">[ Belum Ada Item ]</div>`;
    } else {
        cart.forEach(item => {
            htmlContent += `<div class="font-bold text-[11px]">${item.name}</div>`;
            let leftDetails = `  ${item.qty} x ${formatRupiah(item.price).replace('Rp ', '')}`;
            let rightTotal = formatRupiah(item.price * item.qty).replace('Rp ', '');
            htmlContent += `<div class="text-[11px]">${fillSpace(leftDetails, rightTotal)}</div>`;
        });
    }

    htmlContent += `<div>${makeLine('-')}</div>`;
    
    htmlContent += `<div class="text-[11px]">${fillSpace('Subtotal:', formatRupiah(subtotal).replace('Rp ', ''))}</div>`;
    if(diskon > 0) {
        htmlContent += `<div class="text-[11px] text-red-600">${fillSpace('Diskon Nota:', '-' + formatRupiah(diskon).replace('Rp ', ''))}</div>`;
    }
    htmlContent += `<div class="text-[11px] font-bold">${fillSpace('TOTAL AKHIR:', formatRupiah(total).replace('Rp ', ''))}</div>`;
    htmlContent += `<div class="text-[11px]">${fillSpace('Tunai Bayar:', formatRupiah(bayar).replace('Rp ', ''))}</div>`;
    htmlContent += `<div class="text-[11px] font-bold">${fillSpace('Kembalian:', formatRupiah(kembali).replace('Rp ', ''))}</div>`;
    
    htmlContent += `<div>${makeLine('.')}</div>`;
    htmlContent += `<div class="text-center text-[10px] mt-2 font-bold">TERIMA KASIH</div>`;

    paper.innerHTML = htmlContent;
};

// --- CHECKOUT ---
const processCheckout = () => {
    if (cart.length === 0) return Toast.fire({ icon: 'error', title: 'Keranjang kosong!' });
    
    const total = parseInt(document.getElementById('cartTotal').getAttribute('data-total'));
    const bayar = parseInt(document.getElementById('uangBayar').value || 0);

    if (bayar < total) return Swal.fire({ icon: 'error', title: 'Gagal', text: 'Uang pembayaran kurang!' });

    cart.forEach(cartItem => {
        const idx = products.findIndex(p => p.id === cartItem.id);
        if (idx > -1) products[idx].stock -= cartItem.qty;
    });

    const hppTotal = cart.reduce((sum, item) => sum + (item.hpp * item.qty), 0);
    
    const trx = {
        id: `TRX-${Date.now()}`,
        timestamp: Date.now(),
        date: new Date().toLocaleString('id-ID'),
        customer: {
            name: document.getElementById('custName').value.trim() || 'Umum',
            phone: document.getElementById('custPhone').value.trim() || '-',
            address: document.getElementById('custAddress').value.trim() || '-'
        },
        items: [...cart],
        subtotal: parseInt(document.getElementById('cartTotal').getAttribute('data-subtotal')),
        diskon: parseInt(document.getElementById('diskonTrx').value || 0),
        total: total,
        hpp: hppTotal,
        laba: total - hppTotal,
        bayar: bayar
    };

    transactions.push(trx);
    localStorage.setItem('pos_products', JSON.stringify(products));
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));

    // Reset Kasir
    cart = [];
    document.getElementById('uangBayar').value = '';
    document.getElementById('diskonTrx').value = '0';
    document.getElementById('custName').value = '';
    document.getElementById('custPhone').value = '';
    document.getElementById('custAddress').value = '';

    updateCartUI();
    updateAllViews();
    renderReceiptPreview();

    Swal.fire({ 
        icon: 'success', 
        title: 'Transaksi Berhasil!', 
        text: 'Data disimpan. Ingin langsung mencetak struk?',
        showCancelButton: true,
        confirmButtonText: 'Ya, Cetak',
        cancelButtonText: 'Nanti Saja'
    }).then((res) => {
        if(res.isConfirmed) window.print();
    });
};

// --- STOK & KELOLA BARANG ---
const renderStok = () => {
    const tbody = document.getElementById('stokTableBody');
    tbody.innerHTML = '';
    products.forEach(p => {
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="p-3 border-b dark:border-gray-600 font-mono text-xs">${p.id}</td>
                <td class="p-3 border-b dark:border-gray-600 font-semibold">${p.name}</td>
                <td class="p-3 border-b dark:border-gray-600 text-blue-500">${formatRupiah(p.price)}</td>
                <td class="p-3 border-b dark:border-gray-600 font-bold ${p.stock <= 5 ? 'text-red-500' : ''}">${p.stock}</td>
            </tr>
        `;
    });
};

const renderKelolaBarang = () => {
    const tbody = document.getElementById('kelolaTableBody');
    tbody.innerHTML = '';
    let totalModal = 0;

    products.forEach((p, idx) => {
        totalModal += (p.hpp * p.stock);
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="p-3 border-b dark:border-gray-600">
                    <div class="font-mono text-xs text-gray-400">${p.id}</div>
                    <div class="font-bold text-xs">${p.name}</div>
                </td>
                <td class="p-3 border-b dark:border-gray-600 text-xs">
                    <div>Modal: ${formatRupiah(p.hpp)}</div>
                    <div class="text-blue-500">Jual: ${formatRupiah(p.price)}</div>
                </td>
                <td class="p-3 border-b dark:border-gray-600 font-bold text-xs">${p.stock}</td>
                <td class="p-3 border-b dark:border-gray-600 text-right space-x-1">
                    <button onclick="editProduct(${idx})" class="bg-yellow-500 text-white p-1 rounded text-xs"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProduct(${idx})" class="bg-red-500 text-white p-1 rounded text-xs"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    document.getElementById('totalModalBarang').innerText = formatRupiah(totalModal);
};

const saveProduct = (e) => {
    e.preventDefault();
    const idObj = document.getElementById('editId').value;
    const itemObj = {
        id: document.getElementById('itemSku').value.trim(),
        name: document.getElementById('itemName').value.trim(),
        hpp: parseInt(document.getElementById('itemHpp').value) || 0,
        price: parseInt(document.getElementById('itemPrice').value) || 0,
        stock: parseInt(document.getElementById('itemStock').value) || 0
    };

    if (idObj === "") {
        if (products.some(p => p.id === itemObj.id)) return Swal.fire({ icon: 'error', title: 'SKU duplikat!' });
        products.push(itemObj);
    } else {
        products[parseInt(idObj)] = itemObj;
    }

    localStorage.setItem('pos_products', JSON.stringify(products));
    resetProductForm();
    updateAllViews();
};

window.editProduct = (idx) => {
    const p = products[idx];
    document.getElementById('editId').value = idx;
    document.getElementById('itemSku').value = p.id;
    document.getElementById('itemName').value = p.name;
    document.getElementById('itemHpp').value = p.hpp;
    document.getElementById('itemPrice').value = p.price;
    document.getElementById('itemStock').value = p.stock;
};

window.deleteProduct = (idx) => {
    Swal.fire({ title: 'Hapus?', text: "Data akan hilang permanen", icon: 'warning', showCancelButton: true, confirmButtonColor: '#d33', confirmButtonText: 'Hapus' }).then((res) => {
        if (res.isConfirmed) {
            products.splice(idx, 1);
            localStorage.setItem('pos_products', JSON.stringify(products));
            updateAllViews();
        }
    });
};

const resetProductForm = () => {
    document.getElementById('formBarang').reset();
    document.getElementById('editId').value = '';
};

// --- RIWAYAT, RE-PRINT & EDIT SYSTEM (VERIFIKASI AMAN) ---
const calculateDashboard = () => {
    let dOmset = 0, dHpp = 0, dLaba = 0;
    let wOmset = 0, wHpp = 0, wLaba = 0;
    let mOmset = 0, mHpp = 0, mLaba = 0;

    const now = new Date();
    const tStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const wStart = tStart - (7 * 24 * 60 * 60 * 1000);
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    transactions.forEach(t => {
        const ts = t.timestamp || tStart;
        if (ts >= tStart) { dOmset += t.total; dHpp += t.hpp; dLaba += t.laba; }
        if (ts >= wStart) { wOmset += t.total; wHpp += t.hpp; wLaba += t.laba; }
        if (ts >= mStart) { mOmset += t.total; mHpp += t.hpp; mLaba += t.laba; }
    });

    const margin = (l, o) => o > 0 ? Math.round((l / o) * 100) : 0;

    document.getElementById('dayOmset').innerText = formatRupiah(dOmset);
    document.getElementById('dayHpp').innerText = formatRupiah(dHpp);
    document.getElementById('dayLaba').innerText = formatRupiah(dLaba);
    document.getElementById('dayMargin').innerText = `${margin(dLaba, dOmset)}%`;

    document.getElementById('weekOmset').innerText = formatRupiah(wOmset);
    document.getElementById('weekHpp').innerText = formatRupiah(wHpp);
    document.getElementById('weekLaba').innerText = formatRupiah(wLaba);
    document.getElementById('weekMargin').innerText = `${margin(wLaba, wOmset)}%`;

    document.getElementById('monthOmset').innerText = formatRupiah(mOmset);
    document.getElementById('monthHpp').innerText = formatRupiah(mHpp);
    document.getElementById('monthLaba').innerText = formatRupiah(mLaba);
    document.getElementById('monthMargin').innerText = `${margin(mLaba, mOmset)}%`;

    renderRiwayat();
};

const renderRiwayat = () => {
    const tbody = document.getElementById('riwayatTableBody');
    tbody.innerHTML = '';
    
    [...transactions].reverse().forEach((t, reversedIdx) => {
        // Ambil index asli di array state utama
        const originalIdx = transactions.length - 1 - reversedIdx; 
        
        tbody.innerHTML += `
            <tr class="text-xs hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="p-3 border-b dark:border-gray-600">${t.date}</td>
                <td class="p-3 border-b dark:border-gray-600 font-mono">${t.id}</td>
                <td class="p-3 border-b dark:border-gray-600 font-semibold">${t.customer ? t.customer.name : 'Umum'}</td>
                <td class="p-3 border-b dark:border-gray-600">${t.items.reduce((s, i) => s + i.qty, 0)} Item</td>
                <td class="p-3 border-b dark:border-gray-600 font-bold text-green-500">${formatRupiah(t.total)}</td>
                <td class="p-3 border-b dark:border-gray-600 text-center space-x-1 whitespace-nowrap">
                    <button onclick="printOldTransaction(${originalIdx})" class="bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded text-[11px] font-medium transition">
                        <i class="fas fa-print"></i> Cetak
                    </button>
                    <button onclick="secureEditTransaction(${originalIdx})" class="bg-orange-500 hover:bg-orange-600 text-white px-2 py-1 rounded text-[11px] font-medium transition">
                        <i class="fas fa-edit"></i> Koreksi / Edit
                    </button>
                </td>
            </tr>
        `;
    });
};

// Fungsi Cetak Ulang dari Riwayat
window.printOldTransaction = (idx) => {
    const t = transactions[idx];
    
    // Simpan data keranjang aktif sementara
    const tempCart = [...cart];
    const tempName = document.getElementById('custName').value;
    const tempPhone = document.getElementById('custPhone').value;
    const tempAddr = document.getElementById('custAddress').value;
    const tempDiskon = document.getElementById('diskonTrx').value;
    const tempBayar = document.getElementById('uangBayar').value;

    // Load data transaksi lama ke preview generator
    cart = t.items;
    document.getElementById('custName').value = t.customer.name;
    document.getElementById('custPhone').value = t.customer.phone;
    document.getElementById('custAddress').value = t.customer.address;
    document.getElementById('diskonTrx').value = t.diskon;
    document.getElementById('uangBayar').value = t.bayar || t.total;

    updateCartUI();
    renderReceiptPreview();

    // Trigger Print Jendela OS Browser
    setTimeout(() => {
        window.print();
        
        // Kembalikan kondisi kasir aktif semula
        cart = tempCart;
        document.getElementById('custName').value = tempName;
        document.getElementById('custPhone').value = tempPhone;
        document.getElementById('custAddress').value = tempAddr;
        document.getElementById('diskonTrx').value = tempDiskon;
        document.getElementById('uangBayar').value = tempBayar;
        updateCartUI();
        renderReceiptPreview();
        Toast.fire({ icon: 'success', title: 'Perintah print dikirim!' });
    }, 150);
};

// Fungsi Koreksi Ganda (Amankan Stok & Balikkan ke Kasir)
window.secureEditTransaction = (idx) => {
    if (cart.length > 0) {
        return Swal.fire({
            icon: 'error',
            title: 'Kasir Masih Terisi',
            text: 'Kosongkan atau selesaikan belanjaan di kasir terlebih dahulu sebelum mengedit transaksi riwayat!'
        });
    }

    const t = transactions[idx];

    Swal.fire({
        title: 'Verifikasi Koreksi',
        text: `Apakah Anda yakin ingin mengedit ${t.id}? Sistem akan membatalkan status transaksi ini dan mengembalikan item ke kasir untuk diperbaiki.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#f97316',
        confirmButtonText: 'Ya, Kembalikan ke Kasir',
        cancelButtonText: 'Batal'
    }).then((res) => {
        if (res.isConfirmed) {
            // RESTORE STOK UTAMA (Balikkan efek penjualan lama)
            t.items.forEach(oldItem => {
                const pIdx = products.findIndex(p => p.id === oldItem.id);
                if (pIdx > -1) {
                    products[pIdx].stock += oldItem.qty;
                }
            });

            // OPER DATA KE REGISTER AKTIF KASIR
            cart = [...t.items];
            document.getElementById('custName').value = t.customer.name === 'Umum' ? '' : t.customer.name;
            document.getElementById('custPhone').value = t.customer.phone === '-' ? '' : t.customer.phone;
            document.getElementById('custAddress').value = t.customer.address === '-' ? '' : t.customer.address;
            document.getElementById('diskonTrx').value = t.diskon;
            document.getElementById('uangBayar').value = t.bayar || t.total;

            // HAPUS TRANSAKSI LAMA DARI DATABASE AGAR TIDAK DOUBLE PENJUALAN
            transactions.splice(idx, 1);

            // SIMPAN PERUBAHAN STATE
            localStorage.setItem('pos_products', JSON.stringify(products));
            localStorage.setItem('pos_transactions', JSON.stringify(transactions));

            // UPDATE TAMPILAN
            updateCartUI();
            updateAllViews();
            renderReceiptPreview();

            // Alihkan otomatis halaman kasir agar user langsung fokus mengedit
            switchView('view-kasir');
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('bg-blue-50', 'dark:bg-gray-700', 'text-blue-600', 'dark:text-blue-400');
                if(b.getAttribute('data-target') === 'view-kasir') {
                    b.classList.add('bg-blue-50', 'dark:bg-gray-700', 'text-blue-600', 'dark:text-blue-400');
                }
            });

            Swal.fire({
                icon: 'info',
                title: 'Transaksi Siap Diedit',
                text: 'Item berhasil dikembalikan ke layar kasir. Silakan sesuaikan lalu klik "Proses Transaksi" kembali.',
                timer: 4000
            });
        }
    });
};

const secureResetLaporan = () => {
    if (!currentUser || currentUser.role !== 'owner') {
        Swal.fire({ icon: 'error', title: 'Ditolak', text: 'Hanya Owner yang berhak melakukan reset!' });
        return;
    }
    Swal.fire({ title: 'Tahap 1', text: 'Masukkan password Owner:', input: 'password', showCancelButton: true }).then((res) => {
        if (res.isConfirmed && res.value === 'owner123') {
            Swal.fire({ title: 'Tahap 2', text: 'Ketik "RESET LAPORAN" (Kapital):', input: 'text', showCancelButton: true }).then((final) => {
                if (final.isConfirmed && final.value === 'RESET LAPORAN') {
                    transactions = [];
                    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
                    calculateDashboard();
                    Swal.fire({ icon: 'success', title: 'Data Laporan Bersih!' });
                }
            });
        }
    });
};
