// --- STATE & DATA AWAL ---
let currentUser = null;
let theme = localStorage.getItem('theme') || 'light';

// Data Barang (Akan ditimpa oleh LocalStorage jika ada)
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

// --- INISIALISASI & TEMA ---
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
    Toast.fire({ icon: 'success', title: `Tema diubah ke ${theme === 'dark' ? 'Gelap' : 'Terang'}` });
});

// --- SISTEM LOGIN & LOGOUT ---
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
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
    Toast.fire({ icon: 'success', title: `Berhasil login sebagai ${userObj.role.toUpperCase()}` });
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

// --- RENDER APLIKASI BERDASARKAN ROLE ---
const renderApp = () => {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('userMenu').classList.remove('hidden');
    document.getElementById('userNameDisplay').innerText = `Halo, ${currentUser.username}`;

    // Atur visibilitas menu Owner
    const ownerMenus = document.getElementById('ownerMenus');
    if (currentUser.role === 'owner') {
        ownerMenus.classList.remove('hidden');
    } else {
        ownerMenus.classList.add('hidden');
    }

    // Buka halaman pertama (Kasir)
    switchView('view-kasir');
    updateAllViews();
};

// --- SISTEM NAVIGASI ---
const setupEventListeners = () => {
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.currentTarget.getAttribute('data-target');
            switchView(target);
            
            // Aktifkan styling menu terpilih
            document.querySelectorAll('.nav-btn').forEach(b => {
                b.classList.remove('bg-blue-50', 'dark:bg-gray-700', 'text-blue-600', 'dark:text-blue-400');
                b.classList.add('text-gray-600', 'dark:text-gray-300');
            });
            e.currentTarget.classList.add('bg-blue-50', 'dark:bg-gray-700', 'text-blue-600', 'dark:text-blue-400');
            e.currentTarget.classList.remove('text-gray-600', 'dark:text-gray-300');
        });
    });

    document.getElementById('searchProduct').addEventListener('input', (e) => {
        renderProducts(e.target.value);
    });

    document.getElementById('uangBayar').addEventListener('input', calculateChange);
    document.getElementById('btnCheckout').addEventListener('click', processCheckout);
    document.getElementById('formBarang').addEventListener('submit', saveProduct);
    document.getElementById('btnResetForm').addEventListener('click', resetProductForm);
    
    document.getElementById('btnExportExcel').addEventListener('click', exportToExcel);
    document.getElementById('btnExportPdf').addEventListener('click', exportToPDF);
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

// --- LOGIKA KASIR (POS) ---
const renderProducts = (searchQuery = '') => {
    const list = document.getElementById('productList');
    list.innerHTML = '';
    
    const filtered = products.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        p.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    filtered.forEach(p => {
        const div = document.createElement('div');
        div.className = `p-3 border rounded-xl cursor-pointer transition transform hover:scale-105 select-none ${p.stock <= 0 ? 'bg-red-50 border-red-200 opacity-60' : 'bg-gray-50 dark:bg-gray-700 dark:border-gray-600 hover:border-blue-500'}`;
        div.innerHTML = `
            <div class="text-xs text-gray-500 dark:text-gray-400 font-mono mb-1">${p.id}</div>
            <div class="font-bold text-sm mb-1 leading-tight line-clamp-2">${p.name}</div>
            <div class="text-blue-600 dark:text-blue-400 font-bold">${formatRupiah(p.price)}</div>
            <div class="text-xs mt-1 ${p.stock <= 0 ? 'text-red-500 font-bold' : 'text-gray-500 dark:text-gray-400'}">Stok: ${p.stock}</div>
        `;
        if(p.stock > 0) {
            div.onclick = () => addToCart(p);
        }
        list.appendChild(div);
    });
};

const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    if (existing) {
        if (existing.qty >= product.stock) {
            Toast.fire({ icon: 'warning', title: 'Stok tidak mencukupi!' });
            return;
        }
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
                        <button onclick="changeQty(${index}, -1)" class="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded text-sm">-</button>
                        <span class="text-sm font-bold w-4 text-center">${item.qty}</span>
                        <button onclick="changeQty(${index}, 1)" class="w-6 h-6 bg-gray-200 dark:bg-gray-600 rounded text-sm">+</button>
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
    if (item.qty > product.stock) {
        item.qty = product.stock;
        Toast.fire({ icon: 'warning', title: 'Maksimal stok tercapai!' });
    }
    if (item.qty <= 0) {
        cart.splice(index, 1);
    }
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

    // Potong Stok
    cart.forEach(cartItem => {
        const prodIndex = products.findIndex(p => p.id === cartItem.id);
        if (prodIndex > -1) products[prodIndex].stock -= cartItem.qty;
    });

    // Catat Transaksi
    const hppTotal = cart.reduce((sum, item) => sum + (item.hpp * item.qty), 0);
    const trx = {
        id: `TRX-${Date.now()}`,
        date: new Date().toLocaleString('id-ID'),
        items: [...cart],
        total: total,
        hpp: hppTotal,
        laba: total - hppTotal,
        bayar: bayar,
        kembali: bayar - total
    };
    transactions.push(trx);

    // Simpan ke LocalStorage
    localStorage.setItem('pos_products', JSON.stringify(products));
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));

    // Reset Kasir UI
    cart = [];
    document.getElementById('uangBayar').value = '';
    updateCartUI();
    updateAllViews();

    Swal.fire({
        icon: 'success',
        title: 'Transaksi Sukses!',
        text: `Kembalian: ${formatRupiah(trx.kembali)}`,
        confirmButtonColor: '#3085d6'
    });
};

