<?php
// Mulai sesi PHP
session_start();

// Set header untuk response JSON
header('Content-Type: application/json');

// Path ke file JSON tempat menyimpan data pengguna
define('USERS_FILE', __DIR__ . '/users.json');

// Fungsi untuk membaca data pengguna dari file JSON
function getUsers() {
    if (!file_exists(USERS_FILE)) {
        // Jika file tidak ada, buat file kosong dengan array JSON
        file_put_contents(USERS_FILE, json_encode([]));
        return [];
    }
    $json_data = file_get_contents(USERS_FILE);
    $users = json_decode($json_data, true);
    
    // Pastikan $users adalah array, dan tambahkan field default jika belum ada
    if (!is_array($users)) {
        $users = [];
    }
    foreach ($users as &$user) {
        if (!isset($user['is_admin'])) {
            $user['is_admin'] = false; // Default non-admin jika field tidak ada
        }
        // Tambahkan field profil default jika belum ada
        if (!isset($user['display_name'])) {
            $user['display_name'] = '';
        }
        if (!isset($user['profile_picture'])) {
            $user['profile_picture'] = '';
        }
        if (!isset($user['date_of_birth'])) {
            $user['date_of_birth'] = '';
        }
        if (!isset($user['bio'])) { // Tambahkan inisialisasi field bio
            $user['bio'] = '';
        }
        // Hapus field 'gender' jika masih ada dari data lama
        if (isset($user['gender'])) {
            unset($user['gender']);
        }
    }
    return $users;
}

// Fungsi untuk menulis data pengguna ke file JSON
function saveUsers($users) {
    file_put_contents(USERS_FILE, json_encode($users, JSON_PRETTY_PRINT));
}

// Ambil input JSON dari request
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Periksa apakah data valid dan action ada
if (!isset($data['action'])) {
    echo json_encode(['success' => false, 'message' => 'Aksi tidak valid.']);
    exit();
}

switch ($data['action']) {
    case 'register':
        registerUser($data);
        break;
    case 'login':
        loginUser($data);
        break;
    case 'update_profile': // Aksi baru untuk update profil
        updateUserProfile($data);
        break;
    case 'logout': // Aksi baru untuk logout
        logoutUser();
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Aksi tidak dikenal.']);
        break;
}

