document.addEventListener('DOMContentLoaded', () => {
    const cartItemsDiv = document.getElementById('cart-items');
    const totalPriceDiv = document.getElementById('total-price');
    const checkoutBtn = document.getElementById('checkout-btn');

    function loadCart() {
        fetch('/api/cart')
            .then(response => response.json())
            .then(data => {
                cartItemsDiv.innerHTML = '';
                let total = data.total;
                data.items.forEach(item => {
                    const cartItemDiv = document.createElement('div');
                    cartItemDiv.className = 'cart-item';
                    cartItemDiv.innerHTML = `
            <p><strong>${item.name}</strong></p>
            <p>Price: HKD ${item.discounted_price}</p>
            <p>
              Quantity: <input type="number" value="${item.quantity}" min="1" data-id="${item.product_id}" class="quantity-input" style="width:50px;">
            </p>
            <p>Subtotal: HKD ${item.subtotal.toFixed(2)}</p>
            <div class="cart-actions">
              <button class="update-btn" data-id="${item.product_id}">Update</button>
              <button class="delete-btn" data-id="${item.product_id}">Delete</button>
            </div>
          `;
                    cartItemsDiv.appendChild(cartItemDiv);
                });
                totalPriceDiv.innerText = `Total: HKD ${total.toFixed(2)}`;
            })
            .catch(err => console.error('Error loading cart:', err));
    }

    loadCart();

    // 事件委托：更新和删除操作
    cartItemsDiv.addEventListener('click', (e) => {
        if (e.target.classList.contains('update-btn')) {
            const productId = e.target.getAttribute('data-id');
            const input = document.querySelector(`input.quantity-input[data-id="${productId}"]`);
            const newQuantity = input.value;
            fetch('/api/cart/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `product_id=${productId}&quantity=${newQuantity}`
            })
                .then(res => res.json())
                .then(data => {
                    if (data.error) {
                        alert(data.error);
                    }
                    loadCart();
                })
                .catch(err => console.error('Error updating cart:', err));
        } else if (e.target.classList.contains('delete-btn')) {
            const productId = e.target.getAttribute('data-id');
            fetch('/api/cart/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `product_id=${productId}`
            })
                .then(res => res.json())
                .then(data => {
                    loadCart();
                })
                .catch(err => console.error('Error deleting from cart:', err));
        }
    });

    // 绑定结算按钮事件
    checkoutBtn.addEventListener('click', () => {
        fetch('/api/checkout', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                } else {
                    alert(data.message);
                    loadCart();
                }
            })
            .catch(err => console.error('Checkout error:', err));
    });
});