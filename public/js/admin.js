document.addEventListener('DOMContentLoaded', () => {
    const adminMessage = document.getElementById('admin-message');
    const productsContainer = document.getElementById('admin-products');

    // 加载产品列表
    function loadProducts() {
        fetch('/api/products')
            .then(response => response.json())
            .then(products => {
                productsContainer.innerHTML = '';
                products.forEach(product => {
                    const productDiv = document.createElement('div');
                    productDiv.className = 'product-card';
                    productDiv.innerHTML = `
            <div class="product-img">
              <img src="${product.image_url}" alt="${product.name}">
            </div>
            <div class="product-info">
              <p><strong>ID:</strong> ${product.product_id}</p>
              <p><strong>Name:</strong> <span class="prod-name">${product.name}</span></p>
              <p><strong>Original Price:</strong> HKD <span class="prod-original">${product.original_price}</span></p>
              <p><strong>Discounted Price:</strong> HKD <span class="prod-discounted">${product.discounted_price}</span></p>
              <p><strong>Image URL:</strong> <span class="prod-image">${product.image_url}</span></p>
              <p><strong>Stock:</strong> <span class="prod-stock">${product.stock}</span></p>
            </div>
            <div class="product-actions">
              <button class="delete-btn" data-id="${product.product_id}">Delete</button>
              <button class="edit-btn" data-id="${product.product_id}">Edit</button>
            </div>
            <div class="edit-form">
              <form class="edit-product-form">
                <input type="hidden" name="product_id" value="${product.product_id}">
                <p>
                  <label>Name:</label>
                  <input type="text" name="name" value="${product.name}" required>
                </p>
                <p>
                  <label>Original Price:</label>
                  <input type="number" step="0.01" name="original_price" value="${product.original_price}" required>
                </p>
                <p>
                  <label>Discounted Price:</label>
                  <input type="number" step="0.01" name="discounted_price" value="${product.discounted_price}" required>
                </p>
                <p>
                  <label>Image URL:</label>
                  <input type="text" name="image_url" value="${product.image_url}" required>
                </p>
                <p>
                  <label>Stock:</label>
                  <input type="number" name="stock" value="${product.stock}" required>
                </p>
                <button type="submit">Update</button>
                <button type="button" class="cancel-edit">Cancel</button>
              </form>
            </div>
          `;
                    productsContainer.appendChild(productDiv);
                });

                // 绑定删除按钮事件
                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const productId = e.target.getAttribute('data-id');
                        fetch('/api/admin/delete', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                            body: `product_id=${productId}`
                        })
                            .then(res => res.json())
                            .then(data => {
                                adminMessage.innerText = data.message || data.error;
                                loadProducts();
                            })
                            .catch(err => console.error('Error deleting product:', err));
                    });
                });

                // 绑定编辑按钮事件，显示编辑表单
                document.querySelectorAll('.edit-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const parentDiv = e.target.closest('.product-card');
                        const editForm = parentDiv.querySelector('.edit-form');
                        editForm.style.display = 'block';
                    });
                });

                // 绑定取消编辑按钮事件
                document.querySelectorAll('.cancel-edit').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const editForm = e.target.closest('.edit-form');
                        editForm.style.display = 'none';
                    });
                });

                // 绑定编辑表单提交事件
                document.querySelectorAll('.edit-product-form').forEach(form => {
                    form.addEventListener('submit', (e) => {
                        e.preventDefault();
                        const formData = new FormData(form);
                        fetch('/api/admin/update', {
                            method: 'POST',
                            body: new URLSearchParams(formData)
                        })
                            .then(res => res.json())
                            .then(data => {
                                adminMessage.innerText = data.message || data.error;
                                loadProducts();
                            })
                            .catch(err => console.error('Error updating product:', err));
                    });
                });
            })
            .catch(err => console.error('Error loading products:', err));
    }

    loadProducts();

    // 绑定添加商品表单事件
    const addForm = document.getElementById('add-product-form');
    addForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(addForm);
        fetch('/api/admin/add', {
            method: 'POST',
            body: new URLSearchParams(formData)
        })
            .then(res => res.json())
            .then(data => {
                adminMessage.innerText = data.message || data.error;
                loadProducts();
            })
            .catch(err => console.error('Error adding product:', err));
    });
});