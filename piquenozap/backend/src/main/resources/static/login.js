document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const loginButton = document.querySelector('.botao-entrar');
    const registerButton = document.querySelector('.botao-registrar');

    loginButton.addEventListener('click', async (event) => {
        event.preventDefault(); 

        const email = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        
        if (email === '' || password === '') {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        try {
            const response = await fetch('http://localhost:8080/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Se a resposta do servidor for OK (status 200)
                
                // Salva os dados do usuário no localStorage do navegador
                localStorage.setItem('userId', data.userId);
                localStorage.setItem('userEmail', data.email);
                
                // Redireciona para a tela de chat
                window.location.href = 'chat.html';

            } else {
                // Se o servidor retornar um erro (ex: senha errada)
                alert('Erro no login: ' + (data.message || 'Ocorreu um erro desconhecido.'));
                console.error('Detalhes do erro do servidor:', data);
            }
        } catch (error) {
            // Se houver um erro de conexão com o servidor
            alert('Erro de conexão com o servidor. Verifique se o backend está rodando.');
            console.error('Erro na requisição de login:', error);
        }
    });

    registerButton.addEventListener('click', () => {
        window.location.href = 'register.html';
    });
});