// Fungsi untuk registrasi pengguna baru
function registerUser($data) {
    $username = trim($data['username'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    // Validasi input
    if (empty($username) || empty($email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Semua kolom harus diisi.']);
        exit();
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        echo json_encode(['success' => false, 'message' => 'Format email tidak valid.']);
        exit();
    }
    if (strlen($password) < 6) {
        echo json_encode(['success' => false, 'message' => 'Kata sandi minimal 6 karakter.']);
        exit();
    }

    $users = getUsers();

    // Periksa apakah username atau email sudah ada
    foreach ($users as $user) {
        if ($user['username'] === $username) {
            echo json_encode(['success' => false, 'message' => 'Nama pengguna sudah terdaftar.']);
            exit();
        }
        if ($user['email'] === $email) {
            echo json_encode(['success' => false, 'message' => 'Email sudah terdaftar.']);
            exit();
        }
    }

    // Hash kata sandi
    $hashed_password = password_hash($password, PASSWORD_DEFAULT);

    // Buat ID unik sederhana (untuk JSON, bukan database)
    $new_id = count($users) > 0 ? max(array_column($users, 'id')) + 1 : 1;

    $new_user = [
        'id' => $new_id,
        'username' => $username,
        'email' => $email,
        'password' => $hashed_password,
        'created_at' => date('Y-m-d H:i:s'),
        'is_admin' => false, // Default: pengguna baru bukan admin
        'display_name' => '',
        'profile_picture' => '',
        'date_of_birth' => '',
        'bio' => '' // Inisialisasi bio untuk pengguna baru
    ];

    $users[] = $new_user;
    saveUsers($users);

    // --- BAGIAN BARU: Otomatis login setelah registrasi berhasil ---
    $_SESSION['user_id'] = $new_user['id'];
    $_SESSION['username'] = $new_user['username'];
    $_SESSION['is_admin'] = $new_user['is_admin'];
    $_SESSION['display_name'] = $new_user['display_name'];
    $_SESSION['profile_picture'] = $new_user['profile_picture'];
    $_SESSION['date_of_birth'] = $new_user['date_of_birth'];
    $_SESSION['bio'] = $new_user['bio'];
    // --- AKHIR BAGIAN BARU ---

    echo json_encode(['success' => true, 'message' => 'Registrasi berhasil! Anda telah otomatis login.']);
}

// Fungsi untuk login pengguna
function loginUser($data) {
    $username_email = trim($data['username_email'] ?? '');
    $password = $data['password'] ?? '';

    // Validasi input
    if (empty($username_email) || empty($password)) {
        echo json_encode(['success' => false, 'message' => 'Nama pengguna/email dan kata sandi harus diisi.']);
        exit();
    }

    $users = getUsers();
    $found_user = null;

    // Cari pengguna berdasarkan username atau email
    foreach ($users as $user) {
        if ($user['username'] === $username_email || $user['email'] === $username_email) {
            $found_user = $user;
            break;
        }
    }

    if ($found_user) {
        // Verifikasi kata sandi
        if (password_verify($password, $found_user['password'])) {
            // Login berhasil, set sesi
            $_SESSION['user_id'] = $found_user['id'];
            $_SESSION['username'] = $found_user['username'];
            $_SESSION['is_admin'] = $found_user['is_admin']; // Simpan status admin di sesi
            // Simpan juga data profil di sesi jika diperlukan di frontend
            $_SESSION['display_name'] = $found_user['display_name'];
            $_SESSION['profile_picture'] = $found_user['profile_picture'];
            $_SESSION['date_of_birth'] = $found_user['date_of_birth'];
            $_SESSION['bio'] = $found_user['bio']; // Simpan bio di sesi

            echo json_encode(['success' => true, 'message' => 'Login berhasil! Selamat datang, ' . $found_user['username'] . '!']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Kata sandi salah.']);
        }
    } else {
        echo json_encode(['success' => false, 'message' => 'Nama pengguna atau email tidak ditemukan.']);
    }
}

// Fungsi untuk memperbarui profil pengguna (termasuk bio)
function updateUserProfile($data) {
    // Pastikan pengguna sudah login
    if (!isset($_SESSION['user_id'])) {
        echo json_encode(['success' => false, 'message' => 'Anda harus login untuk memperbarui profil.']);
        exit();
    }

    $user_id = $_SESSION['user_id'];
    
    // Ambil data dari input
    $new_username = trim($data['username'] ?? '');
    $display_name = trim($data['display_name'] ?? '');
    $profile_picture = trim($data['profile_picture'] ?? '');
    $date_of_birth = trim($data['date_of_birth'] ?? '');
    $bio = trim($data['bio'] ?? '');

    // Validasi URL Foto Profil
    if (!empty($profile_picture) && !filter_var($profile_picture, FILTER_VALIDATE_URL)) {
        echo json_encode(['success' => false, 'message' => 'URL Foto Profil tidak valid.']);
        exit();
    }

    // Sanitasi input bio untuk mencegah XSS
    $bio = htmlspecialchars($bio, ENT_QUOTES, 'UTF-8');
    // Sanitasi display_name dan username juga
    $display_name = htmlspecialchars($display_name, ENT_QUOTES, 'UTF-8');
    $new_username = htmlspecialchars($new_username, ENT_QUOTES, 'UTF-8');


    $users = getUsers();
    $user_found = false;
    $current_user_key = -1;

    // Temukan pengguna saat ini dan periksa duplikasi username
    foreach ($users as $key => $user) {
        if ($user['id'] === $user_id) {
            $current_user_key = $key;
            // Periksa apakah username baru sudah digunakan oleh pengguna lain
            if ($user['username'] !== $new_username) { // Jika username berubah
                foreach ($users as $other_user) {
                    if ($other_user['id'] !== $user_id && $other_user['username'] === $new_username) {
                        echo json_encode(['success' => false, 'message' => 'Nama pengguna sudah digunakan oleh orang lain.']);
                        exit();
                    }
                }
            }
            $user_found = true;
            break;
        }
    }

    if ($user_found && $current_user_key !== -1) {
        // Perbarui data pengguna
        $users[$current_user_key]['username'] = $new_username;
        $users[$current_user_key]['display_name'] = $display_name;
        $users[$current_user_key]['profile_picture'] = $profile_picture;
        $users[$current_user_key]['date_of_birth'] = $date_of_birth;
        $users[$current_user_key]['bio'] = $bio;

        saveUsers($users);

        // Perbarui juga sesi dengan data profil yang baru
        $_SESSION['username'] = $new_username;
        $_SESSION['display_name'] = $display_name;
        $_SESSION['profile_picture'] = $profile_picture;
        $_SESSION['date_of_birth'] = $date_of_birth;
        $_SESSION['bio'] = $bio;

        echo json_encode(['success' => true, 'message' => 'Profil berhasil diperbarui!']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Pengguna tidak ditemukan.']);
    }
}

// Fungsi untuk logout pengguna
function logoutUser() {
    // Hapus semua variabel sesi
    $_SESSION = array();

    // Hapus cookie sesi. Ini akan menghancurkan sesi, dan bukan hanya data sesi.
    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }

    // Akhiri sesi
    session_destroy();

    echo json_encode(['success' => true, 'message' => 'Logout berhasil.']);
}
?>
