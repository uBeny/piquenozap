document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const usernameInput = document.getElementById('register-username');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    const registerSubmitButton = document.getElementById('registerSubmitButton');

    registerSubmitButton.addEventListener('click', (event) => {
        event.preventDefault();

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        if (username === '' || password === '' || confirmPassword === '') {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        if (password !== confirmPassword) {
            alert('As senhas não coincidem!');
            return;
        }

        alert('Registro bem-sucedido! Redirecionando para o login...');
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
    });
});
