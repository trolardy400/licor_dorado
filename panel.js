// ══════════════════════════════════════
//   FIREBASE CONFIG
// ══════════════════════════════════════
import { initializeApp }                   from "https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js";
import { getFirestore, collection, doc,
         onSnapshot, addDoc, updateDoc,
         deleteDoc, serverTimestamp }       from "https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey:            "AIzaSyDPFlvN3Jo7yvbYChf60fTiNG0silDgpsQ",
    authDomain:        "licor-dorado.firebaseapp.com",
    projectId:         "licor-dorado",
    storageBucket:     "licor-dorado.firebasestorage.app",
    messagingSenderId: "849013431457",
    appId:             "1:849013431457:web:6dbb5893fb54c2614fa4e0"
};

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const col = collection(db, 'catalogo');

// ══ Estado ══
let productos = [];

// ══════════════════════════════════════
//   ESCUCHAR CAMBIOS EN TIEMPO REAL
// ══════════════════════════════════════
onSnapshot(col, snapshot => {
    productos = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLista();
});

// ══ Toast ══
function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 2800);
}

// ══════════════════════════════════════
//   RENDERIZAR LISTA
// ══════════════════════════════════════
function renderLista() {
    const lista   = document.getElementById('lista');
    const empty   = document.getElementById('empty-msg');
    const counter = document.getElementById('counter');
    const imgFallback = 'https://images.unsplash.com/photo-1599401053169-251f044996e3?auto=format&fit=crop&q=80&w=200';

    counter.textContent = `${productos.length} producto${productos.length !== 1 ? 's' : ''}`;

    if (!productos.length) {
        lista.innerHTML = '';
        empty.classList.add('visible');
        return;
    }
    empty.classList.remove('visible');

    lista.innerHTML = productos.map(p => {
        const stock      = parseInt(p.stock);
        const badgeClass = stock === 0 ? 'badge-zero' : stock <= 3 ? 'badge-low' : 'badge-ok';
        const badgeLabel = stock === 0 ? 'Agotado'    : stock <= 3 ? 'Stock bajo' : 'Disponible';

        return `
        <div class="glass producto-item">
            <img src="${p.imagen || imgFallback}"
                 onerror="this.src='${imgFallback}'"
                 class="producto-img" alt="${p.nombre}">

            <div class="producto-info">
                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                    <span class="producto-nombre">${p.nombre}</span>
                    <span class="badge-status ${badgeClass}">${badgeLabel}</span>
                </div>
                <p class="producto-precio">Bs. ${parseFloat(p.precio).toFixed(2)}</p>
                ${p.descripcion ? `<p class="producto-desc">${p.descripcion}</p>` : ''}
            </div>

            <div class="stock-controls">
                <button class="btn-stock" style="color:#f87171"
                        onclick="window._cambiarStock('${p.id}', -1)">−</button>
                <span class="stock-value">${p.stock}</span>
                <button class="btn-stock" style="color:#4ade80"
                        onclick="window._cambiarStock('${p.id}', 1)">+</button>
            </div>

            <div class="acciones">
                <button class="btn-accion btn-editar"
                        onclick="window._editarProducto('${p.id}')">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="btn-accion btn-eliminar"
                        onclick="window._eliminarProducto('${p.id}')">
                    <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"/>
                        <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                        <path d="M10 11v6M14 11v6M9 6V4h6v2"/>
                    </svg>
                </button>
            </div>
        </div>`;
    }).join('');
}

// ══════════════════════════════════════
//   CRUD
// ══════════════════════════════════════
window.guardar = async function() {
    const nombre = document.getElementById('f-nombre').value.trim();
    const precio = parseFloat(document.getElementById('f-precio').value);
    const stock  = parseInt(document.getElementById('f-stock').value);

    if (!nombre || isNaN(precio) || isNaN(stock)) {
        toast('⚠ Completa nombre, precio y stock');
        return;
    }

    const entry = {
        nombre,
        descripcion: document.getElementById('f-desc').value.trim(),
        precio:      parseFloat(precio.toFixed(2)),
        stock,
        imagen:      document.getElementById('f-img').value.trim() ||
                     'https://images.unsplash.com/photo-1599401053169-251f044996e3?auto=format&fit=crop&q=80&w=400',
        actualizado: serverTimestamp()
    };

    const editId = document.getElementById('edit-id').value;

    try {
        if (editId) {
            await updateDoc(doc(db, 'catalogo', editId), entry);
            toast('✓ Producto actualizado');
        } else {
            entry.creado = serverTimestamp();
            await addDoc(col, entry);
            toast('✓ Producto añadido al catálogo');
        }
        cancelarEdicion();
    } catch (err) {
        console.error(err);
        toast('✗ Error al guardar');
    }
};

