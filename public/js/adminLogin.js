document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('admin-login-form');
    const messageDiv = document.getElementById('admin-login-message');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        fetch('/api/adminLogin', {
            method: 'POST',
            body: new URLSearchParams(formData)
        })
            .then(response => response.json())
            .then(data => {
                if (data.error) {
                    messageDiv.innerText = data.error;
                } else {
                    messageDiv.innerText = data.message;
                    // 登录成功后跳转到管理员编辑页面
                    window.location.href = 'admin.html';
                }
            })
            .catch(error => {
                console.error('Error during admin login:', error);
                messageDiv.innerText = 'An error occurred. Please try again.';
            });
    });
});