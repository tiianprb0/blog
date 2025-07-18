<?php
session_start(); // Mulai sesi PHP

// Periksa apakah pengguna sudah login DAN apakah mereka memiliki izin menulis postingan
if (!isset($_SESSION['user_id']) || !isset($_SESSION['can_write_post']) || $_SESSION['can_write_post'] !== true) {
    // Jika tidak login atau tidak memiliki izin, alihkan ke halaman login
    header('Location: /blog/knock2/');
    exit();
}

// Ambil ID postingan dari URL jika ada (untuk mode edit)
$post_id = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Placeholder untuk data postingan yang akan dimuat (jika mode edit)
$post_data = [
    'id' => $post_id,
    'title' => '',
    'synopsis' => '',
    'thumbnail_url' => '',
    'thumbnail_caption' => '',
    'category' => 'Uncategorized', // Default category
    'content_blocks' => [], // Array untuk menyimpan struktur konten
    'status' => 'draft', // Default status
    'published_at' => null,
    'edited_at' => null
];

// Jika ada post_id, kita akan memuat data postingan dari API di JavaScript
// PHP hanya menyiapkan struktur dasar
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Editor Postingan - Tian Blog</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/base16/solarized-light.min.css">
</head>
<body>
    <div class="container">
        <header class="editor-header">
            <h1 class="editor-title">Editor Postingan</h1>
            <div class="header-actions">
                <button class="btn btn-secondary" id="back-to-dashboard-btn">Kembali ke Dashboard</button>
                <button class="btn btn-primary" id="save-draft-btn">Simpan Draft</button>
                <button class="btn btn-primary" id="publish-post-btn">Publikasikan</button>
                <button class="btn btn-secondary" id="preview-btn">Pratinjau</button>
            </div>
        </header>

        <div id="editor-mode">
            <div class="editor-section metadata-section">
                <h2 class="section-title">Informasi Postingan</h2>
                <div class="form-group">
                    <label for="post-title">Judul Postingan:</label>
                    <input type="text" id="post-title" placeholder="Masukkan judul postingan Anda">
                </div>
                <div class="form-group">
                    <label for="post-synopsis">Sinopsis Postingan:</label>
                    <textarea id="post-synopsis" rows="3" placeholder="Ringkasan singkat tentang postingan"></textarea>
                </div>
                <div class="form-group">
                    <label for="thumbnail-url">URL Thumbnail:</label>
                    <input type="url" id="thumbnail-url" placeholder="https://example.com/thumbnail.jpg">
                </div>
                <div class="form-group">
                    <label for="thumbnail-caption">Keterangan Thumbnail:</label>
                    <input type="text" id="thumbnail-caption" placeholder="Keterangan untuk gambar thumbnail">
                </div>
                <div class="form-group">
                    <label for="post-category">Kategori:</label>
                    <input type="text" id="post-category" list="category-suggestions" placeholder="Pilih atau ketik kategori">
                    <datalist id="category-suggestions">
                        </datalist>
                </div>
            </div>

            <div class="editor-section content-editor-section">
                <h2 class="section-title">Konten Postingan</h2>
                <div class="content-blocks-container" id="content-blocks-container">
                    </div>

                <div class="add-block-controls">
                    <select id="block-type-select">
                        <option value="">Pilih Tipe Blok</option>
                        <option value="paragraph">Paragraf</option>
                        <option value="heading2">Heading H2</option>
                        <option value="heading3">Heading H3</option>
                        <option value="heading4">Heading H4</option>
                        <option value="image">Gambar (Default/Figure)</option>
                        <option value="carousel">Gambar (Carousel)</option>
                        <option value="swipe-gallery">Gambar (Swipe Gallery)</option>
                        <option value="grid-gallery">Gambar (Grid Gallery)</option>
                        <option value="code">Kode</option>
                        <option value="blockquote">Blockquote</option>
                        <option value="note">Note Box</option>
                        <option value="youtube">YouTube Video</option>
                        <option value="table">Tabel</option>
                        <option value="ordered-list">Daftar Berurutan</option>
                        <option value="unordered-list">Daftar Tak Berurutan</option>
                        <option value="tabs">Tabs</option>
                        <option value="accordion">Accordion</option>
                        <option value="spoiler">Spoiler</option>
                    </select>
                    <button class="btn btn-primary" id="add-block-btn">Tambah Blok</button>
                </div>
                <div id="editor-message" class="message"></div>
            </div>
        </div>

        <div id="preview-mode" style="display: none;">
            <div class="preview-content" id="preview-content">
                </div>
            <button class="btn btn-secondary" id="exit-preview-btn">Keluar Pratinjau</button>
        </div>
    </div>

    <div class="loading-overlay" id="loading-overlay" style="display: none;">
        <div class="loading-spinner"></div>
        <p>Menyimpan...</p>
    </div>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    <script src="script.js" defer></script>
</body>
</html>