window._cambiarStock = async function(id, delta) {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    const nuevoStock = Math.max(0, (parseInt(p.stock) || 0) + delta);
    try {
        await updateDoc(doc(db, 'catalogo', id), {
            stock: nuevoStock,
            actualizado: serverTimestamp()
        });
    } catch (err) {
        console.error(err);
        toast('✗ Error al actualizar stock');
    }
};

window._editarProducto = function(id) {
    const p = productos.find(x => x.id === id);
    if (!p) return;
    document.getElementById('edit-id').value  = id;
    document.getElementById('f-nombre').value = p.nombre;
    document.getElementById('f-desc').value   = p.descripcion || '';
    document.getElementById('f-precio').value = p.precio;
    document.getElementById('f-stock').value  = p.stock;
    document.getElementById('f-img').value    = p.imagen || '';
    document.getElementById('form-title').textContent = 'Editar Producto';
    document.getElementById('btn-cancelar').classList.add('visible');
    document.getElementById('f-nombre').focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.cancelarEdicion = function() {
    ['edit-id', 'f-nombre', 'f-desc', 'f-precio', 'f-stock', 'f-img'].forEach(id => {
        document.getElementById(id).value = '';
    });
    document.getElementById('form-title').textContent = 'Añadir Producto';
    document.getElementById('btn-cancelar').classList.remove('visible');
};

window._eliminarProducto = async function(id) {
    if (!confirm('¿Eliminar este producto del catálogo?')) return;
    try {
        await deleteDoc(doc(db, 'catalogo', id));
        toast('✓ Producto eliminado');
    } catch (err) {
        console.error(err);
        toast('✗ Error al eliminar');
    }
};

// ══════════════════════════════════════
//   EXPORTAR
// ══════════════════════════════════════
function dateTag() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function download(name, blob) {
    const url = URL.createObjectURL(blob);
    const a   = Object.assign(document.createElement('a'), { href: url, download: name });
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 800);
}

window.exportJSON = function() {
    if (!productos.length) { toast('⚠ El catálogo está vacío'); return; }
    const payload = { catalogo: productos, exportado: new Date().toISOString(), total: productos.length };
    download(`catalogo-ld-${dateTag()}.json`,
        new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    toast('✓ JSON descargado');
};

window.exportCSV = function() {
    if (!productos.length) { toast('⚠ El catálogo está vacío'); return; }
    const cols = ['nombre', 'descripcion', 'precio', 'stock', 'imagen'];
    const csv  = [cols.join(','), ...productos.map(p =>
        cols.map(c => `"${String(p[c] ?? '').replace(/"/g, '""')}"`).join(',')
    )].join('\n');
    download(`catalogo-ld-${dateTag()}.csv`,
        new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' }));
    toast('✓ CSV descargado');
};

window.imprimirPDF = function() {
    if (!productos.length) { toast('⚠ El catálogo está vacío'); return; }
    const fecha = new Date().toLocaleDateString('es-BO', {
        day: '2-digit', month: 'long', year: 'numeric'
    });
    const pv = document.getElementById('print-view');
    pv.innerHTML = `
        <style>
            body { background:#fff!important; color:#000!important; font-family:sans-serif }
            h1 { font-size:22px; font-weight:900; letter-spacing:4px; color:#8a6010; text-align:center; margin-bottom:4px }
            p.sub { text-align:center; font-size:11px; color:#999; margin-bottom:24px }
            table { width:100%; border-collapse:collapse; font-size:12px }
            th { background:#8a6010; color:#fff; padding:9px 12px; text-align:left; font-size:10px; text-transform:uppercase; letter-spacing:1px }
            td { padding:9px 12px; border-bottom:1px solid #eee }
            tr:nth-child(even) td { background:#faf8f2 }
            .foot { text-align:right; font-size:10px; color:#bbb; margin-top:12px }
        </style>
        <h1>LICOR DORADO</h1>
        <p class="sub">Catálogo de Bodega · ${fecha}</p>
        <table>
            <thead><tr><th>#</th><th>Producto</th><th>Descripción</th><th>Precio (Bs.)</th><th>Stock</th></tr></thead>
            <tbody>
                ${productos.map((p, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td><strong>${p.nombre}</strong></td>
                    <td style="color:#666">${p.descripcion || '—'}</td>
                    <td>${parseFloat(p.precio).toFixed(2)}</td>
                    <td>${p.stock}</td>
                </tr>`).join('')}
            </tbody>
        </table>
        <div class="foot">${productos.length} productos · Licor Dorado</div>`;
    pv.style.display = 'block';
    window.print();
    pv.style.display = 'none';
};
