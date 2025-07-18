<?php
// Aktifkan semua pelaporan kesalahan PHP untuk debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Mulai output buffering. Ini akan menangkap semua output (termasuk whitespace/errors)
// sehingga kita bisa membersihkannya sebelum mengirimkan JSON.
ob_start();

// Mulai sesi PHP
session_start();

// Set header untuk response JSON
header('Content-Type: application/json');

// Path ke file JSON tempat menyimpan data pengguna
define('USERS_FILE', __DIR__ . '/users.json');

// Fungsi untuk membaca data pengguna dari file JSON
function getUsers() {
    if (!file_exists(USERS_FILE)) {
        error_log("DEBUG: getUsers - USERS_FILE not found: " . USERS_FILE . ". Creating empty file.");
        file_put_contents(USERS_FILE, json_encode([]));
        return [];
    }
    $json_data = file_get_contents(USERS_FILE);
    if ($json_data === false) {
        error_log("ERROR: getUsers - Failed to read USERS_FILE: " . USERS_FILE);
        return [];
    }
    $users = json_decode($json_data, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        error_log("ERROR: getUsers - JSON parse error in USERS_FILE: " . json_last_error_msg() . ". Raw data: " . $json_data);
        return [];
    }
    
    if (!is_array($users)) {
        error_log("DEBUG: getUsers - users.json content is not an array. Initializing as empty array.");
        $users = [];
    }
    foreach ($users as &$user) {
        if (!isset($user['is_admin'])) {
            $user['is_admin'] = false;
        }
        if (!isset($user['can_write_post'])) {
            $user['can_write_post'] = false;
        }
        if (!isset($user['display_name'])) {
            $user['display_name'] = '';
        }
        if (!isset($user['profile_picture'])) {
            $user['profile_picture'] = '';
        }
        if (!isset($user['date_of_birth'])) {
            $user['date_of_birth'] = '';
        }
        if (!isset($user['bio'])) {
            $user['bio'] = '';
        }
        if (isset($user['gender'])) {
            unset($user['gender']);
        }
    }
    error_log("DEBUG: getUsers - Successfully loaded " . count($users) . " users.");
    return $users;
}

// Fungsi untuk menulis data pengguna ke file JSON
function saveUsers($users) {
    $result = file_put_contents(USERS_FILE, json_encode($users, JSON_PRETTY_PRINT));
    if ($result === false) {
        error_log("ERROR: saveUsers - Failed to write to USERS_FILE: " . USERS_FILE . ". Check file permissions.");
    } else {
        error_log("DEBUG: saveUsers - Successfully saved " . count($users) . " users to " . USERS_FILE);
    }
    return $result;
}

// Ambil input JSON dari request
$input = file_get_contents('php://input');
$data = json_decode($input, true);

error_log("DEBUG: auth.php received raw input: " . $input);
error_log("DEBUG: auth.php parsed data: " . print_r($data, true));

if (!isset($data['action'])) {
    error_log("ERROR: auth.php - 'action' field missing in input data.");
    // Bersihkan buffer output sebelum mengirimkan respons JSON
    ob_clean(); 
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
    case 'update_profile':
        updateUserProfile($data);
        break;
    case 'logout':
        logoutUser();
        break;
    default:
        error_log("ERROR: auth.php - Unknown action: " . $data['action']);
        // Bersihkan buffer output sebelum mengirimkan respons JSON
        ob_clean();
        echo json_encode(['success' => false, 'message' => 'Aksi tidak dikenal.']);
        exit();
}

function registerUser($data) {
    $username = trim($data['username'] ?? '');
    $email = trim($data['email'] ?? '');
    $password = $data['password'] ?? '';

    if (empty($username) || empty($email) || empty($password)) {
        ob_clean();
        echo json_encode(['success' => false, 'message' => 'Semua kolom harus diisi.']);
        exit();
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        ob_clean();
        echo json_encode(['success' => false, 'message' => 'Format email tidak valid.']);
        exit();
    }
    if (strlen($password) < 6) {
        ob_clean();
        echo json_encode(['success' => false, 'message' => 'Kata sandi minimal 6 karakter.']);
        exit();
    }

    $users = getUsers();

    foreach ($users as $user) {
        if ($user['username'] === $username) {
            ob_clean();
            echo json_encode(['success' => false, 'message' => 'Nama pengguna sudah terdaftar.']);
            exit();
        }
        if ($user['email'] === $email) {
            ob_clean();
            echo json_encode(['success' => false, 'message' => 'Email sudah terdaftar.']);
            exit();
        }
    }

    $hashed_password = password_hash($password, PASSWORD_DEFAULT);
    $new_id = count($users) > 0 ? max(array_column($users, 'id')) + 1 : 1;

    $new_user = [
        'id' => $new_id,
        'username' => $username,
        'email' => $email,
        'password' => $hashed_password,
        'created_at' => date('Y-m-d H:i:s'),
        'is_admin' => false,
        'can_write_post' => false,
        'display_name' => '',
        'profile_picture' => '',
        'date_of_birth' => '',
        'bio' => ''
    ];

    $users[] = $new_user;
    saveUsers($users);

    $_SESSION['user_id'] = $new_user['id'];
    $_SESSION['username'] = $new_user['username'];
    $_SESSION['is_admin'] = $new_user['is_admin'];
    $_SESSION['can_write_post'] = $new_user['can_write_post'];
    $_SESSION['display_name'] = $new_user['display_name'];
    $_SESSION['profile_picture'] = $new_user['profile_picture'];
    $_SESSION['date_of_birth'] = $new_user['date_of_birth'];
    $_SESSION['bio'] = $new_user['bio'];

    ob_clean();
    echo json_encode(['success' => true, 'message' => 'Registrasi berhasil! Anda telah otomatis login.']);
    exit();
}

