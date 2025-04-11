document.addEventListener('DOMContentLoaded', () => {
    const cartItemsDiv = document.getElementById('cart-items');
    const totalPriceDiv = document.getElementById('total-price');
    const checkoutBtn = document.getElementById('checkout-btn');

    // 模态相关元素
    const modal = document.getElementById('checkout-modal');
    const orderDetailsDiv = document.getElementById('order-details');
    const confirmBtn = document.getElementById('confirm-btn');
    const cancelBtn = document.getElementById('cancel-btn');

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

    // 更新和删除事件
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
                    if (data.error) alert(data.error);
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
                .then(data => loadCart())
                .catch(err => console.error('Error deleting from cart:', err));
        }
    });

    // 当点击 Checkout 按钮时，先请求获取订单详情，然后显示模态对话框
    checkoutBtn.addEventListener('click', () => {
        fetch('/api/cart')
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                    return;
                }
                if (data.items.length === 0) {
                    alert("Your cart is empty.");
                    return;
                }
                // 构建订单详情 HTML
                let detailsHTML = `<p><strong>User:</strong> ${data.user ? data.user.username : "Unknown"}</p>`;
                detailsHTML += '<table border="1" style="width:100%; border-collapse:collapse;">';
                detailsHTML += '<tr><th>Product Name</th><th>Quantity</th><th>Unit Price</th><th>Subtotal</th></tr>';
                data.items.forEach(item => {
                    let subtotal = item.discounted_price * item.quantity;
                    detailsHTML += `<tr>
                        <td>${item.name}</td>
                        <td>${item.quantity}</td>
                        <td>${item.discounted_price}</td>
                        <td>${subtotal.toFixed(2)}</td>
                    </tr>`;
                });
                detailsHTML += '</table>';
                detailsHTML += `<p><strong>Total Due: HKD ${data.total.toFixed(2)}</strong></p>`;
                orderDetailsDiv.innerHTML = detailsHTML;
                // 显示模态，并使背景不可点击（通过 CSS 实现）
                modal.style.display = "block";
            })
            .catch(err => console.error('Error fetching cart details:', err));
    });

    // 确认按钮：调用结算接口
    confirmBtn.addEventListener('click', () => {
        fetch('/api/checkout', { method: 'POST' })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    alert(data.error);
                } else {
                    alert(data.message);
                    loadCart();
                }
                modal.style.display = "none";
            })
            .catch(err => {
                console.error('Checkout error:', err);
                modal.style.display = "none";
            });
    });

    // 取消按钮：关闭模态对话框
    cancelBtn.addEventListener('click', () => {
        modal.style.display = "none";
    });

    // 点击模态外区域也关闭模态
    window.addEventListener('click', (event) => {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    });
});