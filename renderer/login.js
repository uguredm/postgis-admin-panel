async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    if (!username || !password) {
        errorMessage.innerText = "Kullanıcı adı ve şifre gereklidir!";
        errorMessage.style.display = "block";
        return;
    }

    try {
        const response = await window.electron.login(username, password);

        if (response.success) {
            localStorage.setItem('username', response.user.username);
            localStorage.setItem('role', response.user.role);
            window.location.href = 'home.html';
        } else {
            errorMessage.innerText = response.error;
            errorMessage.style.display = "block";
        }
    } catch (error) {
        errorMessage.innerText = "Sunucu hatası!";
        errorMessage.style.display = "block";
    }
}

  

