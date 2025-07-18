<?php
session_start(); // Start PHP session

// Check if user is logged in AND if they have post writing permission
if (!isset($_SESSION['user_id']) || !isset($_SESSION['can_write_post']) || $_SESSION['can_write_post'] !== true) {
    // If not logged in or no permission, redirect to login page
    header('Location: /blog/knock2/');
    exit();
}

// Author data from session (will be used as fallback if post data is incomplete)
$author_name = $_SESSION['display_name'] ?? $_SESSION['username'] ?? 'Unknown Author';
$author_avatar = $_SESSION['profile_picture'] ?? 'https://placehold.co/100x100/A0B9A0/white?text=Author';
?>
<!DOCTYPE html>
<html lang="en"> <!-- Changed language to English -->
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Posts Dashboard - Tian Blog</title> <!-- Translated title -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <div class="container">
        <header class="dashboard-header">
            <!-- Back button on the left side of the header -->
            <!-- Modified back button to use JavaScript for conditional history navigation -->
            <a href="#" id="back-button" class="back-button">
                <i class="fas fa-arrow-left"></i> Back
            </a>
            <!-- User profile on the right side of the header, now clickable -->
            <a href="/blog/user" class="user-profile-link"> <!-- Added anchor tag -->
                <div class="user-profile-header">
                    <span class="user-name-header"><?php echo htmlspecialchars($author_name); ?></span>
                    <img src="<?php echo htmlspecialchars($author_avatar); ?>" alt="User Profile" class="profile-image-header">
                </div>
            </a>
        </header>

        <!-- Dashboard title below the header -->
        <h1 class="dashboard-title">Posts Dashboard</h1> <!-- Translated title -->
        <p class="dashboard-subtitle">What's on your mind: a personal space for opinions and candid expressions.</p> <!-- New descriptive text -->
        
        <!-- Header actions (for desktop) below the dashboard title -->
        <div class="header-actions">
            <button class="create-post-button" id="create-post-btn">Create New Post</button> <!-- Translated button text -->
        </div>

        <!-- Tabbed interface for post list -->
        <div class="tabs-container">
            <div class="tab-header">
                <button class="tab-btn active" data-status="all">All</button>
                <button class="tab-btn" data-status="published">Published</button>
                <button class="tab-btn" data-status="draft">Draft</button>
            </div>
            <div id="posts-list" class="posts-list">
                <p id="loading-message">Loading posts...</p> <!-- Translated text -->
                <p id="no-posts-message" style="display: none;">No posts yet. Let's create the first one!</p> <!-- Translated text -->
            </div>
        </div>

    </div>

    <!-- Floating button for mobile with new class -->
    <button class="floating-create-button" id="floating-create-post-btn">
        <i class="fas fa-plus"></i> Create Post <!-- Translated button text -->
    </button>

    <script>
        document.addEventListener('DOMContentLoaded', async () => {
            const postsList = document.getElementById('posts-list');
            const loadingMessage = document.getElementById('loading-message');
            const noPostsMessage = document.getElementById('no-posts-message');
            const createPostBtn = document.getElementById('create-post-btn');
            const floatingCreatePostBtn = document.getElementById('floating-create-post-btn');
            const tabButtons = document.querySelectorAll('.tab-btn');
            const backButton = document.getElementById('back-button'); // Get the back button element

            // Function to fetch and display posts
            async function fetchAndDisplayPosts(statusFilter = 'all') {
                loadingMessage.style.display = 'block';
                noPostsMessage.style.display = 'none';
                postsList.innerHTML = ''; // Clear existing list

                try {
                    const response = await fetch('api.php', {
                        method: 'POST', // Using POST method
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'get_posts', status: statusFilter }) // Send action and status filter
                    });
                    
                    const rawResponseText = await response.text();
                    console.log('Raw API response:', rawResponseText);

                    let result;
                    try {
                        result = JSON.parse(rawResponseText); // Try to parse manually
                    } catch (e) {
                        console.error('Error parsing JSON from API response:', e);
                        loadingMessage.textContent = 'Failed to load posts: Invalid API response.'; // Translated error message
                        loadingMessage.classList.add('error');
                        return;
                    }
                    
                    console.log('Parsed API result:', result);

                    if (result.success && Array.isArray(result.posts) && result.posts.length > 0) {
                        loadingMessage.style.display = 'none';
                        result.posts.forEach(post => {
                            const postElement = document.createElement('div');
                            postElement.classList.add('post-item');
                            
                            const statusText = post.status === 'published' ? 'Published' : 'Draft'; // Translated status text
                            const statusClass = post.status === 'published' ? 'status-published' : 'status-draft';

                            const publishDate = post.published_at ? new Date(post.published_at).toLocaleString() : 'Not yet published'; // Translated text
                            
                            const authorName = post.author_display_name || post.author_username || "<?php echo $author_name; ?>";
                            const authorAvatar = post.author_profile_picture || "<?php echo $author_avatar; ?>";


                            postElement.innerHTML = `
                                <div class="post-content">
                                    <div class="post-header">
                                        <span class="post-status ${statusClass}">${statusText}</span>
                                        <h3 class="post-title">${post.title || 'Untitled'}</h3> <!-- Translated text -->
                                        <p class="post-synopsis">${post.synopsis || 'No synopsis.'}</p> <!-- Translated text -->
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
                                    <button class="btn btn-delete" data-id="${post.id}">Delete</button> <!-- Translated text -->
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
                                if (confirm('Are you sure you want to delete this post?')) { // Translated confirmation
                                    const response = await fetch('api.php', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({ action: 'delete_post', id: postId })
                                    });
                                    const result = await response.json();
                                    if (result.success) {
                                        alert('Post deleted successfully!'); // Translated alert
                                        fetchAndDisplayPosts(document.querySelector('.tab-btn.active').dataset.status); // Refresh with active tab
                                    } else {
                                        alert('Failed to delete post: ' + result.message); // Translated alert
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
                    loadingMessage.textContent = 'Failed to load posts: Network or unexpected error occurred.'; // Translated error message
                    loadingMessage.classList.add('error');
                }
            }

            // Event listener for "Create New Post" button (desktop)
            createPostBtn.addEventListener('click', () => {
                window.location.href = '/blog/thoughts/ink/';
            });

            // Event listener for "Create New Post" button (floating mobile)
            floatingCreatePostBtn.addEventListener('click', () => {
                window.location.href = '/blog/thoughts/ink/';
            });

            // Event listeners for tabs
            tabButtons.forEach(button => {
                button.addEventListener('click', (e) => {
                    // Remove 'active' class from all tab buttons
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    // Add 'active' class to the clicked button
                    e.target.classList.add('active');
                    // Get status from data-status attribute and load posts
                    const status = e.target.dataset.status;
                    fetchAndDisplayPosts(status);
                });
            });

            // Handle back button click to skip 'ink' page if it's the immediate referrer
            backButton.addEventListener('click', (e) => {
                e.preventDefault(); // Prevent default link behavior

                if (window.history.length > 1) {
                    let prevUrl = document.referrer; // Get the referrer URL
                    let prevPath = '';

                    try {
                        if (prevUrl) {
                            const url = new URL(prevUrl);
                            prevPath = url.pathname;
                        }
                    } catch (error) {
                        console.warn('Could not parse referrer URL:', prevUrl, error);
                    }

                    const inkPath = '/blog/thoughts/ink/';

                    // If the immediate previous page was exactly 'ink', go back two steps.
                    // This skips 'ink' and the current 'thoughts' page, taking the user to the page before 'thoughts'.
                    if (prevPath === inkPath) {
                        history.go(-2); 
                    } else {
                        // Otherwise, go back one step as usual.
                        history.back();
                    }
                } else {
                    // If no history, or history length is 1 (current page is the only one),
                    // redirect to a default safe page, e.g., the blog's root.
                    window.location.href = '/blog/'; // Adjust this to your desired default page
                }
            });

            // Load initial posts (all) when page loads
            fetchAndDisplayPosts('all');
        });
    </script>
</body>
</html>
