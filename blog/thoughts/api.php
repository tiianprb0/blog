<?php
// Aktifkan semua pelaporan kesalahan PHP untuk debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Debug: Menandai awal eksekusi skrip PHP
error_log("DEBUG: api.php script started.");

// Mulai sesi PHP (diperlukan untuk mendapatkan user_id dari sesi)
session_start();

// Set header untuk response JSON
header('Content-Type: application/json');

// Path ke file JSON tempat menyimpan data postingan
define('POSTS_FILE', __DIR__ . '/posts.json');
// Path ke direktori tempat menyimpan postingan HTML yang dipublikasikan
define('PUBLISHED_DIR', __DIR__ . '/../i/'); // blog/i/

// Pastikan direktori PUBLISHED_DIR ada dan dapat ditulis
if (!is_dir(PUBLISHED_DIR)) {
    mkdir(PUBLISHED_DIR, 0755, true);
}

// Fungsi untuk membaca data pengguna dari file JSON (untuk mendapatkan info author)
// Path ke file JSON tempat menyimpan data pengguna (relatif dari api.php)
define('USERS_FILE', __DIR__ . '/../knock2/users.json');

function getUsers() {
    if (!file_exists(USERS_FILE)) {
        // Debug: File users.json tidak ditemukan
        error_log("USERS_FILE not found: " . USERS_FILE);
        return [];
    }
    $json_data = file_get_contents(USERS_FILE);
    if ($json_data === false) {
        // Debug: Gagal membaca users.json
        error_log("Failed to read USERS_FILE: " . USERS_FILE);
        return [];
    }
    $users = json_decode($json_data, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        // Debug: Kesalahan parsing JSON pada users.json
        error_log("JSON parse error in USERS_FILE: " . json_last_error_msg());
        return [];
    }
    return is_array($users) ? $users : [];
}


// Fungsi untuk membaca data postingan dari file JSON
function getPosts() {
    if (!file_exists(POSTS_FILE)) {
        // Debug: File posts.json tidak ditemukan, membuat file kosong.
        error_log("POSTS_FILE not found: " . POSTS_FILE . ". Creating empty file.");
        file_put_contents(POSTS_FILE, json_encode([])); // Buat file jika tidak ada
        return [];
    }
    $json_data = file_get_contents(POSTS_FILE);
    if ($json_data === false) {
        // Debug: Gagal membaca posts.json
        error_log("Failed to read POSTS_FILE: " . POSTS_FILE);
        return [];
    }
    $posts = json_decode($json_data, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        // Debug: Kesalahan parsing JSON pada posts.json
        error_log("JSON parse error in POSTS_FILE: " . json_last_error_msg() . " Raw data: " . $json_data);
        return [];
    }
    return is_array($posts) ? $posts : [];
}

// Fungsi untuk menulis data postingan ke file JSON
function savePosts($posts) {
    $result = file_put_contents(POSTS_FILE, json_encode($posts, JSON_PRETTY_PRINT));
    if ($result === false) {
        // Debug: Gagal menulis ke posts.json
        error_log("Failed to write to POSTS_FILE: " . POSTS_FILE);
    }
    return $result;
}

// Fungsi untuk membersihkan string menjadi slug yang aman untuk URL
function slugify($text) {
    // Ganti karakter non-alfanumerik dengan strip
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    // Transliterasi jika ada (misal dari aksen ke karakter dasar)
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    // Hapus karakter yang tersisa yang bukan alfanumerik atau strip
    $text = preg_replace('~[^-\w]+~', '', $text);
    // Trim strip dari awal dan akhir
    $text = trim($text, '-');
    // Ganti multiple strip dengan single strip
    $text = preg_replace('~-+~', '-', $text);
    // Ubah ke lowercase
    $text = strtolower($text);

    if (empty($text)) {
        return 'n-a';
    }
    return $text;
}