// --- CEK STOK (Kasir & Owner) ---
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

// --- KELOLA BARANG (Khusus Owner) ---
const renderKelolaBarang = () => {
    const tbody = document.getElementById('kelolaTableBody');
    tbody.innerHTML = '';
    
    let totalModalSemuaBarang = 0; // Variabel penampung nilai modal total

    products.forEach((p, idx) => {
        // Akumulasi perhitungan HPP x Stok ke total modal
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
                    <button onclick="editProduct(${idx})" class="bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded text-xs transition"><i class="fas fa-edit"></i></button>
                    <button onclick="deleteProduct(${idx})" class="bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs transition"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `;
    });

    // Menampilkan total modal ke elemen HTML
    const totalModalEl = document.getElementById('totalModalBarang');
    if (totalModalEl) {
        totalModalEl.innerText = formatRupiah(totalModalSemuaBarang);
    }
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
        // Tambah baru, cek duplikasi SKU
        if (products.some(p => p.id === itemObj.id)) {
            return Swal.fire({ icon: 'error', title: 'Gagal', text: 'SKU sudah terdaftar!' });
        }
        products.push(itemObj);
        Toast.fire({ icon: 'success', title: 'Barang berhasil ditambahkan' });
    } else {
        // Update data lama
        const idx = parseInt(idObj);
        products[idx] = itemObj;
        Toast.fire({ icon: 'success', title: 'Barang berhasil diupdate' });
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
    Swal.fire({
        title: 'Hapus Barang?',
        text: "Data barang akan dihapus permanen!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, Hapus!'
    }).then((result) => {
        if (result.isConfirmed) {
            products.splice(idx, 1);
            localStorage.setItem('pos_products', JSON.stringify(products));
            updateAllViews();
            Toast.fire({ icon: 'success', title: 'Barang dihapus' });
        }
    });
};

const resetProductForm = () => {
    document.getElementById('formBarang').reset();
    document.getElementById('editId').value = '';
};

// --- LAPORAN & DASHBOARD ---
const calculateDashboard = () => {
    let totalOmset = 0;
    let totalHpp = 0;
    let totalLaba = 0;

    transactions.forEach(t => {
        totalOmset += t.total;
        totalHpp += t.hpp;
        totalLaba += t.laba;
    });

    const marginProfit = totalOmset > 0 ? Math.round((totalLaba / totalOmset) * 100) : 0;

    document.getElementById('repOmset').innerText = formatRupiah(totalOmset);
    document.getElementById('repHpp').innerText = formatRupiah(totalHpp);
    document.getElementById('repLaba').innerText = formatRupiah(totalLaba);
    document.getElementById('repMargin').innerText = `${marginProfit}%`;

    renderRiwayat();
};

const renderRiwayat = () => {
    const tbody = document.getElementById('riwayatTableBody');
    tbody.innerHTML = '';
    [...transactions].reverse().forEach(t => {
        tbody.innerHTML += `
            <tr class="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td class="p-3 border-b dark:border-gray-600 text-xs">${t.date}</td>
                <td class="p-3 border-b dark:border-gray-600 font-mono text-xs">${t.id}</td>
                <td class="p-3 border-b dark:border-gray-600">${t.items.reduce((sum, item) => sum + item.qty, 0)}</td>
                <td class="p-3 border-b dark:border-gray-600 font-bold text-green-600">${formatRupiah(t.total)}</td>
            </tr>
        `;
    });
};

// --- EXPORT DATA ---
const exportToExcel = () => {
    if(transactions.length === 0) return Toast.fire({ icon: 'error', title: 'Belum ada transaksi!' });
    
    const data = transactions.map(t => ({
        'ID Transaksi': t.id,
        'Tanggal': t.date,
        'Total Omset': t.total,
        'Total HPP': t.hpp,
        'Laba Bersih': t.laba
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan Keuangan");
    XLSX.writeFile(workbook, `Laporan_POS_${Date.now()}.xlsx`);
};

const exportToPDF = () => {
    if(transactions.length === 0) return Toast.fire({ icon: 'error', title: 'Belum ada transaksi!' });
    const element = document.getElementById('reportContainer');
    const opt = {
        margin:       0.5,
        filename:     `Laporan_POS_${Date.now()}.pdf`,
        image:        { type: 'jpeg', quality: 0.98 },
        html2canvas:  { scale: 2 },
        jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
};
