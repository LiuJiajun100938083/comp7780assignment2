document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('random-products-container');
    let allProducts = [];

    // 判断图片URL是否为外部链接，否则拼接 images/ 前缀
    function getImagePath(image_url) {
        if (image_url.startsWith("http://") || image_url.startsWith("https://")) {
            return image_url;
        } else {
            return 'images/' + image_url;
        }
    }

    // 加载所有产品数据
    function loadAllProducts() {
        fetch('/api/products')
            .then(response => response.json())
            .then(products => {
                allProducts = products;
                displayRandomProducts();
            })
            .catch(err => {
                console.error("Error fetching products:", err);
            });
    }

    // 随机显示 3 个产品
    function displayRandomProducts() {
        container.innerHTML = "";
        if (allProducts.length === 0) {
            container.innerText = "No products available.";
            return;
        }
        let randomProducts = [];
        const count = Math.min(2, allProducts.length);
        const usedIndices = new Set();
        while (randomProducts.length < count) {
            const idx = Math.floor(Math.random() * allProducts.length);
            if (!usedIndices.has(idx)) {
                usedIndices.add(idx);
                randomProducts.push(allProducts[idx]);
            }
        }
        randomProducts.forEach(product => {
            const card = document.createElement('div');
            // 添加浮动动画 class "floating"
            card.className = 'product-card floating';
            const imgPath = getImagePath(product.image_url);
            card.innerHTML = `
        <img src="${imgPath}" alt="${product.name}">
        <h3 class="product-title">${product.name}</h3>
        <p class="product-price">
          <del>Original Price: HKD ${product.original_price}</del><br>
          Discounted Price: HKD ${product.discounted_price}
        </p>
        <p class="product-stock">In Stock: ${product.stock}</p>
        <button class="add-to-cart-btn" data-id="${product.product_id}" style="padding:8px 12px; border:none; border-radius:6px; background-color:#0070c9; color:#fff; cursor:pointer; transition: background-color 0.3s ease;">Add to Cart</button>
      `;
            container.appendChild(card);
        });
    }

    // 每隔 5 秒更新显示的随机产品
    setInterval(displayRandomProducts, 5000);

    loadAllProducts();

    // 获取当前登录用户信息，并更新页面
    fetch('/api/currentUser')
        .then(response => response.json())
        .then(data => {
            const userInfoDiv = document.getElementById('user-info');
            if (data.user) {
                if (data.user.role === 'admin') {
                    userInfoDiv.innerHTML = `<p>Welcome, ${data.user.username} 
            <button id="logout-btn">Logout</button> 
            <a href="admin.html" id="edit-products-link">Edit Products</a></p>`;
                } else {
                    userInfoDiv.innerHTML = `<p>Welcome, ${data.user.username} <button id="logout-btn">Logout</button></p>`;
                }
            } else {
                userInfoDiv.innerHTML = `<p>You are not logged in.</p>`;
            }
        })
        .catch(err => {
            console.error("Error fetching user info:", err);
        });

    // 绑定登出按钮事件
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'logout-btn') {
            fetch('/api/logout', { method: 'POST' })
                .then(response => response.json())
                .then(data => {
                    window.location.reload();
                })
                .catch(err => console.error("Logout error:", err));
        }
    });

    // 为 Add to Cart 按钮绑定点击事件（采用事件委托）
    container.addEventListener('click', (e) => {
        if (e.target.classList.contains('add-to-cart-btn')) {
            const productId = e.target.getAttribute('data-id');
            fetch('/api/cart/add', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: `product_id=${productId}&quantity=1`
            })
                .then(response => response.json())
                .then(data => {
                    alert(data.message || data.error);
                })
                .catch(err => console.error("Error adding to cart:", err));
        }
    });
});