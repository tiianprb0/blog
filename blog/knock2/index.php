<?php
session_start(); // Mulai sesi PHP

// Jika pengguna sudah login, alihkan ke halaman utama blog
if (isset($_SESSION['user_id'])) {
    header('Location: /blog/');
    exit();
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Masuk atau Daftar - Tian Blog</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <!-- Header Section: Logo, Title, Description -->
        <!-- Ini akan disembunyikan di form registrasi oleh JavaScript -->
        <div class="header-section">
            <div class="logo">
                <img src="https://static.promediateknologi.id/crop/0x0:0x0/750x500/webp/photo/p1/944/2024/07/11/photo1720699326-3631075190.jpeg" alt="Logo Tian Blog">
            </div>
            <h1 class="main-title">Knock-Knock?</h1>
            <p class="main-description">who's there..?</p>
        </div>
        
        <div id="login-form-container">
            <form id="login-form">
                <div class="form-group">
                    <label for="login-username-email">EMAIL</label>
                    <div class="input-wrapper">
                        <i class="fas fa-envelope icon"></i>
                        <input type="text" id="login-username-email" name="username_email" required>
                    </div>
                </div>
                <div class="form-group password-group">
                    <label for="login-password">PASSWORD</label>
                    <div class="input-wrapper">
                        <i class="fas fa-lock icon"></i>
                        <input type="password" id="login-password" name="password" required>
                        <span class="toggle-password"><i class="fas fa-eye"></i></span>
                    </div>
                </div>
                <a href="#" class="forgot-password-link">Forgotten your password?</a>
                <button type="submit" class="btn btn-primary">Log in</button>
            </form>
            <div id="login-message" class="message"></div>
            <a href="#" class="switch-form-link" id="show-register">No account? Create One</a>
        </div>

        <div id="register-form-container" style="display: none;">
            <!-- H2 "Daftar" untuk form register tetap ada -->
            <h2>Daftar</h2>
            <form id="register-form">
                <div class="form-group">
                    <label for="register-username">Nama Pengguna:</label>
                    <div class="input-wrapper">
                        <i class="fas fa-user icon"></i>
                        <input type="text" id="register-username" name="username" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="register-email">Email:</label>
                    <div class="input-wrapper">
                        <i class="fas fa-envelope icon"></i>
                        <input type="email" id="register-email" name="email" required>
                    </div>
                </div>
                <div class="form-group password-group">
                    <label for="register-password">Kata Sandi:</label>
                    <div class="input-wrapper">
                        <i class="fas fa-lock icon"></i>
                        <input type="password" id="register-password" name="password" required>
                        <span class="toggle-password"><i class="fas fa-eye"></i></span>
                    </div>
                    <!-- Indikator kekuatan password sekarang terlihat -->
                    <div class="password-strength-indicator">
                        <div class="strength-bar" id="strength-bar"></div>
                        <span id="strength-text"></span>
                    </div>
                </div>
                <div class="form-group password-group">
                    <label for="register-confirm-password">Konfirmasi Kata Sandi:</label>
                    <div class="input-wrapper">
                        <i class="fas fa-lock icon"></i>
                        <input type="password" id="register-confirm-password" name="confirm_password" required>
                        <span class="toggle-password"><i class="fas fa-eye"></i></span>
                    </div>
                </div>
                <button type="submit" class="btn btn-primary">Daftar</button>
            </form>
            <div id="register-message" class="message"></div>
            <!-- Link untuk kembali ke login, diubah stylenya agar lebih terlihat -->
            <a href="#" class="btn btn-secondary" id="show-login">Sudah punya akun? Masuk</a>
        </div>
    </div>

    <script src="script.js" defer></script>
</body>
</html>
