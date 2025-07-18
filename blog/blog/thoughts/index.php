<?php
session_start(); // Mulai sesi PHP

// Periksa apakah pengguna sudah login DAN apakah mereka memiliki izin menulis postingan
if (!isset($_SESSION['user_id']) || !isset($_SESSION['can_write_post']) || $_SESSION['can_write_post'] !== true) {
    // Jika tidak login atau tidak memiliki izin, alihkan ke halaman login
    header('Location: /blog/knock2/');
    exit();
}

// Data author dari sesi (akan digunakan sebagai fallback jika data post tidak lengkap)
$author_name = $_SESSION['display_name'] ?? $_SESSION['username'] ?? 'Unknown Author';
$author_avatar = $_SESSION['profile_picture'] ?? 'https://placehold.co/100x100/A0B9A0/white?text=Author';
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard Postingan - Tian Blog</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header class="dashboard-header">
            <h1 class="dashboard-title">Dashboard Postingan</h1>
            <div class="header-actions">
                <a href="/blog/" class="btn btn-secondary">Kembali ke Blog</a>
                <button class="btn btn-primary" id="create-post-btn">Buat Postingan Baru</button>
            </div>
        </header>

        <div class="post-list-container">
            <h2 class="section-title">Daftar Postingan</h2>
            <div id="posts-list" class="posts-list">
                <p id="loading-message">Memuat postingan...</p>
                <p id="no-posts-message" style="display: none;">Belum ada postingan. Ayo buat yang pertama!</p>
            </div>
        </div>
    </div>

    <script>
        document.addEventListener('DOMContentLoaded', async () => {
            const postsList = document.getElementById('posts-list');
            const loadingMessage = document.getElementById('loading-message');
            const noPostsMessage = document.getElementById('no-posts-message');
            const createPostBtn = document.getElementById('create-post-btn');

            // Fungsi untuk mengambil dan menampilkan postingan
            async function fetchAndDisplayPosts() {
                loadingMessage.style.display = 'block';
                noPostsMessage.style.display = 'none';
                postsList.innerHTML = ''; // Bersihkan daftar yang ada

                try {
                    const response = await fetch('api.php', {
                        method: 'POST', // Menggunakan metode POST
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'get_posts' }) // Mengirim aksi di body JSON
                    });
                    
                    const rawResponseText = await response.text();
                    console.log('Raw API response:', rawResponseText);

                    let result;
                    try {
                        result = JSON.parse(rawResponseText); // Coba parse secara manual
                    } catch (e) {
                        console.error('Error parsing JSON from API response:', e);
                        loadingMessage.textContent = 'Gagal memuat postingan: Respons API tidak valid.';
                        loadingMessage.classList.add('error');
                        return;
                    }
                    
                    console.log('Parsed API result:', result);

                    if (result.success && Array.isArray(result.posts) && result.posts.length > 0) {
                        loadingMessage.style.display = 'none';
                        result.posts.forEach(post => {
                            const postElement = document.createElement('div');
                            postElement.classList.add('post-item');
                            
                            const statusText = post.status === 'published' ? 'Dipublikasikan' : 'Draft';
                            const statusClass = post.status === 'published' ? 'status-published' : 'status-draft';

                            const publishDate = post.published_at ? new Date(post.published_at).toLocaleString() : 'Belum dipublikasikan';
                            const editedDate = post.edited_at ? new Date(post.edited_at).toLocaleString() : 'Belum diedit';
                            
                            const authorName = post.author_display_name || post.author_username || "<?php echo $author_name; ?>";
                            const authorAvatar = post.author_profile_picture || "<?php echo $author_avatar; ?>";


                            postElement.innerHTML = `
                                <div class="post-content">
                                    <div class="post-header">
                                        <span class="post-status ${statusClass}">${statusText}</span>
                                        <h3 class="post-title">${post.title || 'Judul Tanpa Nama'}</h3>
                                        <p class="post-synopsis">${post.synopsis || 'Tidak ada sinopsis.'}</p>
                                    </div>
                                    <div class="post-footer">
                                        <div class="author-info">
                                            <img src="${authorAvatar}" alt="Author Avatar" class="author-avatar">
                                            <span class="author-name">${authorName}</span>
                                        </div>
                                        <div class="post-dates">
                                            <span class="publish-date">${publishDate}</span>
                                        </div>
                                    </div>
                                </div>
                                <div class="post-actions">
                                    <button class="btn btn-edit" data-id="${post.id}">Edit</button>
                                    <button class="btn btn-delete" data-id="${post.id}">Hapus</button>
                                </div>
                            `;
                            postsList.appendChild(postElement);
                        });

                        document.querySelectorAll('.btn-edit').forEach(button => {
                            button.addEventListener('click', (e) => {
                                const postId = e.target.dataset.id;
                                window.location.href = `/blog/thoughts/ink/?id=${postId}`;
                            });
                        });

                        document.querySelectorAll('.btn-delete').forEach(button => {
                            button.addEventListener('click', async (e) => {
                                const postId = e.target.dataset.id;
                                if (confirm('Apakah Anda yakin ingin menghapus postingan ini?')) {
                                    const response = await fetch('api.php', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'delete_post', id: postId })
                                    });
                                    const result = await response.json();
                                    if (result.success) {
                                        alert('Postingan berhasil dihapus!');
                                        fetchAndDisplayPosts();
                                    } else {
                                        alert('Gagal menghapus postingan: ' + result.message);
                                    }
                                }
                            });
                        });

                    } else {
                        loadingMessage.style.display = 'none';
                        noPostsMessage.style.display = 'block';
                    }
                } catch (error) {
                    console.error('Error fetching posts (network or unexpected error):', error);
                    loadingMessage.textContent = 'Gagal memuat postingan: Terjadi kesalahan jaringan atau tidak terduga.';
                    loadingMessage.classList.add('error');
                }
            }

            createPostBtn.addEventListener('click', () => {
                window.location.href = '/blog/thoughts/ink/';
            });

            fetchAndDisplayPosts();
        });
    </script>
</body>
</html>