function loginUser($data) {
    $username_email = trim($data['username_email'] ?? '');
    $password = $data['password'] ?? '';

    error_log("DEBUG: loginUser called. Input username_email: '{$username_email}', password provided: " . (!empty($password) ? 'YES' : 'NO'));

    if (empty($username_email) || empty($password)) {
        error_log("ERROR: loginUser - Username/email or password is empty.");
        ob_clean();
        echo json_encode(['success' => false, 'message' => 'Nama pengguna/email dan kata sandi harus diisi.']);
        exit();
    }

    $users = getUsers();
    $found_user = null;

    error_log("DEBUG: loginUser - Attempting to find user among " . count($users) . " loaded users.");

    foreach ($users as $user) {
        $user_username = $user['username'] ?? '';
        $user_email = $user['email'] ?? '';
        
        error_log("DEBUG: loginUser - Comparing input '{$username_email}' with user (ID: " . ($user['id'] ?? 'N/A') . ", Username: '{$user_username}', Email: '{$user_email}')");

        if (strtolower($user_username) === strtolower($username_email) || strtolower($user_email) === strtolower($username_email)) {
            $found_user = $user;
            error_log("DEBUG: loginUser - User found: ID=" . ($user['id'] ?? 'N/A') . ", Username='{$user_username}'");
            break;
        }
    }

    if ($found_user) {
        error_log("DEBUG: loginUser - Found user's stored hash: '{$found_user['password']}'");
        error_log("DEBUG: loginUser - Verifying password for '{$found_user['username']}'...");

        if (password_verify($password, $found_user['password'])) {
            $_SESSION['user_id'] = $found_user['id'];
            $_SESSION['username'] = $found_user['username'];
            $_SESSION['is_admin'] = $found_user['is_admin'];
            $_SESSION['can_write_post'] = $found_user['can_write_post'];
            $_SESSION['display_name'] = $found_user['display_name'];
            $_SESSION['profile_picture'] = $found_user['profile_picture'];
            $_SESSION['date_of_birth'] = $found_user['date_of_birth'];
            $_SESSION['bio'] = $found_user['bio'];

            error_log("DEBUG: loginUser - Login successful for user: '{$found_user['username']}'");
            ob_clean();
            echo json_encode(['success' => true, 'message' => 'Login berhasil! Selamat datang, ' . $found_user['username'] . '!']);
            exit();
        } else {
            error_log("ERROR: loginUser - Incorrect password for user: '{$username_email}'");
            ob_clean();
            echo json_encode(['success' => false, 'message' => 'Kata sandi salah.']);
            exit();
        }
    } else {
        error_log("ERROR: loginUser - Username or email not found in loaded users: '{$username_email}'");
        ob_clean();
        echo json_encode(['success' => false, 'message' => 'Nama pengguna atau email tidak ditemukan.']);
        exit();
    }
}

function updateUserProfile($data) {
    if (!isset($_SESSION['user_id'])) {
        ob_clean();
        echo json_encode(['success' => false, 'message' => 'Anda harus login untuk memperbarui profil.']);
        exit();
    }

    $user_id = $_SESSION['user_id'];
    $new_username = trim($data['username'] ?? '');
    $display_name = trim($data['display_name'] ?? '');
    $profile_picture = trim($data['profile_picture'] ?? '');
    $date_of_birth = trim($data['date_of_birth'] ?? '');
    $bio = trim($data['bio'] ?? '');

    if (!empty($profile_picture) && !filter_var($profile_picture, FILTER_VALIDATE_URL)) {
        ob_clean();
        echo json_encode(['success' => false, 'message' => 'URL Foto Profil tidak valid.']);
        exit();
    }

    $bio = htmlspecialchars($bio, ENT_QUOTES, 'UTF-8');
    $display_name = htmlspecialchars($display_name, ENT_QUOTES, 'UTF-8');
    $new_username = htmlspecialchars($new_username, ENT_QUOTES, 'UTF-8');

    $users = getUsers();
    $user_found = false;
    $current_user_key = -1;

    foreach ($users as $key => $user) {
        if ($user['id'] === $user_id) {
            $current_user_key = $key;
            if ($user['username'] !== $new_username) {
                foreach ($users as $other_user) {
                    if ($other_user['id'] !== $user_id && $other_user['username'] === $new_username) {
                        ob_clean();
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
        $users[$current_user_key]['username'] = $new_username;
        $users[$current_user_key]['display_name'] = $display_name;
        $users[$current_user_key]['profile_picture'] = $profile_picture;
        $users[$current_user_key]['date_of_birth'] = $date_of_birth;
        $users[$current_user_key]['bio'] = $bio;

        saveUsers($users);

        $_SESSION['username'] = $new_username;
        $_SESSION['display_name'] = $display_name;
        $_SESSION['profile_picture'] = $profile_picture;
        $_SESSION['date_of_birth'] = $date_of_birth;
        $_SESSION['bio'] = $bio;

        ob_clean();
        echo json_encode(['success' => true, 'message' => 'Profil berhasil diperbarui!']);
        exit();
    } else {
        ob_clean();
        echo json_encode(['success' => false, 'message' => 'Pengguna tidak ditemukan.']);
        exit();
    }
}

function logoutUser() {
    error_log("DEBUG: logoutUser called.");
    $_SESSION = array();

    if (ini_get("session.use_cookies")) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params["path"], $params["domain"],
            $params["secure"], $params["httponly"]
        );
    }

    session_destroy();
    error_log("DEBUG: Session destroyed.");

    ob_clean(); // Bersihkan buffer sebelum mengirimkan respons JSON
    echo json_encode(['success' => true, 'message' => 'Logout berhasil.']);
    exit();
}
?>
