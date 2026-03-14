// ══════════════════════════════════════
//   CONFIGURACIÓN — edita solo esto
// ══════════════════════════════════════
const STORAGE_KEY = 'ld_catalog';
const WA_NUMBER   = '59163504900'; // Número WhatsApp con código de país, sin +
const IMG_FALLBACK = 'https://images.unsplash.com/photo-1599401053169-251f044996e3?auto=format&fit=crop&q=80&w=800';

// ══ Estado global ══
let prodSeleccionado = null;
let qty = 1;
let currentFilter = 'todos';
let searchTerm    = '';

// ══════════════════════════════════════
//   LEER CATÁLOGO DESDE localStorage
// ══════════════════════════════════════
function getCatalog() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
}

function filteredCatalog() {
    let data = getCatalog();
    if (searchTerm) {
        const q = searchTerm.toLowerCase();
        data = data.filter(p =>
            p.nombre.toLowerCase().includes(q) ||
            (p.descripcion || '').toLowerCase().includes(q)
        );
    }
    if (currentFilter === 'disponible') data = data.filter(p => parseInt(p.stock) > 3);
    if (currentFilter === 'bajo')       data = data.filter(p => parseInt(p.stock) > 0 && parseInt(p.stock) <= 3);
    if (currentFilter === 'agotado')    data = data.filter(p => parseInt(p.stock) === 0);
    return data;
}

// ══════════════════════════════════════
//   RENDERIZAR CARDS
// ══════════════════════════════════════
function render() {
    const data    = filteredCatalog();
    const total   = getCatalog().length;
    const grid    = document.getElementById('productos-grid');
    const empty   = document.getElementById('empty-state');
    const counter = document.getElementById('result-count');

    if (!total) {
        grid.innerHTML = '';
        empty.classList.add('visible');
        counter.textContent = '';
        return;
    }
    empty.classList.remove('visible');

    counter.textContent = data.length === total
        ? `${total} elixir${total !== 1 ? 'es' : ''} en bodega`
        : `${data.length} de ${total} productos`;

    if (!data.length) {
        grid.innerHTML = `<p class="col-span-full text-center" style="color:#6b7280;font-style:italic;padding:48px 0;grid-column:1/-1">Sin resultados para esa búsqueda.</p>`;
        return;
    }

    grid.innerHTML = data.map((p, i) => {
        const stock   = parseInt(p.stock) || 0;
        const agotado = stock === 0;
        const bajo    = !agotado && stock <= 3;

        return `
        <div class="glass-card prod-card animate__animated animate__fadeInUp" style="animation-delay:${i * 80}ms">
            <div class="card-img-wrap">
                <img src="${p.imagen || IMG_FALLBACK}"
                     onerror="this.src='${IMG_FALLBACK}'"
                     loading="lazy"
                     alt="${p.nombre}">
                ${agotado ? `
                <div class="agotado-overlay">
                    <span class="font-gold" style="font-size:1.2rem;letter-spacing:.15em">AGOTADO</span>
                </div>` : ''}
                ${bajo ? `
                <span class="badge-low badge-stock-low">Solo ${stock} u.</span>` : ''}
            </div>
            <div class="card-body">
                <h3 class="card-title">${p.nombre}</h3>
                ${p.descripcion
                    ? `<p class="card-desc">${p.descripcion}</p>`
                    : '<div style="flex:1;margin-bottom:20px"></div>'}
                <div class="card-footer">
                    <span class="card-price">Bs. ${parseFloat(p.precio).toFixed(2)}</span>
                    <button
                        onclick="abrirPedidoById('${p.id}')"
                        ${agotado ? 'disabled' : ''}
                        class="card-btn">
                        ${agotado ? 'Sin reserva' : 'Solicitar'}
                    </button>
                </div>
            </div>
        </div>`;
    }).join('');
}

// ══════════════════════════════════════
//   MODAL
// ══════════════════════════════════════
function abrirPedidoById(id) {
    const prod = getCatalog().find(p => p.id === id);
    if (!prod) return;
    abrirPedido(prod);
}

