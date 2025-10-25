const api = "https://fakestoreapi.com/products";

// show skeleton placeholders while products load
function showSkeletons(count = 8) {
    const productContainer = document.getElementById("product-list");
    if (!productContainer) return;
    productContainer.innerHTML = "";

    for (let i = 0; i < count; i++) {
        const skel = document.createElement("div");
        skel.className = "col-12 col-md-4 col-lg-3 mb-5 pb-4";
        skel.innerHTML = `
            <div class="product-item" aria-hidden="true">
                <div class="skeleton skeleton-thumbnail" style="width:200px;height:200px;margin:0 auto 30px;border-radius:8px;"></div>
                <div class="skeleton skeleton-text" style="width:70%;height:18px;margin:0 auto 12px;border-radius:4px;"></div>
                <div class="skeleton skeleton-price" style="width:40%;height:20px;margin:0 auto;border-radius:4px;"></div>
            </div>
        `;
        productContainer.appendChild(skel);
    }
}

async function fetchProducts() {
    const productContainer = document.getElementById("product-list");
    if (!productContainer) return;

    // read data-max attribute from the product container.
    // If it's a number, we use that as a limit for both skeletons and final render.
    // If it's "all" or missing, we render all returned products.
    const maxAttr = productContainer.dataset.max; // e.g. "6" or "all"
    const max = maxAttr && !isNaN(parseInt(maxAttr, 10)) ? parseInt(maxAttr, 10) : null;

    // show skeleton placeholders: use max if provided, otherwise show a reasonable default (9)
    showSkeletons(max || 9);

    try {
        const response = await fetch(api);
        const products = await response.json();

        if (!Array.isArray(products)) {
            productContainer.innerHTML = '<p class="text-danger">No products available.</p>';
            return;
        }

        // cache products by id for quick lookup when adding to cart
        window.__productsCache = {};
        products.forEach(p => window.__productsCache[p.id] = p);

        // If max is defined (number), show only that many items. Otherwise show all.
        const toRender = max ? products.slice(0, max) : products;
        displayProducts(toRender);
    } catch (error) {
        console.error("Error fetching products:", error);
        productContainer.innerHTML = '<p class="text-danger">Failed to load products.</p>';
    }
}
fetchProducts();

function displayProducts(products) {
    const productContainer = document.getElementById("product-list");
    if (!productContainer) return;
    productContainer.innerHTML = "";

        products.forEach(product => {
                const productCard = document.createElement("div");
                productCard.className = "col-12 col-md-4 col-lg-3 mb-5 pb-4";
                productCard.innerHTML = `
                                <div class="product-card">
                                    <a class="product-item" href="#" data-id="${product.id}">
                                        <img src="${product.image}" loading="lazy" class="product-thumbnail object-cover" width="200" height="200" alt="${escapeHtml(product.title)}">
                                        <h3 class="product-title">${escapeHtml(product.title)}</h3>
                                        <strong class="product-price">$${product.price}</strong>
                                    </a>
                                    <div class="text-center mt-2">
                                        <button class="btn btn-sm btn-primary add-to-cart" data-id="${product.id}">+ Add</button>
                                    </div>
                                </div>
                `;
                productContainer.appendChild(productCard);
        });
}

// small helper to avoid injecting raw HTML into attributes/text
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/[&<>"']/g, function (s) {
        return ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        })[s];
    });
}

// CART utilities (localStorage-based)
function getCart() {
    try {
        const raw = localStorage.getItem('cart');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        console.error('Failed to parse cart from storage', e);
        return [];
    }
}

function saveCart(cart) {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
}

function findCartItem(cart, id) {
    return cart.find(i => String(i.id) === String(id));
}

function addToCart(productId, qty = 1) {
    const product = window.__productsCache && window.__productsCache[productId];
    if (!product) {
        console.warn('Product not found in cache, cannot add to cart', productId);
        return;
    }

    const cart = getCart();
    let item = findCartItem(cart, productId);
    if (item) {
        item.qty = (item.qty || 0) + qty;
    } else {
        item = {
            id: product.id,
            title: product.title,
            price: product.price,
            image: product.image,
            qty: qty
        };
        cart.push(item);
    }
    saveCart(cart);
}

function updateCartBadge() {
    const cart = getCart();
    const totalCount = cart.reduce((s, i) => s + (i.qty || 0), 0);
    // find cart link in header
    const cartLink = document.querySelector('a[href="cart.html"]');
    if (!cartLink) return;

    let badge = cartLink.querySelector('.cart-count-badge');
    if (!badge) {
        badge = document.createElement('span');
        badge.className = 'cart-count-badge';
        badge.style.cssText = 'background:#f9bf29;color:#000;padding:2px 6px;border-radius:12px;margin-left:6px;font-weight:700;font-size:12px;';
        cartLink.appendChild(badge);
    }
    badge.textContent = totalCount;
}

