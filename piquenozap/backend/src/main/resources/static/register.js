// Exemplo de como deveria ser a lógica em register.js

registerSubmitButton.addEventListener('click', async (event) => {
    event.preventDefault();

    const email = usernameInput.value.trim(); // Assumindo que 'username' é o email
    const password = passwordInput.value.trim();
    const confirmPassword = confirmPasswordInput.value.trim();

    // ... (suas validações existentes) ...

    if (password !== confirmPassword) {
        alert('As senhas não coincidem!');
        return;
    }

    try {
        const response = await fetch('http://localhost:8080/api/auth/register', { // Endpoint correto
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password }) // Enviando os dados
        });

        const data = await response.json();

        if (response.ok) {
            alert(data.message + ' Redirecionando para o login...');
            setTimeout(() => {
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