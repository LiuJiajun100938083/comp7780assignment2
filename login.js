document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('user-login-form');
    const messageDiv = document.getElementById('login-message');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);

        fetch('/api/login', {
            method: 'POST',
            body: new URLSearchParams(formData)
        })
            .then(res => res.json())
            .then(data => {
                if (data.error) {
                    messageDiv.innerText = data.error;
                    messageDiv.style.color = 'red';
                } else {
                    // 登录成功，跳转回主页
                    messageDiv.style.color = 'green';
                    messageDiv.innerText = data.message;
                    setTimeout(() => {
                        window.location.href = 'projectHomePage.html';
                    }, 1000);
                }
            })
            .catch(err => {
                console.error('Login error:', err);
                messageDiv.innerText = 'An error occurred. Please try again.';
            });
    });
});