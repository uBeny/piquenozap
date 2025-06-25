document.addEventListener('DOMContentLoaded', () => {
    const registerSubmitButton = document.getElementById('registerSubmitButton');
    const usernameInput = document.getElementById('register-username');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');

    registerSubmitButton.addEventListener('click', async (event) => {
        event.preventDefault();

        const email = usernameInput.value.trim();
        const password = passwordInput.value.trim();
        const confirmPassword = confirmPasswordInput.value.trim();

        if (!email || !password || !confirmPassword) {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        if (password !== confirmPassword) {
            alert('As senhas não coincidem!');
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                setTimeout(() => {
                    alert('Usuário cadastrado com sucesso.');
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                alert('Erro no registro: ' + (data.message || 'Ocorreu um erro desconhecido.'));
            }
        } catch (error) {
            alert('Erro de conexão com o servidor.');
            console.error('Erro na requisição de registro:', error);
        }
    });
});