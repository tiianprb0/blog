<?php
session_start(); // Mulai sesi PHP

// Jika pengguna belum login, alihkan kembali ke halaman login
if (!isset($_SESSION['user_id'])) {
    header('Location: /blog/knock2/');
    exit();
}

// Jika display_name sudah diisi DAN pengguna BUKAN admin, alihkan ke halaman utama blog
if (!empty($_SESSION['display_name']) && $_SESSION['is_admin'] !== true) {
    header('Location: /blog/'); // Alihkan ke halaman utama blog
    exit();
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Thank You for Registering - Tian Blog</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <div class="slides-wrapper">
            <!-- Slide 1: Thank You Message -->
            <div class="slide active" id="slide-1">
                <div class="slide-content">
                    <h1 class="slide-title">Welcome to Tian Blog.</h1>
                    <p class="slide-description">
                        Your presence here is noted. This space is a reflection of personal observations and thoughts.
                        It is my hope that within these pages, you find something of value, perhaps a different perspective,
                        or a moment of quiet reflection. Thank you for joining this journey of shared insights.
                    </p>
                    <button class="btn btn-primary" id="next-slide">Continue</button>
                </div>
            </div>

            <!-- Slide 2: Profile Setup -->
            <div class="slide" id="slide-2">
                <div class="slide-content">
                    <h1 class="slide-title">Refine Your Profile</h1>
                    <p class="slide-description">
                        A few details to personalize your experience.
                    </p>
                    <form id="profile-setup-form">
                        <div class="form-group">
                            <label for="display-name">Display Name:</label>
                            <input type="text" id="display-name" name="display_name" placeholder="Your preferred name" value="<?php echo htmlspecialchars($_SESSION['display_name'] ?? ''); ?>">
                        </div>
                        <div class="form-group">
                            <label>Choose Profile Picture:</label>
                            <div class="profile-picture-options">
                                <img src="https://cdn1-production-images-kly.akamaized.net/cQFWSoD35CKeimIxiDXh-IjZBWU=/800x1066/smart/filters:quality(75):strip_icc():format(webp)/kly-media-production/medias/4800170/original/054098100_1712891803-Snapinsta.app_431456986_320679010586988_3826763435080087544_n_1080.jpg" alt="Profile Picture Option 1" class="profile-option" data-url="https://cdn1-production-images-kly.akamaized.net/cQFWSoD35CKeimIxiDXh-IjZBWU=/800x1066/smart/filters:quality(75):strip_icc():format(webp)/kly-media-production/medias/4800170/original/054098100_1712891803-Snapinsta.app_431456986_320679010586988_3826763435080087544_n_1080.jpg">
                                <img src="https://i.pinimg.com/736x/38/2a/8f/382a8fd5b8cef03fbce841bc5c3bf137.jpg" alt="Profile Picture Option 2" class="profile-option" data-url="https://i.pinimg.com/736x/38/2a/8f/382a8fd5b8cef03fbce841bc5c3bf137.jpg">
                                <img src="https://i.pinimg.com/736x/1f/0a/64/1f0a64973d9be906f4f8f0892ecd8afd.jpg" alt="Profile Picture Option 3" class="profile-option" data-url="https://i.pinimg.com/736x/1f/0a/64/1f0a64973d9be906f4f8f0892ecd8afd.jpg">
                                <img src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQPr8PZGyo80mdIW4fXxe9EgagL6MY0Iwl83Q&s" alt="Profile Picture Option 4" class="profile-option" data-url="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQPr8PZGyo80mdIW4fXxe9EgagL6MY0Iwl83Q&s">
                            </div>
                            <label for="profile-picture" class="or-label">Or enter URL:</label>
                            <input type="url" id="profile-picture" name="profile_picture" placeholder="https://example.com/photo.jpg" value="<?php echo htmlspecialchars($_SESSION['profile_picture'] ?? ''); ?>">
                        </div>
                        <div class="form-group">
                            <label for="date-of-birth">Date of Birth:</label>
                            <input type="date" id="date-of-birth" name="date_of_birth" value="<?php echo htmlspecialchars($_SESSION['date_of_birth'] ?? ''); ?>">
                        </div>
                        <div class="form-group">
                            <label for="gender">Gender:</label>
                            <select id="gender" name="gender">
                                <option value="" <?php echo (($_SESSION['gender'] ?? '') == '') ? 'selected' : ''; ?>>Select</option>
                                <option value="Male" <?php echo (($_SESSION['gender'] ?? '') == 'Male') ? 'selected' : ''; ?>>Male</option>
                                <option value="Female" <?php echo (($_SESSION['gender'] ?? '') == 'Female') ? 'selected' : ''; ?>>Female</option>
                                <option value="Other" <?php echo (($_SESSION['gender'] ?? '') == 'Other') ? 'selected' : ''; ?>>Other</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary">Save Profile</button>
                    </form>
                    <div id="profile-message" class="message"></div>
                </div>
            </div>
        </div>
    </div>

    <script src="script.js" defer></script>
</body>
</html>