// Fungsi untuk menghasilkan HTML postingan dari struktur data blok
function generatePostHtml($post_data, $author_info) {
    $title = htmlspecialchars($post_data['title'] ?? 'Untitled Post');
    $synopsis = htmlspecialchars($post_data['synopsis'] ?? '');
    $thumbnail_url = htmlspecialchars($post_data['thumbnail_url'] ?? '');
    $thumbnail_caption = htmlspecialchars($post_data['thumbnail_caption'] ?? '');
    $content_blocks = $post_data['content_blocks'] ?? [];
    $published_at = new DateTime($post_data['published_at'] ?? 'now');
    $edited_at = new DateTime($post_data['edited_at'] ?? 'now');
    $category = htmlspecialchars($post_data['category'] ?? 'Uncategorized'); // Ambil kategori

    $author_name = htmlspecialchars($author_info['display_name'] ?? $author_info['username'] ?? 'Unknown Author');
    $author_avatar = htmlspecialchars($author_info['profile_picture'] ?? 'https://placehold.co/100x100/A0B9A0/white?text=Author');
    $author_profession = htmlspecialchars($author_info['profession'] ?? 'Blogger'); // Asumsi ada field profession di data user

    $html_content = '';
    $headings_for_toc = []; // Untuk membangun TOC

    // Kumpulkan heading untuk TOC
    foreach ($content_blocks as $block) {
        if (isset($block['type']) && strpos($block['type'], 'heading') === 0 && !empty($block['content'])) {
            $heading_level = (int)str_replace('heading', '', $block['type']);
            $headings_for_toc[] = [
                'id' => 'heading-' . htmlspecialchars($block['id']),
                'text' => htmlspecialchars($block['content']),
                'level' => $heading_level
            ];
        }
    }

    $toc_html = '';
    if (!empty($headings_for_toc)) {
        $toc_html .= '
            <div class="toc-container">
                <div class="toc-header">
                    <span>Table of Contents</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="toc-content">
                    <ul class="toc-list">
        ';
        $current_level = 2; // TOC dimulai dari H2
        foreach ($headings_for_toc as $heading) {
            // Tutup tag </li> dari item sebelumnya jika level sama atau lebih tinggi
            if ($heading['level'] <= $current_level && $toc_html !== '
            <div class="toc-container">
                <div class="toc-header">
                    <span>Table of Contents</span>
                    <i class="fas fa-chevron-down"></i>
                </div>
                <div class="toc-content">
                    <ul class="toc-list">
        ') {
                $toc_html .= '</li>';
            }

            // Turun level (buka <ul> baru)
            while ($current_level < $heading['level']) {
                $toc_html .= '<ul>';
                $current_level++;
            }
            // Naik level (tutup </ul>)
            while ($current_level > $heading['level']) {
                $toc_html .= '</ul></li>'; // Tutup </ul> dan </li> dari parent
                $current_level--;
            }
            
            // Tambahkan <li> baru dengan link
            $toc_html .= '<li' . ($heading['level'] > 2 ? ' class="sub-item"' : '') . '><a href="#' . $heading['id'] . '">' . $heading['text'] . '</a>';
        }
        // Tutup semua tag yang belum tertutup di akhir
        while ($current_level > 1) { // Tutup sampai level dasar (misal H2)
            $toc_html .= '</li></ul>';
            $current_level--;
        }
        // Pastikan </ul> terakhir dari toc-list ditutup jika ada <li> yang belum ditutup
        if (substr($toc_html, -5) === '</li>') {
            $toc_html = substr($toc_html, 0, -5); // Hapus </li> terakhir yang tidak perlu
        }
        $toc_html .= '
                    </ul>
                </div>
            </div>
        ';
    }


    foreach ($content_blocks as $index => $block) {
        $block_type = $block['type'] ?? '';
        switch ($block_type) {
            case 'paragraph':
                $content = htmlspecialchars($block['content'] ?? '');
                if ($index === 0) { // Dropcap untuk paragraf pertama
                    $html_content .= '<p class="dropcap">' . $content . '</p>';
                } else {
                    $html_content .= '<p>' . $content . '</p>';
                }
                break;
            case 'heading2':
            case 'heading3':
            case 'heading4':
                $content = htmlspecialchars($block['content'] ?? '');
                $heading_tag = str_replace('heading', 'h', $block_type);
                $html_content .= '<' . $heading_tag . ' id="heading-' . htmlspecialchars($block['id']) . '">' . $content . '</' . $heading_tag . '>';
                break;
            case 'image':
                $url = htmlspecialchars($block['url'] ?? '');
                $caption = htmlspecialchars($block['caption'] ?? '');
                if ($url) {
                    $html_content .= '
                        <figure>
                            <img src="' . $url . '" alt="' . ($caption ?: 'Gambar') . '" class="post-image">
                            ' . ($caption ? '<figcaption>' . $caption . '</figcaption>' : '') . '
                        </figure>
                    ';
                }
                break;
            case 'carousel':
                $images = $block['images'] ?? [];
                if (!empty($images)) {
                    $carousel_inner_html = '';
                    $indicators_html = '';
                    foreach ($images as $img_idx => $img) {
                        $is_active = $img_idx === 0 ? 'active' : '';
                        $carousel_inner_html .= '
                            <div class="carousel-item">
                                <img src="' . htmlspecialchars($img['url'] ?? '') . '" alt="' . htmlspecialchars($img['caption'] ?? 'Carousel Image') . '">
                            </div>
                        ';
                        $indicators_html .= '<div class="carousel-indicator ' . $is_active . '"></div>';
                    }
                    $html_content .= '
                        <div class="carousel">
                            <div class="carousel-inner">' . $carousel_inner_html . '</div>
                            <div class="carousel-control prev"><i class="fas fa-chevron-left"></i></div>
                            <div class="carousel-control next"><i class="fas fa-chevron-right"></i></div>
                            <div class="carousel-indicators">' . $indicators_html . '</div>
                        </div>
                    ';
                }
                break;
            case 'swipe-gallery':
                $images = $block['images'] ?? [];
                if (!empty($images)) {
                    $swipe_inner_html = '';
                    foreach ($images as $img) {
                        $swipe_inner_html .= '
                            <div class="swipe-item">
                                <img src="' . htmlspecialchars($img['url'] ?? '') . '" alt="' . htmlspecialchars($img['caption'] ?? 'Swipe Image') . '">
                            </div>
                        ';
                    }
                    $html_content .= '
                        <div class="swipe-gallery">
                            <div class="swipe-inner">' . $swipe_inner_html . '</div>
                        </div>
                    ';
                }
                break;
            case 'grid-gallery':
                $images = $block['images'] ?? [];
                if (!empty($images)) {
                    $grid_inner_html = '';
                    foreach ($images as $img) {
                        $grid_inner_html .= '
                            <figure>
                                <img src="' . htmlspecialchars($img['url'] ?? '') . '" alt="' . htmlspecialchars($img['caption'] ?? 'Grid Image') . '">
                            </figure>
                        ';
                    }
                    $show_all_button = count($images) > 4 ? '<button class="show-all-btn"><i class="fas fa-plus"></i> Show All</button>' : '';
                    $html_content .= '
                        <div class="gallery ' . (count($images) > 4 ? 'more' : '') . '">
                            <div class="grid-inner">
                                ' . $grid_inner_html . '
                                ' . $show_all_button . '
                            </div>
                        </div>
                    ';
                }
                break;
            case 'code':
                $language = htmlspecialchars($block['language'] ?? 'Code');
                $content = htmlspecialchars($block['content'] ?? '');
                if ($content) {
                    $html_content .= '
                        <pre><code class="language-' . strtolower($language) . '">
                            <span class="code-header">' . $language . '</span>
                            ' . $content . '
                        </code></pre>
                    ';
                }
                break;
            case 'blockquote':
                $quote = htmlspecialchars($block['quote'] ?? '');
                $author = htmlspecialchars($block['author'] ?? '');
                if ($quote) {
                    $html_content .= '
                        <h1>Test</h1>
                        <blockquote>
                            <p>' . $quote . '</p>
                            ' . ($author ? '<span class="quote-author">' . $author . '</span>' : '') . '
                        </blockquote>
                    ';
                }
                break;
            case 'note':
                $title_note = htmlspecialchars($block['title'] ?? '');
                $content_note = htmlspecialchars($block['content'] ?? '');
                if ($content_note) {
                    $html_content .= '
                        <div class="note-box">
                            ' . ($title_note ? '<div class="note-title"><i class="fas fa-lightbulb"></i> ' . $title_note . '</div>' : '') . '
                            <div class="note-content">
                                <p>' . $content_note . '</p>
                            </div>
                        </div>
                    ';
                }
                break;
            case 'youtube':
                $video_id = htmlspecialchars($block['id'] ?? '');
                if ($video_id) {
                    $html_content .= '
                        <div class="youtube-container">
                            <img src="https://img.youtube.com/vi/' . $video_id . '/maxresdefault.jpg" alt="YouTube Video Thumbnail" class="youtube-thumbnail">
                            <div class="youtube-play-button" data-video-id="' . $video_id . '">
                                <i class="fas fa-play"></i>
                            </div>
                        </div>
                    ';
                }
                break;
            case 'table':
                $table_data = $block['content'] ?? [];
                if (is_array($table_data) && !empty($table_data)) {
                    $table_html = '<table><thead><tr>';
                    if (isset($table_data[0]) && is_array($table_data[0])) {
                        foreach ($table_data[0] as $header) {
                            $table_html .= '<th>' . htmlspecialchars($header) . '</th>';
                        }
                    }
                    $table_html .= '</tr></thead><tbody>';
                    for ($i = 1; $i < count($table_data); $i++) {
                        if (is_array($table_data[$i])) {
                            $table_html .= '<tr>';
                            foreach ($table_data[$i] as $cell) {
                                $table_html .= '<td>' . htmlspecialchars($cell) . '</td>';
                            }
                            $table_html .= '</tr>';
                        }
                    }
                    $table_html .= '</tbody></table>';
                    $html_content .= $table_html;
                }
                break;
            case 'ordered-list':
            case 'unordered-list':
                $items = $block['items'] ?? [];
                if (is_array($items) && !empty($items)) {
                    $list_tag = ($block_type === 'ordered-list') ? 'ol' : 'ul';
                    $list_html = '<' . $list_tag . '>';
                    foreach ($items as $item) {
                        $list_html .= '<li>' . htmlspecialchars($item) . '</li>';
                    }
                    $list_html .= '</' . $list_tag . '>';
                    $html_content .= $list_html;
                }
                break;
            case 'tabs':
                $tabs_data = $block['content'] ?? [];
                if (is_array($tabs_data) && !empty($tabs_data)) {
                    $tab_header_html = '<div class="tab-header">';
                    $tab_content_html = '';
                    foreach ($tabs_data as $tab_idx => $tab) {
                        $is_active = $tab_idx === 0 ? 'active' : '';
                        $tab_id = 'tab-' . htmlspecialchars($block['id']) . '-' . $tab_idx;
                        $tab_header_html .= '<button class="tab-btn ' . $is_active . '" data-tab="' . $tab_id . '">' . htmlspecialchars($tab['title'] ?? 'Tab ' . ($tab_idx + 1)) . '</button>';
                        $tab_content_html .= '
                            <div class="tab-content ' . $is_active . '" id="' . $tab_id . '">
                                <p>' . htmlspecialchars($tab['content'] ?? '') . '</p>
                            </div>
                        ';
                    }
                    $tab_header_html .= '</div>';
                    $html_content .= '<div class="tabs">' . $tab_header_html . $tab_content_html . '</div>';
                }
                break;
            case 'accordion':
                $accordion_data = $block['content'] ?? [];
                if (is_array($accordion_data) && !empty($accordion_data)) {
                    $accordion_html = '<div class="accordion">';
                    foreach ($accordion_data as $item_idx => $item) {
                        $is_active = $item_idx === 0 ? 'active' : '';
                        $accordion_html .= '
                            <div class="accordion-item ' . $is_active . '">
                                <div class="accordion-header">' . htmlspecialchars($item['title'] ?? 'Question ' . ($item_idx + 1)) . ' <i class="fas fa-chevron-down"></i></div>
                                <div class="accordion-content">
                                    <p>' . htmlspecialchars($item['content'] ?? '') . '</p>
                                </div>
                            </div>
                        ';
                    }
                    $accordion_html .= '</div>';
                    $html_content .= $accordion_html;
                }
                break;
            case 'spoiler':
                $summary = htmlspecialchars($block['summary'] ?? 'Click to reveal spoiler');
                $content = htmlspecialchars($block['content'] ?? '');
                if ($content) {
                    $html_content .= '
                        <details class="spoiler">
                            <summary>' . $summary . '</summary>
                            <div class="spoiler-content">
                                <p>' . $content . '</p>
                            </div>
                        </details>
                    ';
                }
                break;
        }
    }

    // URL untuk tombol share (akan diisi dengan URL postingan final)
    $share_url = ''; // Akan diisi di luar fungsi ini
    $share_title = urlencode($title);
    $share_text = urlencode($synopsis);

    $full_html = <<<HTML
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{$title} - Tian Blog</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Link ke file CSS eksternal -->
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/base16/solarized-light.min.css">
</head>
<body>
    <header class="blog-header">
        <h1 class="blog-title">Tian Blog</h1>
        <div class="breadcrumb">
            <a href="/blog">blog</a> / <a href="/blog/category/{$category}">{$category}</a>
        </div>
    </header>
    
    <article>
        <header class="post-header">
            <h1 class="post-title">{$title}</h1>
            <p class="post-synopsis">{$synopsis}</p>
            <div class="post-meta">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <img src="{$author_avatar}" alt="Author" class="author-avatar">
                    <div class="author-container">
                        <span class="author">{$author_name}</span>
                        <span class="profession">{$author_profession}</span>
                    </div>
                </div>
                <span class="date">{$published_at->format('M d, Y')} — <i class="far fa-clock"></i> 5 min read</span>
            </div>
            <div class="thumbnail-container">
                <img src="{$thumbnail_url}" alt="Thumbnail" class="thumbnail">
                <p class="thumbnail-caption">{$thumbnail_caption}</p>
            </div>
        </header>
        
        <div class="post-content">
            {$toc_html}
            {$html_content}
        </div>
    </article>
    
    <div class="share-float">
        <span>Share this post:</span>
        <a href="javascript:void(0);" class="share-btn" id="share-button-post"><i class="fas fa-share-alt"></i></a>
    </div>
    
    <a href="#" class="back-to-top"><i class="fas fa-arrow-up"></i></a>
    
    <footer>
        <p>© {$published_at->format('Y')} — Created by Tian with <i class="fas fa-heart footer-love"></i></p>
        <p>Dilarang mengutip dan menyadur teks serta memakai foto dari laman ini.</p>
    </footer>
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    <!-- Link ke file JavaScript eksternal -->
    <script src="script.js" defer></script>
</body>
</html>
HTML;

    return $full_html;
}

