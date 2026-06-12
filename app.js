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
            Swal.fire('Berhasil', 'Data dihapus & stok dikembalikan', 'success');
        }
    });
};

function renderProducts() {
    let grid = document.getElementById('productGrid');
    grid.innerHTML = products.map((p, i) => `<button onclick="addToCart(${i})" class="border p-2">${p.name} (${p.stock})</button>`).join('');
}

function addToCart(i) {
    cart.push({...products[i], qty: 1});
    renderCart();
}

function renderCart() {
    let list = document.getElementById('cartList');
    list.innerHTML = cart.map((c, i) => `<div>${c.name} - Rp${c.price}</div>`).join('');
}

document.getElementById('btnCheckout').onclick = () => {
    let total = cart.reduce((s, c) => s + c.price, 0);
    let trx = { id: 'TRX-'+Date.now(), date: new Date().toLocaleString(), items: cart, total: total };
    
    cart.forEach(c => {
        let p = products.find(prod => prod.id === c.id);
        if(p) p.stock -= 1;
    });

    transactions.push(trx);
    localStorage.setItem('pos_transactions', JSON.stringify(transactions));
    localStorage.setItem('pos_products', JSON.stringify(products));
    
    // Print Fix
    document.getElementById('printContainer').innerHTML = `Nota ${trx.id} - Total: ${total}`;
    window.print();
    
    cart = [];
    renderCart();
    renderRiwayat();
    Swal.fire('Sukses', 'Transaksi Berhasil', 'success');
};

function renderRiwayat() {
    let body = document.getElementById('riwayatTableBody');
    body.innerHTML = transactions.map((t, i) => `<tr><td class="p-2">${t.date}</td><td class="p-2">${t.total}</td><td class="p-2"><button onclick="secureDeleteTransaction(${i})" class="text-red-500">Hapus</button></td></tr>`).join('');
}

// Initial Render
renderProducts();
renderRiwayat();
