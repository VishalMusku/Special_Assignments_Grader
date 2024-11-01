
const users = [
    { username: "jaron", password: "82" },
    { username: "v", password: "v" },
    { username: "amin", password: "amin" },

];

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            const user = users.find(u => u.username === username && u.password === password);
            if (user) {
                localStorage.setItem('loggedIn', 'true');
                window.location.href = 'dashboard.html';
            } else {
                alert('Invalid username or password');
            }
        });
    } else {
        console.error('Login form not found');
    }
});
