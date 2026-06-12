// --- STATE & DATA AWAL ---
let currentUser = null;
let theme = localStorage.getItem('theme') || 'light';

let products = JSON.parse(localStorage.getItem('pos_products')) || [
    { id: 'SKU-001', name: 'Layanan Cuci Komplit', hpp: 3000, price: 6000, stock: 999 },
    { id: 'SKU-002', name: 'Deterjen Cair Premium', hpp: 15000, price: 25000, stock: 50 },
    { id: 'SKU-003', name: 'Meja TV Minimalis', hpp: 250000, price: 400000, stock: 10 },
    { id: 'SKU-004', name: 'Kipas Angin Berdiri', hpp: 120000, price: 180000, stock: 15 }
];

let cart = [];
let transactions = JSON.parse(localStorage.getItem('pos_transactions')) || [];

// --- UTILITAS UI ---
const Toast = Swal.mixin({
    toast: true, position: 'top-end', showConfirmButton: false, timer: 2000, timerProgressBar: true
});

const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(angka);
};

document.addEventListener('DOMContentLoaded', () => {
    applyTheme(theme);
    checkLoginSession();
    setupEventListeners();
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

// --- NAVIGASI ---
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
    document.getElementById('uangBayar').addEventListener('input', calculateChange);
    document.getElementById('btnCheckout').addEventListener('click', processCheckout);
    document.getElementById('formBarang').addEventListener('submit', saveProduct);
    document.getElementById('btnResetForm').addEventListener('click', resetProductForm);
    document.getElementById('btnResetLaporan').addEventListener('click', secureResetLaporan);
};

const switchView = (viewId) => {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    if(viewId === 'view-laporan') calculateDashboard();
};

const updateAllViews = () => {
    renderProducts();
    renderStok();
    renderKelolaBarang();
};

// --- LOGIKA KASIR ---
const renderProducts = (searchQuery = '') => {
    const list = document.getElementById('productList');
    list.innerHTML = '';
    const filtered = products.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase()));

    filtered.forEach(p => {
        const div = document.createElement('div');
        div.className = `p-3 border rounded-xl cursor-pointer transition transform hover:scale-105 select-none ${p.stock <= 0 ? 'bg-red-50 border-red-200 opacity-60' : 'bg-gray-50 dark:bg-gray-700 dark:border-gray-600 hover:border-blue-500'}`;
        div.innerHTML = `
            <div class="text-xs text-gray-500 font-mono mb-1">${p.id}</div>
            <div class="font-bold text-sm mb-1 line-clamp-2">${p.name}</div>
            <div class="text-blue-600 dark:text-blue-400 font-bold">${formatRupiah(p.price)}</div>
            <div class="text-xs mt-1 text-gray-400">Stok: ${p.stock}</div>
        `;
        if(p.stock > 0) div.onclick = () => addToCart(p);
        list.appendChild(div);
    });
};

const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        if (existing.qty >= product.stock) return Toast.fire({ icon: 'warning', title: 'Stok tidak mencukupi!' });
        existing.qty++;
    } else {
        cart.push({ ...product, qty: 1 });
    }
    updateCartUI();
};

const updateCartUI = () => {
    const cartContainer = document.getElementById('cartItems');
    cartContainer.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartContainer.innerHTML = `<div class="text-center text-gray-400 mt-10 text-sm">Keranjang masih kosong</div>`;
    } else {
        cart.forEach((item, index) => {
            total += item.price * item.qty;
            cartContainer.innerHTML += `
                <div class="flex justify-between items-center p-2 bg-gray-50 dark:bg-gray-700 rounded border dark:border-gray-600">
                    <div class="w-1/2">
                        <div class="text-sm font-bold truncate">${item.name}</div>
                        <div class="text-xs text-blue-600 dark:text-blue-400">${formatRupiah(item.price)}</div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="changeQty(${index}, -1)" class="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded>-</button>
                        <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
                        <button onclick="changeQty(${index}, 1)" class="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded">+</button>
                    </div>
                </div>
            `;
        });
    }
    document.getElementById('cartTotal').innerText = formatRupiah(total);
    document.getElementById('cartTotal').setAttribute('data-total', total);
    calculateChange();
};

