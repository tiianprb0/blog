<?php
session_start(); // Start PHP session

// Check if user is logged in AND if they have post writing permission
if (!isset($_SESSION['user_id']) || !isset($_SESSION['can_write_post']) || $_SESSION['can_write_post'] !== true) {
    // If not logged in or no permission, redirect to login page
    header('Location: /blog/knock2/');
    exit();
}

// Get post ID from URL if available (for edit mode)
$post_id = isset($_GET['id']) ? (int)$_GET['id'] : null;

// Placeholder for post data to be loaded (if in edit mode)
$post_data = [
    'id' => $post_id,
    'title' => '',
    'synopsis' => '',
    'thumbnail_url' => '',
    'thumbnail_caption' => '',
    'category' => 'Uncategorized', // Default category
    'content_blocks' => [], // Array to store content structure
    'status' => 'draft', // Default status
    'published_at' => null,
    'edited_at' => null
];

// Author data from session (will be used as fallback if post data is incomplete)
$author_name = $_SESSION['display_name'] ?? $_SESSION['username'] ?? 'Unknown Author';
$author_avatar = $_SESSION['profile_picture'] ?? 'https://placehold.co/100x100/A0B9A0/white?text=Author';

// Pass slugified username to JavaScript for URL generation
function slugify_php($text) {
    if (empty($text)) {
        return 'guest'; // Return 'guest' if username is empty for the slug
    }
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    $text = preg_replace('~[^-\w]+~', '', $text);
    $text = trim($text, '-');
    $text = preg_replace('~-+~', '-', $text);
    return strtolower($text);
}
$username_slug_for_js = slugify_php($_SESSION['username'] ?? ''); // Pass empty string if not set, let slugify_php handle 'guest'
?>
<!DOCTYPE html>
<html lang="en"> <!-- Changed language to English -->
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Post Editor - Tian Blog</title> <!-- Translated title -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/styles/base16/solarized-light.min.css">
</head>
<body>
    <div class="container">
        <header class="dashboard-header"> <!-- Using the same class as thoughts/index.php -->
            <!-- Back button on the left side of the header -->
            <a href="#" id="back-to-dashboard-btn" class="back-button">
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
        <h1 class="dashboard-title">Post Editor</h1> <!-- Translated title -->
        <p class="dashboard-subtitle">Your personal space for ideas and candid expressions.</p> <!-- Translated subtitle -->
        
        <div class="header-actions-bottom">
            <button class="btn btn-primary" id="save-draft-btn">Save Draft</button> <!-- Translated button -->
            <button class="btn btn-primary" id="publish-post-btn">Publish</button> <!-- Translated button -->
        </div>

        <div id="editor-mode"> <!-- Container for cards -->
            <!-- Card 1: Post Information -->
            <div id="card-1" class="editor-card">
                <div class="editor-section metadata-section">
                    <h2 class="section-title">Post Information</h2> <!-- Translated title -->
                    <div class="form-group">
                        <label for="post-title">Post Title:</label> <!-- Translated label -->
                        <input type="text" id="post-title" placeholder="Enter your post title"> <!-- Translated placeholder -->
                    </div>
                    <div class="form-group">
                        <label for="post-synopsis">Post Synopsis:</label> <!-- Translated label -->
                        <textarea id="post-synopsis" rows="3" placeholder="A brief summary of the post"></textarea> <!-- Translated placeholder -->
                    </div>
                    <div class="form-group">
                        <label for="thumbnail-url">Thumbnail URL:</label> <!-- Translated label -->
                        <input type="url" id="thumbnail-url" placeholder="https://example.com/thumbnail.jpg">
                    </div>
                    <div class="form-group">
                        <label for="thumbnail-caption">Thumbnail Caption:</label> <!-- Translated label -->
                        <input type="text" id="thumbnail-caption" placeholder="Caption for the thumbnail image"> <!-- Translated placeholder -->
                    </div>
                    <div class="form-group">
                        <label for="post-category">Category:</label> <!-- Translated label -->
                        <input type="text" id="post-category" list="category-suggestions" placeholder="Select or type a category"> <!-- Translated placeholder -->
                        <datalist id="category-suggestions">
                            </datalist>
                    </div>
                </div>
                <div class="card-navigation">
                    <button class="btn btn-primary" id="next-card-btn">Next to Post Content</button> <!-- Translated and detailed button -->
                </div>
            </div>

            <!-- Card 2: Post Content -->
            <div id="card-2" class="editor-card" style="display: none;">
                <div class="editor-section content-editor-section">
                    <h2 class="section-title">Post Content</h2> <!-- Translated title -->
                    <div class="content-blocks-container" id="content-blocks-container">
                        </div>

                    <div class="add-block-controls">
                        <select id="block-type-select">
                            <option value="">Select Block Type</option> <!-- Translated option -->
                            <option value="paragraph">Paragraph</option>
                            <option value="heading2">Heading H2</option>
                            <option value="heading3">Heading H3</option>
                            <option value="heading4">Heading H4</option>
                            <option value="image">Image (Default/Figure)</option>
                            <option value="carousel">Image (Carousel)</option>
                            <option value="swipe-gallery">Image (Swipe Gallery)</option>
                            <option value="grid-gallery">Image (Grid Gallery)</option>
                            <option value="code">Code</option>
                            <option value="blockquote">Blockquote</option>
                            <option value="note">Note Box</option>
                            <option value="youtube">YouTube Video</option>
                            <option value="table">Table</option>
                            <option value="ordered-list">Ordered List</option>
                            <option value="unordered-list">Unordered List</option>
                            <option value="tabs">Tabs</option>
                            <option value="accordion">Accordion</option>
                            <option value="spoiler">Spoiler</option>
                        </select>
                        <button class="btn btn-primary" id="add-block-btn">Add Block</button> <!-- Translated button -->
                    </div>
                    <div id="editor-message" class="message"></div>
                </div>
                <div class="card-navigation">
                    <button class="btn btn-secondary" id="back-card-btn">Back to Post Information</button> <!-- Translated and detailed button -->
                </div>
            </div>
        </div>

        <div id="preview-mode" style="display: none;">
            <div class="preview-content" id="preview-content">
                </div>
            <button class="btn btn-secondary" id="exit-preview-btn">Exit Preview</button> <!-- Translated button -->
        </div>
    </div>

    <div class="loading-overlay" id="loading-overlay" style="display: none;">
        <div class="loading-spinner"></div>
        <p>Saving...</p> <!-- Translated text -->
    </div>

    <!-- Floating button for mobile with new class (also acts as the single preview button) -->
    <button class="floating-preview-button" id="floating-preview-btn">
        <i class="fas fa-eye"></i> Preview
    </button>

    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.7.0/highlight.min.js"></script>
    <script>
        // Pass slugified username to JavaScript
        const CURRENT_USERNAME_SLUG = "<?php echo htmlspecialchars($username_slug_for_js); ?>";
    </script>
    <script src="script.js" defer></script>
</body>
</html>