// Ambil input JSON dari request
$input = file_get_contents('php://input');
$data = json_decode($input, true);

// Periksa apakah data valid dan action ada
if (!isset($data['action'])) {
    echo json_encode(['success' => false, 'message' => 'Aksi tidak valid.']);
    exit();
}

// Pastikan pengguna sudah login untuk aksi yang memerlukan otentikasi
$requires_auth = ['create_post', 'update_post', 'delete_post', 'get_posts']; // Tambahkan 'get_posts' jika ingin memfilter
if (in_array($data['action'], $requires_auth) && !isset($_SESSION['user_id'])) {
    echo json_encode(['success' => false, 'message' => 'Anda harus login untuk melakukan aksi ini.']);
    exit();
}

switch ($data['action']) {
    case 'get_posts':
        $posts = getPosts();
        $all_users = getUsers();
        $filtered_posts = [];
        $current_user_id = $_SESSION['user_id'] ?? null; // Dapatkan ID pengguna dari sesi
        $status_filter = $data['status'] ?? 'all'; // Dapatkan filter status dari request

        foreach ($posts as &$post) {
            // Filter hanya postingan milik user yang sedang login
            if ($current_user_id !== null && isset($post['author_id']) && $post['author_id'] == $current_user_id) {
                // Filter berdasarkan status jika bukan 'all'
                if ($status_filter === 'all' || $post['status'] === $status_filter) {
                    $author_found = false;
                    foreach ($all_users as $user) {
                        if (isset($post['author_id']) && $user['id'] == $post['author_id']) {
                            $post['author_display_name'] = $user['display_name'] ?? $user['username'];
                            $post['author_profile_picture'] = $user['profile_picture'] ?? 'https://placehold.co/100x100/A0B9A0/white?text=Author';
                            $post['author_username'] = $user['username']; // Pastikan username juga ada
                            $author_found = true;
                            break;
                        }
                    }
                    if (!$author_found) {
                        // Fallback jika author tidak ditemukan di users.json
                        $post['author_display_name'] = $post['author_username'] ?? 'Unknown Author';
                        $post['author_profile_picture'] = 'https://placehold.co/100x100/A0B9A0/white?text=Author';
                    }
                    $filtered_posts[] = $post; // Tambahkan postingan yang difilter
                }
            }
        }
        // Debug: Log the posts array right before encoding
        error_log("Posts array before encoding: " . print_r($filtered_posts, true));
        echo json_encode(['success' => true, 'posts' => $filtered_posts]);
        break;

    case 'get_post':
        // Debug: Log the raw input for get_post
        error_log("DEBUG: get_post action received. Raw input: " . $input);
        
        $post_id = $data['id'] ?? null;
        
        // Debug: Log the extracted post_id
        error_log("DEBUG: get_post - Extracted post_id: " . ($post_id ?? 'NULL'));

        if (!$post_id) {
            echo json_encode(['success' => false, 'message' => 'ID postingan tidak ditemukan.']);
            exit();
        }
        $posts = getPosts();
        $found_post = null;
        $current_user_id = $_SESSION['user_id'] ?? null; // Dapatkan ID pengguna dari sesi

        foreach ($posts as $post) {
            // Pastikan hanya bisa mendapatkan postingan milik sendiri
            if ($post['id'] == $post_id && isset($post['author_id']) && $post['author_id'] == $current_user_id) {
                $found_post = $post;
                break;
            }
        }
        if ($found_post) {
            // Debug: Log the found post data
            error_log("DEBUG: get_post - Found post: " . print_r($found_post, true));
            echo json_encode(['success' => true, 'post' => $found_post]);
        } else {
            // Debug: Log that post was not found
            error_log("DEBUG: get_post - Post with ID {$post_id} not found or not owned by current user.");
            echo json_encode(['success' => false, 'message' => 'Postingan tidak ditemukan atau Anda tidak memiliki izin untuk melihatnya.']);
        }
        break;

    case 'create_post':
        $new_post_data = $data['post'] ?? [];
        if (empty($new_post_data['title'])) {
            echo json_encode(['success' => false, 'message' => 'Judul postingan tidak boleh kosong.']);
            exit();
        }

        $posts = getPosts();
        $new_id = count($posts) > 0 ? max(array_column($posts, 'id')) + 1 : 1;

        // Ambil info author dari sesi login
        $author_id = $_SESSION['user_id'] ?? 'guest';
        $author_username = $_SESSION['username'] ?? 'guest';
        $author_display_name = $_SESSION['display_name'] ?? $author_username;
        $author_profile_picture = $_SESSION['profile_picture'] ?? 'https://placehold.co/100x100/A0B9A0/white?text=Author';


        $new_post = [
            'id' => $new_id,
            'author_id' => $author_id,
            'author_username' => $author_username,
            'author_display_name' => $author_display_name, // Simpan display_name
            'author_profile_picture' => $author_profile_picture, // Simpan profile_picture
            'title' => $new_post_data['title'],
            'slug' => slugify($new_post_data['title']), // Generate slug
            'synopsis' => $new_post_data['synopsis'] ?? '',
            'thumbnail_url' => $new_post_data['thumbnail_url'] ?? '',
            'thumbnail_caption' => $new_post_data['thumbnail_caption'] ?? '',
            'content_blocks' => $new_post_data['content_blocks'] ?? [],
            'status' => $new_post_data['status'] ?? 'draft',
            'published_at' => ($new_post_data['status'] === 'published' && empty($new_post_data['published_at'])) ? date('Y-m-d H:i:s') : ($new_post_data['published_at'] ?? null),
            'created_at' => date('Y-m-d H:i:s'),
            'edited_at' => date('Y-m-d H:i:s'),
            'category' => $new_post_data['category'] ?? 'Uncategorized' // Simpan kategori
        ];

        $posts[] = $new_post;
        savePosts($posts);

        // Jika statusnya published, generate HTML
        if ($new_post['status'] === 'published') {
            $author_info_for_html = [
                'username' => $author_username,
                'display_name' => $author_display_name,
                'profile_picture' => $author_profile_picture,
                'profession' => $_SESSION['profession'] ?? 'Blogger' // Asumsi default profession
            ];
            $post_html_content = generatePostHtml($new_post, $author_info_for_html);
            $filename = PUBLISHED_DIR . $new_post['slug'] . '.html';
            file_put_contents($filename, $post_html_content);
            $new_post_url = '/blog/i/' . $new_post['slug'] . '.html';
            echo json_encode(['success' => true, 'message' => 'Postingan berhasil dibuat dan dipublikasikan!', 'post_id' => $new_id, 'post_url' => $new_post_url]);
        } else {
            echo json_encode(['success' => true, 'message' => 'Draft berhasil disimpan!', 'post_id' => $new_id]);
        }
        break;

    case 'update_post':
        $updated_post_data = $data['post'] ?? [];
        $post_id = $updated_post_data['id'] ?? null;
        $publish_flag = $data['publish'] ?? false; // Flag untuk publikasi

        if (!$post_id) {
            echo json_encode(['success' => false, 'message' => 'ID postingan tidak ditemukan untuk diperbarui.']);
            exit();
        }
        if (empty($updated_post_data['title'])) {
            echo json_encode(['success' => false, 'message' => 'Judul postingan tidak boleh kosong.']);
            exit();
        }

        $posts = getPosts();
        $found_index = -1;
        $current_user_id = $_SESSION['user_id'] ?? null; // Dapatkan ID pengguna dari sesi

        foreach ($posts as $index => $post) {
            // Pastikan hanya bisa mengupdate postingan milik sendiri
            if ($post['id'] == $post_id && isset($post['author_id']) && $post['author_id'] == $current_user_id) {
                $found_index = $index;
                break;
            }
        }

        if ($found_index !== -1) {
            // Hapus file HTML lama jika slug berubah atau status berubah dari published ke draft
            $old_slug = $posts[$found_index]['slug'] ?? '';
            $old_status = $posts[$found_index]['status'] ?? 'draft';

            // Perbarui data yang ada
            $posts[$found_index]['title'] = $updated_post_data['title'];
            $posts[$found_index]['slug'] = slugify($updated_post_data['title']); // Update slug
            $posts[$found_index]['synopsis'] = $updated_post_data['synopsis'] ?? '';
            $posts[$found_index]['thumbnail_url'] = $updated_post_data['thumbnail_url'] ?? '';
            $posts[$found_index]['thumbnail_caption'] = $updated_post_data['thumbnail_caption'] ?? '';
            $posts[$found_index]['content_blocks'] = $updated_post_data['content_blocks'] ?? [];
            $posts[$found_index]['edited_at'] = date('Y-m-d H:i:s');
            $posts[$found_index]['category'] = $updated_post_data['category'] ?? 'Uncategorized'; // Simpan kategori

            // Tangani perubahan status publikasi
            if ($publish_flag && $posts[$found_index]['status'] !== 'published') {
                $posts[$found_index]['status'] = 'published';
                $posts[$found_index]['published_at'] = date('Y-m-d H:i:s');
            } else if (!$publish_flag && $posts[$found_index]['status'] === 'published') {
                // Jika tidak ada flag publish tapi sebelumnya published, biarkan status published
                // Jika ingin unpublish, perlu aksi terpisah
            } else if ($publish_flag && $posts[$found_index]['status'] === 'published') {
                // Sudah published, tetap published, biarkan published_at tetap yang pertama kali dipublikasikan
            } else { // Jika publish_flag false dan statusnya draft, tetap draft
                $posts[$found_index]['status'] = $updated_post_data['status'] ?? 'draft';
            }

            // Hapus file HTML lama jika slug berubah
            if ($old_slug && $old_slug !== $posts[$found_index]['slug'] && file_exists(PUBLISHED_DIR . $old_slug . '.html')) {
                unlink(PUBLISHED_DIR . $old_slug . '.html');
            }
            // Hapus file HTML jika status berubah dari published menjadi draft
            if ($old_status === 'published' && $posts[$found_index]['status'] === 'draft' && file_exists(PUBLISHED_DIR . $posts[$found_index]['slug'] . '.html')) {
                unlink(PUBLISHED_DIR . $posts[$found_index]['slug'] . '.html');
            }


            savePosts($posts);

            // Jika statusnya published, generate/update HTML
            $post_url = null;
            if ($posts[$found_index]['status'] === 'published') {
                // Ambil info author dari sesi login untuk generate HTML
                $author_info_for_html = [
                    'username' => $_SESSION['username'] ?? 'Unknown Author',
                    'display_name' => $_SESSION['display_name'] ?? 'Unknown Author',
                    'profile_picture' => $_SESSION['profile_picture'] ?? 'https://placehold.co/100x100/A0B9A0/white?text=Author',
                    'profession' => $_SESSION['profession'] ?? 'Blogger'
                ];
                $post_html_content = generatePostHtml($posts[$found_index], $author_info_for_html);
                $filename = PUBLISHED_DIR . $posts[$found_index]['slug'] . '.html';
                file_put_contents($filename, $post_html_content);
                $post_url = '/blog/i/' . $posts[$found_index]['slug'] . '.html';
                echo json_encode(['success' => true, 'message' => 'Postingan berhasil diperbarui dan dipublikasikan!', 'post_url' => $post_url]);
            } else {
                // Jika statusnya draft, pastikan file HTML dihapus jika sebelumnya published
                if ($old_status === 'published' && $posts[$found_index]['status'] === 'draft') {
                     // File sudah dihapus di atas
                }
                echo json_encode(['success' => true, 'message' => 'Postingan berhasil diperbarui!', 'post_url' => $post_url]);
            }
        } else {
            echo json_encode(['success' => false, 'message' => 'Postingan tidak ditemukan atau Anda tidak memiliki izin untuk memperbaruinya.']);
        }
        break;

    case 'delete_post':
        $post_id = $data['id'] ?? null;
        if (!$post_id) {
            echo json_encode(['success' => false, 'message' => 'ID postingan tidak ditemukan untuk dihapus.']);
            exit();
        }

        $posts = getPosts();
        $original_post_data = null;
        $posts_filtered = [];
        $current_user_id = $_SESSION['user_id'] ?? null; // Dapatkan ID pengguna dari sesi

        foreach ($posts as $post) {
            // Pastikan hanya bisa menghapus postingan milik sendiri
            if ($post['id'] == $post_id && isset($post['author_id']) && $post['author_id'] == $current_user_id) {
                $original_post_data = $post; // Simpan data post yang akan dihapus
            } else {
                $posts_filtered[] = $post;
            }
        }

        if ($original_post_data) {
            savePosts($posts_filtered);

            // Hapus file HTML yang dipublikasikan jika ada
            if ($original_post_data['status'] === 'published' && !empty($original_post_data['slug'])) {
                $filename = PUBLISHED_DIR . $original_post_data['slug'] . '.html';
                if (file_exists($filename)) {
                    unlink($filename);
                }
            }
            echo json_encode(['success' => true, 'message' => 'Postingan berhasil dihapus.']);
        } else {
            echo json_encode(['success' => false, 'message' => 'Postingan tidak ditemukan atau Anda tidak memiliki izin untuk menghapusnya.']);
        }
        break;

    default:
        echo json_encode(['success' => false, 'message' => 'Aksi tidak dikenal.']);
        break;
}
?>
