let products = JSON.parse(localStorage.getItem('pos_products')) || [];
let transactions = JSON.parse(localStorage.getItem('pos_transactions')) || [];
let cart = [];

function switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + view).classList.remove('hidden');
}

// Logika Margin 2 Arah
window.calculateMarginFromPrice = () => {
    let hpp = parseFloat(document.getElementById('itemHpp').value) || 0;
    let price = parseFloat(document.getElementById('itemPrice').value) || 0;
    if (hpp > 0) document.getElementById('itemMargin').value = Math.round(((price - hpp) / hpp) * 100);
};

window.calculatePriceFromMargin = () => {
    let hpp = parseFloat(document.getElementById('itemHpp').value) || 0;
    let margin = parseFloat(document.getElementById('itemMargin').value) || 0;
    document.getElementById('itemPrice').value = Math.ceil(hpp * (1 + (margin / 100)));
};

// Proses Simpan Barang
document.getElementById('formBarang').onsubmit = (e) => {
    e.preventDefault();
    let hpp = parseFloat(document.getElementById('itemHpp').value);
    let price = parseFloat(document.getElementById('itemPrice').value);
    
    if (price < (hpp * 1.3)) return Swal.fire('Error', 'Margin minimal 30%!', 'error');

    let item = {
        id: document.getElementById('itemSku').value,
        name: document.getElementById('itemName').value,
        hpp, price,
        stock: parseInt(document.getElementById('itemStock').value)
    };
    products.push(item);
    localStorage.setItem('pos_products', JSON.stringify(products));
    renderProducts();
    Swal.fire('Sukses', 'Barang tersimpan', 'success');
};

// Hapus Transaksi + Kembalikan Stok
window.secureDeleteTransaction = (idx) => {
    Swal.fire({
        title: 'Keamanan Ganda',
        text: 'Masukkan Password Owner:',
        input: 'password',
    }).then(res => {
        if (res.value === 'owner123') {
            let t = transactions[idx];
            t.items.forEach(item => {
                let p = products.find(prod => prod.id === item.id);
                if (p) p.stock += item.qty;
            });
            transactions.splice(idx, 1);
            localStorage.setItem('pos_transactions', JSON.stringify(transactions));
            localStorage.setItem('pos_products', JSON.stringify(products));
            renderRiwayat();
            renderKasirHistory(); // Update statistik kasir
            Swal.fire('Berhasil', 'Data dihapus & stok dikembalikan', 'success');
        }
    });
};

function renderProducts() {
    let grid = document.getElementById('productGrid');
    grid.innerHTML = products.map((p, i) => `<button onclick="addToCart(${i})" class="border p-2 bg-white rounded shadow-sm hover:bg-gray-50">${p.name} (${p.stock})</button>`).join('');
}

function addToCart(i) {
    cart.push({...products[i], qty: 1});
    renderCart();
}

function renderCart() {
    let list = document.getElementById('cartList');
    list.innerHTML = cart.map((c, i) => `<div class="border-b py-2">${c.name} - Rp${c.price.toLocaleString('id-ID')}</div>`).join('');
}

document.getElementById('btnCheckout').onclick = () => {
    if (cart.length === 0) return Swal.fire('Gagal', 'Keranjang kosong!', 'error');

    let total = cart.reduce((s, c) => s + c.price, 0);
    let trx = { id: 'TRX-'+Date.now(), date: new Date().toLocaleString('id-ID'), items: cart, total: total };
    
    cart.forEach(c => {
        let p = products.find(prod => prod.id === c.id);
        if(p) p.stock -= 1;
    });

    transactions.push(trx);
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
    localStorage.setItem('pos_products', JSON.stringify(products));
    
    // Print Fix
    document.getElementById('printContainer').innerHTML = `
        <div style="text-align:center; font-weight:bold;">FAJRI MANDIRI TOYS</div>
        <div>------------------------</div>
        Nota: ${trx.id} <br> 
        Waktu: ${trx.date} <br>
        <div>------------------------</div>
        Total: Rp${total.toLocaleString('id-ID')}
    `;
    window.print();
    
    cart = [];
    renderCart();
    renderRiwayat();
    renderKasirHistory(); // Update statistik kasir otomatis
    Swal.fire('Sukses', 'Transaksi Berhasil', 'success');
};

function renderRiwayat() {
    let body = document.getElementById('riwayatTableBody');
    body.innerHTML = transactions.map((t, i) => `<tr><td class="p-2">${t.date}</td><td class="p-2">Rp${t.total.toLocaleString('id-ID')}</td><td class="p-2"><button onclick="secureDeleteTransaction(${i})" class="text-red-500 font-bold">Hapus</button></td></tr>`).join('');
}

// FUNGSI BARU: Render History Penjualan Hari Ini & Statistik
function renderKasirHistory() {
    let todayDateStr = new Date().toLocaleDateString('id-ID'); // Format: DD/MM/YYYY
    let todayTransactions = transactions.filter(t => t.date.includes(todayDateStr));
    
    // List history
    let historyHtml = todayTransactions.map(t => {
        let timeOnly = t.date.split(' ')[1] || t.date;
        return `<div class="flex justify-between border-b border-gray-200 py-1"><span>${timeOnly}</span><span class="text-green-600 font-bold">Rp${t.total.toLocaleString('id-ID')}</span></div>`;
    }).join('');
    
    document.getElementById('kasirHistory').innerHTML = historyHtml || '<div class="text-gray-400 italic">Belum ada transaksi hari ini</div>';

    // Statistik Total
    let totalOmsetHariIni = todayTransactions.reduce((sum, t) => sum + t.total, 0);
    let totalItemHariIni = todayTransactions.reduce((sum, t) => sum + t.items.reduce((s, item) => s + item.qty, 0), 0);

    document.getElementById('kasirStats').innerHTML = `
        <div class="flex justify-between mb-1"><span>Total Item Terjual:</span> <span>${totalItemHariIni} Item</span></div>
        <div class="flex justify-between text-lg"><span>Total Omset:</span> <span>Rp${totalOmsetHariIni.toLocaleString('id-ID')}</span></div>
    `;
}

// FUNGSI BARU: Fitur Capture/Screenshot Laporan
window.captureReport = () => {
    let captureElement = document.getElementById('captureArea');
    
    // Gunakan html2canvas untuk mengubah elemen HTML menjadi gambar
    html2canvas(captureElement, { backgroundColor: '#ffffff' }).then(canvas => {
        let imgData = canvas.toDataURL("image/png");
        let link = document.createElement('a');
        link.download = `Laporan_Harian_FajriMandiriToys_${Date.now()}.png`;
        link.href = imgData;
        link.click();
    });
};

// Initial Render
renderProducts();
renderRiwayat();
renderKasirHistory(); // Panggil saat web pertama dimuat
