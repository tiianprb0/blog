<?php
session_start(); // Mulai sesi PHP

$requested_username = null;

// Ambil username dari PATH_INFO (ini akan diset oleh .htaccess untuk /blog/user/@username)
if (isset($_SERVER['PATH_INFO'])) {
    $path_info = explode('/', trim($_SERVER['PATH_INFO'], '/'));
    if (!empty($path_info[0])) {
        $requested_username = htmlspecialchars($path_info[0], ENT_QUOTES, 'UTF-8');
    }
}

// Path ke file JSON tempat menyimpan data pengguna
// Pastikan path ini benar relatif dari public_html/blog/user/ ke public_html/blog/knock2/users.json
define('USERS_FILE', '../knock2/users.json');

// Fungsi untuk membaca data pengguna dari file JSON
function getUsers() {
    if (!file_exists(USERS_FILE)) {
        return [];
    }
    $json_data = file_get_contents(USERS_FILE);
    $users = json_decode($json_data, true);
    return is_array($users) ? $users : [];
}

$user_data = null;
$is_own_profile = false; // Default: bukan profil sendiri

if ($requested_username) {
    // Mode publik (atau profil sendiri diakses via URL publik): temukan pengguna berdasarkan username
    $all_users = getUsers();
    foreach ($all_users as $user) {
        // Bandingkan username yang diminta dengan username di data (hapus '@' dari requested_username jika ada untuk perbandingan)
        $clean_requested_username = str_replace('@', '', $requested_username);
        if ($user['username'] === $clean_requested_username) {
            $user_data = $user;
            break;
        }
    }
    if (!$user_data) {
        // Pengguna tidak ditemukan, alihkan ke halaman 404 atau tampilkan pesan
        header('Location: /blog/404.php'); // Pastikan Anda memiliki file ini
        exit();
    }
    // Periksa apakah ini profil pengguna yang sedang login
    if (isset($_SESSION['user_id']) && $_SESSION['username'] === $user_data['username']) {
        $is_own_profile = true;
    }
} else {
    // Mode pribadi: butuh login untuk melihat profil sendiri (jika user/index.php diakses tanpa parameter)
    if (!isset($_SESSION['user_id'])) {
        header('Location: /blog/knock2/'); // Alihkan ke halaman login
        exit();
    }
    // Ambil data pengguna dari sesi untuk profil pribadi
    $user_data = [
        'username' => $_SESSION['username'] ?? 'Guest',
        'display_name' => $_SESSION['display_name'] ?? ($_SESSION['username'] ?? 'Guest'),
        'profile_picture' => $_SESSION['profile_picture'] ?? 'https://placehold.co/100x100/A0B9A0/white?text=User',
        'date_of_birth' => $_SESSION['date_of_birth'] ?? '',
        'bio' => $_SESSION['bio'] ?? 'No bio yet.'
    ];
    $is_own_profile = true; // Ini adalah profil sendiri
}

// Ambil data yang akan ditampilkan (setelah $user_data dipastikan ada)
// Pastikan username memiliki '@' di sini untuk tampilan
$current_username_display = '@' . htmlspecialchars($user_data['username']);
$display_name = htmlspecialchars($user_data['display_name']);
$profile_picture = htmlspecialchars($user_data['profile_picture']);
$date_of_birth = $user_data['date_of_birth'];
$bio = htmlspecialchars($user_data['bio']);

