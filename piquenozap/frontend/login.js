document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    const loginButton = document.querySelector('.botao-entrar');
    const registerButton = document.querySelector('.botao-registrar');

    loginButton.addEventListener('click', (event) => {
        event.preventDefault(); 

        const username = usernameInput.value.trim();
        const password = passwordInput.value.trim();

        if (username === '' || password === '') {
            alert('Por favor, preencha todos os campos.');
            return;
        }

        
        //TESTE-------------------------------------------------------
        if (username === 'teste' && password === '123') {
            window.location.href = 'chat.html'; 
        } else {
            alert('Usuário ou senha incorretos.');
        }
    });

    registerButton.addEventListener('click', () => {
        window.location.href = 'register.html';
    });
});