window.changeQty = (index, delta) => {
    const item = cart[index];
    const product = products.find(p => p.id === item.id);
    item.qty += delta;
    if (item.qty > product.stock) { item.qty = product.stock; Toast.fire({ icon: 'warning', title: 'Maksimal stok tercapai!' }); }
    if (item.qty <= 0) cart.splice(index, 1);
    updateCartUI();
};

const calculateChange = () => {
    const total = parseInt(document.getElementById('cartTotal').getAttribute('data-total') || 0);
    const bayar = parseInt(document.getElementById('uangBayar').value || 0);
    const kembali = bayar - total;
    const kembaliEl = document.getElementById('uangKembali');

    if (bayar > 0 && kembali >= 0) {
        kembaliEl.innerText = formatRupiah(kembali);
        kembaliEl.className = 'text-lg font-bold text-green-500';
    } else if (bayar > 0 && kembali < 0) {
        kembaliEl.innerText = "Uang Kurang!";
        kembaliEl.className = 'text-lg font-bold text-red-500';
    } else {
        kembaliEl.innerText = 'Rp 0';
        kembaliEl.className = 'text-lg text-gray-600 dark:text-gray-300';
    }
};

const processCheckout = () => {
    if (cart.length === 0) return Toast.fire({ icon: 'error', title: 'Keranjang kosong!' });
    const total = parseInt(document.getElementById('cartTotal').getAttribute('data-total'));
    const bayar = parseInt(document.getElementById('uangBayar').value || 0);

    if (bayar < total) return Swal.fire({ icon: 'error', title: 'Gagal', text: 'Uang pembayaran kurang!' });

    cart.forEach(cartItem => {
        const prodIndex = products.findIndex(p => p.id === cartItem.id);
        if (prodIndex > -1) products[prodIndex].stock -= cartItem.qty;
    });

    const hppTotal = cart.reduce((sum, item) => sum + (item.hpp * item.qty), 0);
    const trx = {
        id: `TRX-${Date.now()}`,
        timestamp: Date.now(),
        date: new Date().toLocaleString('id-ID'),
        items: [...cart],
        total: total,
        hpp: hppTotal,
        laba: total - hppTotal
    };
    transactions.push(trx);

    localStorage.setItem('pos_products', JSON.stringify(products));
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));

    cart = [];
    document.getElementById('uangBayar').value = '';
    updateCartUI();
    updateAllViews();

    Swal.fire({ icon: 'success', title: 'Transaksi Sukses!', text: `Kembalian: ${formatRupiah(bayar - total)}` });
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
                <td class="p-3 border-b dark:border-gray-600 text-blue-600 dark:text-blue-400">${formatRupiah(p.price)}</td>
                <td class="p-3 border-b dark:border-gray-600 font-bold ${p.stock <= 5 ? 'text-red-500' : ''}">${p.stock}</td>
            </tr>
        `;
    });
};

const renderKelolaBarang = () => {
    const tbody = document.getElementById('kelolaTableBody');
    tbody.innerHTML = '';
    let totalModalSemuaBarang = 0;

    products.forEach((p, idx) => {
        totalModalSemuaBarang += (p.hpp * p.stock);
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="p-3 border-b dark:border-gray-600">
                    <div class="font-mono text-xs text-gray-500">${p.id}</div>
                    <div class="font-bold">${p.name}</div>
                </td>
                <td class="p-3 border-b dark:border-gray-600 text-sm">
                    <div><span class="text-gray-500">HPP:</span> ${formatRupiah(p.hpp)}</div>
                    <div><span class="text-gray-500">Jual:</span> <span class="text-blue-600 dark:text-blue-400 font-bold">${formatRupiah(p.price)}</span></div>
                </td>
                <td class="p-3 border-b dark:border-gray-600 font-bold">${p.stock}</td>
                <td class="p-3 border-b dark:border-gray-600 text-right space-x-1">
                    <button onclick="editProduct(${idx})" class="bg-yellow-500 text-white px-2 py-1 rounded text-xs"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProduct(${idx})" class="bg-red-500 text-white px-2 py-1 rounded text-xs"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
    document.getElementById('totalModalBarang').innerText = formatRupiah(totalModalSemuaBarang);
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
    Swal.fire({ title: 'Hapus?', text: "Data hilang permanen", icon: 'warning', showCancelButton: true }).then((result) => {
        if (result.isConfirmed) {
            products.splice(idx, 1);
            localStorage.setItem('pos_products', JSON.stringify(products));
            updateAllViews();
        }
    });
};

const resetProductForm = () => { document.getElementById('formBarang').reset(); document.getElementById('editId').value = ''; };

// --- DASHBOARD REPORT PERIODIK ---
const calculateDashboard = () => {
    let dayOmset = 0, dayHpp = 0, dayLaba = 0;
    let weekOmset = 0, weekHpp = 0, weekLaba = 0;
    let monthOmset = 0, monthHpp = 0, monthLaba = 0;

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const weekStart = todayStart - (7 * 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    transactions.forEach(t => {
        const ts = t.timestamp || todayStart;
        if (ts >= todayStart) { dayOmset += t.total; dayHpp += t.hpp; dayLaba += t.laba; }
        if (ts >= weekStart) { weekOmset += t.total; weekHpp += t.hpp; weekLaba += t.laba; }
        if (ts >= monthStart) { monthOmset += t.total; monthHpp += t.hpp; monthLaba += t.laba; }
    });

    const calcMargin = (laba, omset) => omset > 0 ? Math.round((laba / omset) * 100) : 0;

    document.getElementById('dayOmset').innerText = formatRupiah(dayOmset);
    document.getElementById('dayHpp').innerText = formatRupiah(dayHpp);
    document.getElementById('dayLaba').innerText = formatRupiah(dayLaba);
    document.getElementById('dayMargin').innerText = `${calcMargin(dayLaba, dayOmset)}%`;

    document.getElementById('weekOmset').innerText = formatRupiah(weekOmset);
    document.getElementById('weekHpp').innerText = formatRupiah(weekHpp);
    document.getElementById('weekLaba').innerText = formatRupiah(weekLaba);
    document.getElementById('weekMargin').innerText = `${calcMargin(weekLaba, weekOmset)}%`;

    document.getElementById('monthOmset').innerText = formatRupiah(monthOmset);
    document.getElementById('monthHpp').innerText = formatRupiah(monthHpp);
    document.getElementById('monthLaba').innerText = formatRupiah(monthLaba);
    document.getElementById('monthMargin').innerText = `${calcMargin(monthLaba, monthOmset)}%`;

    renderRiwayat();
};

const renderRiwayat = () => {
    const tbody = document.getElementById('riwayatTableBody');
    tbody.innerHTML = '';
    [...transactions].reverse().forEach(t => {
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700 text-xs">
                <td class="p-3 border-b dark:border-gray-600">${t.date}</td>
                <td class="p-3 border-b dark:border-gray-600 font-mono">${t.id}</td>
                <td class="p-3 border-b dark:border-gray-600">${t.items.reduce((sum, item) => sum + item.qty, 0)} item</td>
                <td class="p-3 border-b dark:border-gray-600 font-bold text-green-600">${formatRupiah(t.total)}</td>
            </tr>
        `;
    });
};

const secureResetLaporan = () => {
    if (!currentUser || currentUser.role !== 'owner') return;
    Swal.fire({ title: 'Reset Laporan', text: 'Masukkan password owner:', input: 'password', showCancelButton: true }).then((res) => {
        if (res.isConfirmed && res.value === 'owner123') {
            transactions = [];
            localStorage.setItem('pos_transactions', JSON.stringify(transactions));
            calculateDashboard();
        }
    });
};