function abrirPedido(prod) {
    prodSeleccionado = prod;
    qty = 1;
    document.getElementById('prod-nombre-modal').textContent = prod.nombre;
    document.getElementById('prod-desc-modal').textContent   = prod.descripcion || '';
    document.getElementById('order-qty').textContent = '1';
    document.getElementById('order-form').reset();
    actualizarTotal();
    document.getElementById('modal-pedido').classList.add('open');
    document.body.style.overflow = 'hidden';
}

function cerrarModal() {
    document.getElementById('modal-pedido').classList.remove('open');
    document.body.style.overflow = '';
}

function modQ(v) {
    qty = Math.max(1, Math.min(qty + v, parseInt(prodSeleccionado.stock) || 1));
    document.getElementById('order-qty').textContent = qty;
    actualizarTotal();
}

function actualizarTotal() {
    const t = qty * parseFloat(prodSeleccionado.precio || 0);
    document.getElementById('order-total').textContent = `Bs. ${t.toFixed(2)}`;
}

// ══════════════════════════════════════
//   ENVIAR PEDIDO POR WHATSAPP
// ══════════════════════════════════════
function finalizarPedido(e) {
    e.preventDefault();

    const nom   = document.getElementById('order-nom').value.trim();
    const ci    = document.getElementById('order-ci').value.trim();
    const tel   = document.getElementById('order-tel').value.trim();
    const ciu   = document.getElementById('order-city').value;
    const total = (qty * parseFloat(prodSeleccionado.precio)).toFixed(2);

    confetti({
        particleCount: 160, spread: 75, origin: { y: 0.6 },
        colors: ['#d4af37', '#fbf5b7', '#ffffff', '#aa8414']
    });

    const imgUrl = prodSeleccionado.imagen || IMG_FALLBACK;

    const msg = encodeURIComponent(
        `✨ *LICOR DORADO — NUEVO PEDIDO* ✨\n\n` +
        `🖼️ *Imagen del producto:*\n${imgUrl}\n\n` +
        `📦 *Producto:* ${prodSeleccionado.nombre}\n` +
        `🔢 *Cantidad:* ${qty} botella(s)\n` +
        `💰 *Total:* Bs. ${total}\n\n` +
        `👤 *Cliente:* ${nom}\n` +
        `🆔 *C.I.:* ${ci}\n` +
        `📱 *WhatsApp:* ${tel}\n` +
        `📍 *Departamento:* ${ciu}\n\n` +
        `_Solicito la reserva de este elixir. ¡Gracias!_`
    );

    setTimeout(() => {
        window.open(`https://wa.me/${WA_NUMBER}?text=${msg}`, '_blank');
        cerrarModal();
    }, 900);
}

// ══════════════════════════════════════
//   FILTROS Y BÚSQUEDA
// ══════════════════════════════════════
document.getElementById('filtros').addEventListener('click', e => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentFilter = btn.dataset.filter;
    render();
});

document.getElementById('search').addEventListener('input', e => {
    searchTerm = e.target.value.trim();
    render();
});

// ══════════════════════════════════════
//   CERRAR MODAL (teclado + fondo)
// ══════════════════════════════════════
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') cerrarModal();
});

document.getElementById('modal-pedido').addEventListener('click', e => {
    if (e.target === document.getElementById('modal-pedido')) cerrarModal();
});

// ══════════════════════════════════════
//   PARALLAX HERO
// ══════════════════════════════════════
window.addEventListener('scroll', () => {
    const heroBg = document.getElementById('hero-bg');
    if (heroBg) {
        heroBg.style.transform = `scale(${1.05 + window.scrollY / 5000})`;
    }
});

// ══════════════════════════════════════
//   SINCRONIZACIÓN EN TIEMPO REAL
//   (si admin.html está abierto en otra
//    pestaña del mismo origen)
// ══════════════════════════════════════
window.addEventListener('storage', e => {
    if (e.key === STORAGE_KEY) render();
});

// ══ Render inicial ══
render();