// Hitung umur (hanya untuk modal edit, tidak ditampilkan di UI utama)
$age_text_for_modal = 'N/A';
if (!empty($date_of_birth)) {
    $dob = new DateTime($date_of_birth);
    $now = new DateTime();
    $age_years = $now->diff($dob)->y;
    $age_text_for_modal = $age_years . ' years old';
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo $display_name; ?>'s Profile - Tian Blog</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- PERBAIKAN: Menggunakan tag <link> untuk CSS -->
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <div class="header-icons">
            <div class="header-icon-left">
                <!-- Ikon placeholder mirip grafik batang -->
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4 20H20V22H4V20ZM6 10H8V18H6V10ZM10 6H12V18H10V6ZM14 14H16V18H14V14ZM18 2H20V18H18V2Z" fill="currentColor"/>
                </svg>
            </div>
            <div class="header-icon-right">
                <!-- Ikon baru untuk /blog/ -->
                <button class="blog-link-btn" id="blog-link-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8ZM12 10C13.1046 10 14 10.8954 14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10Z" fill="currentColor"/>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12ZM20 12C20 16.4183 16.4183 20 12 20C7.58172 20 4 16.4183 4 12C4 7.58172 7.58172 4 12 4C16.4183 4 20 7.58172 20 12Z" fill="currentColor"/>
                    </svg>
                </button>
                <!-- Hamburger menu icon -->
                <?php if ($is_own_profile): ?>
                <button class="hamburger-menu-btn" id="hamburger-menu-btn">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M3 12H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M3 6H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M3 18H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
                <?php endif; ?>
            </div>
        </div>

        <!-- Profil View Mode -->
        <div id="profile-view-mode">
            <div class="profile-main-layout">
                <div class="profile-text-content">
                    <h1 class="display-name" id="display-name-text"><?php echo $display_name; ?></h1>
                    <p class="username" id="current-username-text"><?php echo $current_username_display; ?></p>
                    <p class="bio-display" id="user-bio-display"><?php echo $bio; ?></p>
                </div>
                <div class="profile-avatar-wrapper">
                    <img src="<?php echo $profile_picture; ?>" alt="Profile Picture" class="profile-avatar" id="profile-avatar-display">
                </div>
            </div>

            <div class="profile-buttons">
                <?php if ($is_own_profile): ?>
                    <button class="btn btn-edit-profile" id="edit-profile-btn">Edit profile</button>
                <?php endif; ?>
                <button class="btn btn-share-profile" id="share-profile-btn">Share profile</button>
            </div>
        </div>
        
        <!-- Profil Edit Mode (Inline) -->
        <?php if ($is_own_profile): ?>
        <div id="profile-edit-mode" style="display: none;">
            <h2 class="section-title">Edit Profile</h2>
            <form id="edit-profile-form">
                <div class="form-group">
                    <label for="edit-username">Username:</label>
                    <input type="text" id="edit-username" name="username" value="<?php echo htmlspecialchars(str_replace('@', '', $current_username_display)); ?>">
                </div>
                <div class="form-group">
                    <label for="edit-display-name">Display Name:</label>
                    <input type="text" id="edit-display-name" name="display_name" value="<?php echo $display_name; ?>">
                </div>
                <div class="form-group">
                    <label for="edit-profile-picture">Profile Picture URL:</label>
                    <input type="url" id="edit-profile-picture" name="profile_picture" value="<?php echo $profile_picture; ?>">
                </div>
                <div class="form-group">
                    <label for="edit-date-of-birth">Date of Birth:</label>
                    <input type="date" id="edit-date-of-birth" name="date_of_birth" value="<?php echo $date_of_birth; ?>">
                </div>
                <div class="form-group">
                    <label for="edit-bio">Bio:</label>
                    <textarea id="edit-bio" name="bio" rows="4"><?php echo $bio; ?></textarea>
                </div>
                <button type="submit" class="btn btn-primary">Save Changes</button>
                <button type="button" class="btn btn-secondary" id="cancel-edit-btn">Cancel</button>
            </form>
            <div id="edit-profile-message" class="message"></div>
        </div>
        <?php endif; ?>
    </div>

    <!-- Hamburger Menu Modal (for Logout) -->
    <?php if ($is_own_profile): ?>
    <div class="modal-overlay" id="hamburger-menu-modal">
        <div class="modal-content-small">
            <button class="btn btn-logout-modal" id="logout-btn-modal">Log Out</button>
            <button class="btn btn-secondary" id="close-hamburger-modal">Cancel</button>
        </div>
    </div>
    <?php endif; ?>

    <!-- Loading Overlay -->
    <div class="loading-overlay" id="loading-overlay" style="display: none;">
        <div class="loading-spinner"></div>
        <p>Memuat...</p>
    </div>

    <!-- PERBAIKAN: Memuat style.css dengan tag <link> -->
    <script src="script.js" defer></script>
</body>
</html>