// Render cart page table if present
function renderCartPage() {
    const tableBody = document.querySelector('.site-blocks-table table tbody');
    if (!tableBody) return;
    const cart = getCart();
    if (!cart.length) {
        tableBody.innerHTML = '<tr><td colspan="6">Your cart is empty.</td></tr>';
        updateCartTotals();
        return;
    }

    tableBody.innerHTML = '';
    cart.forEach(item => {
        const tr = document.createElement('tr');
        tr.dataset.id = item.id;
        tr.innerHTML = `
            <td class="product-thumbnail"><img src="${item.image}" alt="" class="img-fluid" style="max-width:100px;"></td>
            <td class="product-name"><h2 class="h5 text-black">${escapeHtml(item.title)}</h2></td>
            <td>$${Number(item.price).toFixed(2)}</td>
            <td>
              <div class="input-group mb-3 d-flex align-items-center quantity-container" style="max-width: 120px;">
                <div class="input-group-prepend">
                  <button class="btn btn-outline-black decrease" type="button">&minus;</button>
                </div>
                <input type="text" class="form-control text-center quantity-amount" value="${item.qty}" />
                <div class="input-group-append">
                  <button class="btn btn-outline-black increase" type="button">&plus;</button>
                </div>
              </div>
            </td>
            <td class="product-row-total">$${(item.qty * item.price).toFixed(2)}</td>
            <td><a href="#" class="btn btn-black btn-sm remove-item">X</a></td>
        `;
        tableBody.appendChild(tr);
    });

    // attach listeners for increase/decrease/remove
    tableBody.querySelectorAll('.increase').forEach(btn => btn.addEventListener('click', e => {
        const tr = e.target.closest('tr');
        changeQuantity(tr.dataset.id, 1);
    }));

    tableBody.querySelectorAll('.decrease').forEach(btn => btn.addEventListener('click', e => {
        const tr = e.target.closest('tr');
        changeQuantity(tr.dataset.id, -1);
    }));

    tableBody.querySelectorAll('.remove-item').forEach(btn => btn.addEventListener('click', e => {
        e.preventDefault();
        const tr = e.target.closest('tr');
        removeCartItem(tr.dataset.id);
    }));

    // also update totals
    updateCartTotals();
}

function changeQuantity(id, delta) {
    const cart = getCart();
    const item = findCartItem(cart, id);
    if (!item) return;
    item.qty = Math.max(0, (item.qty || 0) + delta);
    if (item.qty === 0) {
        const idx = cart.findIndex(i => String(i.id) === String(id));
        if (idx > -1) cart.splice(idx, 1);
    }
    saveCart(cart);
    renderCartPage();
}

function removeCartItem(id) {
    const cart = getCart();
    const idx = cart.findIndex(i => String(i.id) === String(id));
    if (idx > -1) cart.splice(idx, 1);
    saveCart(cart);
    renderCartPage();
}

function updateCartTotals() {
    const cart = getCart();
    const subtotal = cart.reduce((s, i) => s + (i.price * (i.qty || 0)), 0);
    // find the cart totals container and update the subtotal/total values there
    const totalsContainer = document.querySelector('.col-md-7');
    if (totalsContainer) {
        totalsContainer.querySelectorAll('.text-black strong').forEach(el => {
            el.textContent = `$${subtotal.toFixed(2)}`;
        });
    }
}

// Event delegation for add-to-cart and product-item clicks
document.addEventListener('click', function (e) {
    const addBtn = e.target.closest && e.target.closest('.add-to-cart');
    if (addBtn) {
        const id = addBtn.dataset.id;
        addToCart(id, 1);
        // small visual feedback: change button text briefly
        const original = addBtn.textContent;
        addBtn.textContent = 'Added';
        setTimeout(() => addBtn.textContent = original, 1200);
        e.preventDefault();
        return;
    }

    // Update Cart button (text-based detection) - updates quantities from inputs
    const btn = e.target.closest && e.target.closest('button');
    if (btn && btn.textContent && btn.textContent.trim().toLowerCase().includes('update cart')) {
        // read quantities from table and save
        const rows = document.querySelectorAll('.site-blocks-table table tbody tr');
        const cart = getCart();
        rows.forEach(row => {
            const id = row.dataset.id;
            if (!id) return;
            const input = row.querySelector('.quantity-amount');
            if (!input) return;
            const v = parseInt(input.value, 10) || 0;
            const item = findCartItem(cart, id);
            if (item) item.qty = v;
        });
        // remove zero qty items
        const cleaned = cart.filter(i => i.qty && i.qty > 0);
        saveCart(cleaned);
        renderCartPage();
        e.preventDefault();
        return;
    }

    const productItem = e.target.closest && e.target.closest('.product-item');
    if (productItem) {
        const id = productItem.dataset.id;
        if (id) {
            addToCart(id, 1);
            // optional navigate to cart: keep on same page, user wanted add-only
            const original = productItem.textContent;
            // flash border
            productItem.style.outline = '3px solid rgba(249,191,41,0.6)';
            setTimeout(() => productItem.style.outline = '', 700);
            e.preventDefault();
        }
    }
});

// on load update badge and render cart page if present
document.addEventListener('DOMContentLoaded', function () {
    updateCartBadge();
    renderCartPage();
});

