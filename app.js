let products = JSON.parse(localStorage.getItem('pos_products')) || [];
let transactions = JSON.parse(localStorage.getItem('pos_transactions')) || [];
let cart = [];

function switchView(view) {
    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
    document.getElementById('view-' + view).classList.remove('hidden');
}

// Fitur Capture Laporan
window.captureReport = () => {
    html2canvas(document.querySelector("#captureArea")).then(canvas => {
        let link = document.createElement('a');
        link.download = 'Laporan_Harian_Fajri_Mandiri.png';
        link.href = canvas.toDataURL();
        link.click();
    });
};

// Fungsi Statistik & Render
function updateDashboard() {
    let today = new Date().toLocaleDateString();
    let todayTrx = transactions.filter(t => t.date.includes(today));
    let totalOmset = todayTrx.reduce((s, t) => s + t.total, 0);
    
    document.getElementById('kasirHistory').innerHTML = todayTrx.map(t => 
        `<div>${t.date.split(',')[1]} - Rp${t.total.toLocaleString()}</div>`
    ).join('');
    
    document.getElementById('stats').innerHTML = `Total Penjualan: Rp${totalOmset.toLocaleString()}`;
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

// Proses Simpan & Hapus Tetap Sama seperti sebelumnya...
document.getElementById('formBarang').onsubmit = (e) => {
    e.preventDefault();
    let hpp = parseFloat(document.getElementById('itemHpp').value);
    let price = parseFloat(document.getElementById('itemPrice').value);
    if (price < (hpp * 1.3)) return Swal.fire('Error', 'Margin minimal 30%!', 'error');
    
    products.push({
        id: document.getElementById('itemSku').value,
        name: document.getElementById('itemName').value,
        hpp, price,
        stock: parseInt(document.getElementById('itemStock').value)
    });
    localStorage.setItem('pos_products', JSON.stringify(products));
    renderProducts();
    Swal.fire('Sukses', 'Barang tersimpan', 'success');
};

window.secureDeleteTransaction = (idx) => {
    Swal.fire({ title: 'Password Owner:', input: 'password' }).then(res => {
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
            updateDashboard();
            Swal.fire('Berhasil', 'Stok dikembalikan', 'success');
        }
    });
};

function renderProducts() {
    document.getElementById('productGrid').innerHTML = products.map((p, i) => 
        `<button onclick="cart.push({...products[${i}], qty:1}); renderCart()" class="border p-2 bg-white rounded">${p.name} (${p.stock})</button>`
    ).join('');
}

function renderCart() {
    document.getElementById('cartList').innerHTML = cart.map((c, i) => `<div>${c.name} - Rp${c.price}</div>`).join('');
}

document.getElementById('btnCheckout').onclick = () => {
    let total = cart.reduce((s, c) => s + c.price, 0);
    let trx = { id: 'TRX-'+Date.now(), date: new Date().toLocaleString(), items: cart, total: total };
    cart.forEach(c => { let p = products.find(prod => prod.id === c.id); if(p) p.stock -= 1; });
    transactions.push(trx);
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
    localStorage.setItem('pos_products', JSON.stringify(products));
    
    document.getElementById('printContainer').innerHTML = `Fajri Mandiri Toys<br>Nota ${trx.id}<br>Total: ${total}`;
    window.print();
    cart = []; renderCart(); renderRiwayat(); updateDashboard();
    Swal.fire('Sukses', 'Transaksi Berhasil', 'success');
};

function renderRiwayat() {
    document.getElementById('riwayatTableBody').innerHTML = transactions.map((t, i) => 
        `<tr><td class="p-2">${t.date}</td><td class="p-2">${t.total}</td><td class="p-2"><button onclick="secureDeleteTransaction(${i})" class="text-red-500">Hapus</button></td></tr>`
    ).join('');
}

renderProducts(); renderRiwayat(); updateDashboard();
