document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const loginMessage = document.getElementById('login-message');
    const registerMessage = document.getElementById('register-message');
    const loginFormContainer = document.getElementById('login-form-container');
    const registerFormContainer = document.getElementById('register-form-container');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const headerSection = document.querySelector('.header-section'); // Ambil elemen header-section

    const registerPasswordInput = document.getElementById('register-password');
    const strengthBar = document.getElementById('strength-bar');
    const strengthText = document.getElementById('strength-text');

    // Fungsi untuk menampilkan pesan
    function displayMessage(element, message, type) {
        element.textContent = message;
        element.className = `message ${type}`; // Reset dan terapkan kelas baru
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
            element.textContent = '';
        }, 5000); // Sembunyikan setelah 5 detik
    }

    // Mengganti antara formulir login dan daftar
    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginFormContainer.style.display = 'none';
        registerFormContainer.style.display = 'block';
        headerSection.classList.add('hidden'); // Sembunyikan header section
        loginMessage.style.display = 'none'; // Bersihkan pesan saat beralih
        registerMessage.style.display = 'none';
        loginForm.reset(); // Bersihkan bidang formulir login
        registerPasswordInput.value = ''; // Bersihkan input password register
        updatePasswordStrength(''); // Reset indikator kekuatan password
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerFormContainer.style.display = 'none';
        loginFormContainer.style.display = 'block';
        headerSection.classList.remove('hidden'); // Tampilkan header section
        loginMessage.style.display = 'none'; // Bersihkan pesan saat beralih
        registerMessage.style.display = 'none';
        registerForm.reset(); // Bersihkan bidang formulir daftar
        updatePasswordStrength(''); // Reset indikator kekuatan password
    });

    // Menangani Pengiriman Formulir Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(loginForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const response = await fetch('auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'login', ...data })
            });
            const result = await response.json();

            if (result.success) {
                displayMessage(loginMessage, result.message, 'success');
                // Redirect ke blog/ setelah login berhasil
                window.location.href = '/blog/';
            } else {
                displayMessage(loginMessage, result.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            displayMessage(loginMessage, 'Terjadi kesalahan saat mencoba masuk.', 'error');
        }
    });

    // Menangani Pengiriman Formulir Daftar
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = registerPasswordInput.value;
        const confirmPassword = document.getElementById('register-confirm-password').value;

        if (password !== confirmPassword) {
            displayMessage(registerMessage, 'Kata sandi dan konfirmasi kata sandi tidak cocok.', 'error');
            return;
        }

        const formData = new FormData(registerForm);
        const data = Object.fromEntries(formData.entries());
        // Hapus confirm_password karena tidak diperlukan oleh backend
        delete data.confirm_password;

        try {
            const response = await fetch('auth.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ action: 'register', ...data })
            });
            const result = await response.json();

            if (result.success) {
                displayMessage(registerMessage, result.message, 'success');
                registerForm.reset(); // Bersihkan formulir
                updatePasswordStrength(''); // Reset indikator kekuatan password
                // Redirect ke blog/thank-you setelah pendaftaran berhasil
                setTimeout(() => {
                    window.location.href = '/blog/thank-you'; // Ini adalah baris yang diubah
                }, 1000); // Beri sedikit waktu agar pesan terlihat
            } else {
                displayMessage(registerMessage, result.message, 'error');
            }
        } catch (error) {
            console.error('Error:', error);
            displayMessage(registerMessage, 'Terjadi kesalahan saat mencoba mendaftar.', 'error');
        }
    });

    // Fungsi untuk memperbarui indikator kekuatan kata sandi
    function updatePasswordStrength(password) {
        // Indikator kekuatan password sekarang terlihat
        if (strengthBar && strengthText) {
            let strength = 0;
            let text = 'Sangat Lemah';
            let barColor = '#eee'; // Default grey

            if (password.length > 0) {
                // Kriteria kekuatan
                if (password.length >= 6) strength += 1;
                if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength += 1;
                if (password.match(/\d/)) strength += 1;
                if (password.match(/[^a-zA-Z\d]/)) strength += 1; // Karakter spesial

                // Tentukan kekuatan berdasarkan skor
                if (strength <= 1) {
                    text = 'Sangat Lemah';
                    barColor = '#e74c3c'; // Merah
                    strengthBar.style.width = '25%';
                } else if (strength === 2) {
                    text = 'Lemah';
                    barColor = '#f39c12'; // Oranye
                    strengthBar.style.width = '50%';
                } else if (strength === 3) {
                    text = 'Sedang';
                    barColor = '#f39c12'; // Oranye
                    strengthBar.style.width = '75%';
                } else if (strength >= 4) {
                    text = 'Kuat';
                    barColor = '#27ae60'; // Hijau
                    strengthBar.style.width = '100%';
                }
            } else {
                // Jika password kosong
                text = '';
                barColor = '#eee';
                strengthBar.style.width = '0%';
            }

            strengthText.textContent = text;
            strengthBar.style.backgroundColor = barColor;
            
            strengthText.className = ''; // Reset classes
            if (text === 'Sangat Lemah' || text === 'Lemah') {
                strengthText.classList.add('weak');
            } else if (text === 'Sedang') {
                strengthText.classList.add('medium');
            } else if (text === 'Kuat') {
                strengthText.classList.add('strong');
            }
        }
    }

    // Event listener untuk input kata sandi registrasi
    if (registerPasswordInput) {
        registerPasswordInput.addEventListener('input', (e) => {
            updatePasswordStrength(e.target.value);
        });
    }

    // Fungsi untuk mengaktifkan/menonaktifkan visibilitas kata sandi
    document.querySelectorAll('.toggle-password').forEach(toggle => {
        toggle.addEventListener('click', () => {
            const passwordInput = toggle.previousElementSibling;
            const icon = toggle.querySelector('i');

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                icon.classList.remove('fa-eye');
                icon.classList.add('fa-eye-slash');
            } else {
                passwordInput.type = 'password';
                icon.classList.remove('fa-eye-slash');
                icon.classList.add('fa-eye');
            }
        });
    });
});
