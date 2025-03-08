document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('user-register-form');
    const messageDiv = document.getElementById('register-message');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        fetch('/api/register', {
            method: 'POST',
            body: new URLSearchParams(formData)
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    messageDiv.style.color = 'red';
                    messageDiv.innerText = data.error;
                } else {
                    messageDiv.style.color = 'green';
                    messageDiv.innerText = data.message;
                    // 注册成功后，1秒后跳转到登录页面
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1000);
                }
            })
            .catch(err => {
                console.error('Register error:', err);
                messageDiv.style.color = 'red';
                messageDiv.innerText = 'An error occurred. Please try again.';
            });
    });
});