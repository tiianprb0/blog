document.addEventListener('DOMContentLoaded', () => {
    // Main elements
    const card1 = document.getElementById('card-1');
    const card2 = document.getElementById('card-2');
    const editorMode = document.getElementById('editor-mode');
    const previewMode = document.getElementById('preview-mode');
    const previewContent = document.getElementById('preview-content');
    const editorMessage = document.getElementById('editor-message');
    const loadingOverlay = document.getElementById('loading-overlay');

    // Post metadata inputs
    const postTitleInput = document.getElementById('post-title');
    const postSynopsisTextarea = document.getElementById('post-synopsis');
    const thumbnailUrlInput = document.getElementById('thumbnail-url');
    const thumbnailCaptionInput = document.getElementById('thumbnail-caption');
    const postCategoryInput = document.getElementById('post-category');
    const categorySuggestionsDatalist = document.getElementById('category-suggestions');

    // Content block controls
    const contentBlocksContainer = document.getElementById('content-blocks-container');
    const blockTypeSelect = document.getElementById('block-type-select');
    const addBlockBtn = document.getElementById('add-block-btn');

    // Action buttons
    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const publishPostBtn = document.getElementById('publish-post-btn');
    const nextCardBtn = document.getElementById('next-card-btn');
    const backCardBtn = document.getElementById('back-card-btn');
    const floatingPreviewBtn = document.getElementById('floating-preview-btn'); // Corrected ID
    const exitPreviewBtn = document.getElementById('exit-preview-btn');


    // Variable to store post structure
    let currentPost = {
        id: null,
        title: '',
        synopsis: '',
        thumbnail_url: '',
        thumbnail_caption: '',
        category: 'Uncategorized',
        content_blocks: [], // Array of { type: 'paragraph', content: '...' }
        status: 'draft',
        published_at: null,
        edited_at: null,
        editor_url_path: null // Store the custom editor URL path
    };

    let isAutoSaving = false;
    let currentCard = 1; // State to track the active card

    // --- Utility Functions ---

    // Function to display messages
    function displayMessage(element, message, type) {
        element.textContent = message;
        element.className = `message ${type}`;
        element.style.display = 'block';
        if (!isAutoSaving) {
            setTimeout(() => {
                element.style.display = 'none';
                element.textContent = '';
            }, 5000);
        }
    }

    // Function to show/hide loading overlay
    function showLoadingOverlay(message = 'Saving...') {
        if (loadingOverlay) {
            loadingOverlay.querySelector('p').textContent = message;
            loadingOverlay.style.display = 'flex';
        }
    }

    function hideLoadingOverlay() {
        if (loadingOverlay) {
            loadingOverlay.style.display = 'none';
        }
    }

    // Function to generate a simple unique ID
    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // Function to escape HTML for display in text inputs (not for rich text content)
    function escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const map = {
            '&': '&amp;', // Use &amp; for HTML entities
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // --- Category Management ---
    async function fetchCategories() {
        try {
            const response = await fetch('../api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_posts' })
            });
            const result = await response.json();
            if (result.success && Array.isArray(result.posts)) {
                const categories = new Set();
                result.posts.forEach(post => {
                    if (post.category) {
                        categories.add(post.category);
                    }
                });
                updateCategorySuggestions(Array.from(categories));
            }
        } catch (error) {
            console.error('Error fetching categories:', error);
        }
    }

    function updateCategorySuggestions(categories) {
        categorySuggestionsDatalist.innerHTML = '';
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            categorySuggestionsDatalist.appendChild(option);
        });
    }

    // --- Rich Text Editor Functions ---
    // Function to apply text formatting commands
    function formatText(command, value = null) {
        document.execCommand(command, false, value);
        // Ensure focus remains on the editor after formatting
        const activeEditor = document.activeElement;
        if (activeEditor && activeEditor.classList.contains('rich-text-editor')) {
            activeEditor.focus();
        }
    }

    // Function to add a link
    function addLink(editorElement) {
        const url = prompt("Enter URL:");
        if (url) {
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                if (!range.collapsed) {
                    formatText('createLink', url);
                } else {
                    const linkText = prompt("Enter text for the link:", "Link");
                    if (linkText) {
                        const linkNode = document.createElement('a');
                        linkNode.href = url;
                        linkNode.textContent = linkText;
                        range.insertNode(linkNode);
                        range.setStartAfter(linkNode);
                        range.collapse(true);
                        selection.removeAllRanges();
                        selection.addRange(range);
                    }
                }
            } else {
                const linkText = prompt("Enter text for the link:", "Link");
                if (linkText) {
                    formatText('insertHTML', `<a href="${url}">${escapeHtml(linkText)}</a>`);
                }
            }
        }
    }


    // --- Content Block Management ---

    // Function to create input elements for image items (for galleries)
    function createImageItemElement(blockId, imageItem) {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('image-item-input');
        itemDiv.dataset.itemId = imageItem.id; // Unique ID for each image item

        itemDiv.innerHTML = `
            <input type="url" class="block-input image-url-input" placeholder="Image URL" value="${escapeHtml(imageItem.url || '')}">
            <input type="text" class="block-input image-caption-input" placeholder="Image Caption (optional)" value="${escapeHtml(imageItem.caption || '')}">
            <button class="remove-image-item-btn btn-danger btn-small" title="Remove Image"><i class="fas fa-trash"></i></button>
        `;

        itemDiv.querySelector('.image-url-input').addEventListener('input', (e) => {
            const block = currentPost.content_blocks.find(b => b.id === blockId);
            if (block && block.images) {
                const item = block.images.find(img => img.id === imageItem.id);
                if (item) item.url = e.target.value;
            }
        });
        itemDiv.querySelector('.image-caption-input').addEventListener('input', (e) => {
            const block = currentPost.content_blocks.find(b => b.id === blockId);
            if (block && block.images) {
                const item = block.images.find(img => img.id === imageItem.id);
                if (item) item.caption = e.target.value;
            }
        });
        itemDiv.querySelector('.remove-image-item-btn').addEventListener('click', () => removeImageItem(blockId, imageItem.id));
        return itemDiv;
    }

    // Function to render image item inputs within a gallery block
    function renderImageItems(blockId) {
        const block = currentPost.content_blocks.find(b => b.id === blockId);
        if (!block) return;

        const container = document.querySelector(`.content-block[data-id="${blockId}"] .image-items-container`);
        if (!container) return; // Ensure container exists

        container.innerHTML = ''; // Clear existing items
        (block.images || []).forEach(imageItem => {
            container.appendChild(createImageItemElement(blockId, imageItem));
        });
    }

    // Function to add a new image item to a gallery block
    function addImageItem(blockId, url = '', caption = '') {
        const block = currentPost.content_blocks.find(b => b.id === blockId);
        if (!block) return;

        if (!block.images) block.images = [];
        const newItem = { id: generateUniqueId(), url, caption };
        block.images.push(newItem);
        renderImageItems(blockId); // Re-render all items
    }

    // Function to remove an image item from a gallery block
    function removeImageItem(blockId, itemId) {
        const block = currentPost.content_blocks.find(b => b.id === blockId);
        if (!block || !block.images) return;

        block.images = block.images.filter(item => item.id !== itemId);
        renderImageItems(blockId); // Re-render all items
    }

    // Function to create input elements for tab/accordion items
    function createInteractiveItemElement(blockId, item, type) {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add(`${type}-item-input`);
        itemDiv.dataset.itemId = item.id; // Unique ID for each item

        itemDiv.innerHTML = `
            <input type="text" class="block-input ${type}-title-input" placeholder="${type} Title" value="${escapeHtml(item.title || '')}">
            <textarea class="block-input ${type}-content-input" placeholder="${type} Content" rows="3">${escapeHtml(item.content || '')}</textarea>
            <button class="remove-${type}-item-btn btn-danger btn-small" title="Remove Item"><i class="fas fa-trash"></i></button>
        `;

        itemDiv.querySelector(`.${type}-title-input`).addEventListener('input', (e) => {
            const block = currentPost.content_blocks.find(b => b.id === blockId);
            if (block && block.content) {
                const foundItem = block.content.find(i => i.id === item.id);
                if (foundItem) foundItem.title = e.target.value;
            }
        });
        itemDiv.querySelector(`.${type}-content-input`).addEventListener('input', (e) => {
            const block = currentPost.content_blocks.find(b => b.id === blockId);
            if (block && block.content) {
                const foundItem = block.content.find(i => i.id === item.id);
                if (foundItem) foundItem.content = e.target.value;
            }
        });
        itemDiv.querySelector(`.remove-${type}-item-btn`).addEventListener('click', () => removeInteractiveItem(blockId, item.id, type));
        return itemDiv;
    }

    // Function to render tab/accordion item inputs within a block
    function renderInteractiveItems(blockId, type) {
        const block = currentPost.content_blocks.find(b => b.id === blockId);
        if (!block) return;

        const container = document.querySelector(`.content-block[data-id="${blockId}"] .${type}-items-container`);
        if (!container) return;

        container.innerHTML = ''; // Clear existing items
        (block.content || []).forEach(item => {
            container.appendChild(createInteractiveItemElement(blockId, item, type));
        });
    }

    // Function to add a new item to a tab/accordion block
    function addInteractiveItem(blockId, type, title = '', content = '') {
        const block = currentPost.content_blocks.find(b => b.id === blockId);
        if (!block) return;

        if (!block.content) block.content = [];
        const newItem = { id: generateUniqueId(), title, content };
        block.content.push(newItem);
        renderInteractiveItems(blockId, type); // Re-render all items
    }

    // Function to remove an item from a tab/accordion block
    function removeInteractiveItem(blockId, itemId, type) {
        const block = currentPost.content_blocks.find(b => b.id === blockId);
        if (!block || !block.content) return;

        block.content = block.content.filter(item => item.id !== itemId);
        renderInteractiveItems(blockId, type); // Re-render all items
    }


    // Function to create a new content block element
    function createBlockElement(block) {
        const blockDiv = document.createElement('div');
        blockDiv.classList.add('content-block');
        blockDiv.dataset.id = block.id; // Store block ID in dataset

        let inputHtml = '';
        let labelText = '';
        let placeholderText = '';

        switch (block.type) {
            case 'paragraph':
                labelText = 'Paragraph:';
                placeholderText = 'Enter paragraph text...';
                // Rich text editor toolbar - ALL FEATURES RE-ENABLED
                inputHtml = `
                    <div class="rich-text-toolbar">
                        <button type="button" class="format-btn" data-command="bold" title="Bold"><i class="fas fa-bold"></i></button>
                        <button type="button" class="format-btn" data-command="italic" title="Italic"><i class="fas fa-italic"></i></button>
                        <button type="button" class="format-btn" data-command="underline" title="Underline"><i class="fas fa-underline"></i></button>
                        <button type="button" class="format-btn" data-command="createLink" title="Link"><i class="fas fa-link"></i></button>
                        <button type="button" class="format-btn" data-command="unlink" title="Unlink"><i class="fas fa-unlink"></i></button>
                        <button type="button" class="fullscreen-btn" title="Fullscreen"><i class="fas fa-expand"></i></button>
                    </div>
                    <div contenteditable="true" class="block-input rich-text-editor" placeholder="${placeholderText}">${block.content || ''}</div>
                `;
                break;
            case 'heading2':
            case 'heading3':
            case 'heading4':
                labelText = `Heading ${block.type.replace('heading', 'H')}:`;
                placeholderText = `Enter H${block.type.replace('heading', '')} text...`;
                inputHtml = `<input type="text" class="block-input" placeholder="${placeholderText}" value="${escapeHtml(block.content || '')}">`;
                break;
            case 'image': // Default/Figure Image
                labelText = 'Image (URL & Caption):';
                placeholderText = 'Image URL';
                inputHtml = `
                    <input type="url" class="block-input" data-field="url" placeholder="${placeholderText}" value="${escapeHtml(block.url || '')}">
                    <input type="text" class="block-input" data-field="caption" placeholder="Image Caption (optional)" value="${escapeHtml(block.caption || '')}">
                `;
                break;
            case 'carousel':
            case 'swipe-gallery':
            case 'grid-gallery':
                labelText = `${block.type.replace('-', ' ').toUpperCase()}:`;
                inputHtml = `
                    <div class="image-items-container"></div>
                    <button class="add-image-btn btn-secondary btn-small" data-block-id="${block.id}">Add Image</button>
                `;
                break;
            case 'code':
                labelText = 'Code:';
                placeholderText = 'Enter code here...';
                inputHtml = `
                    <input type="text" class="block-input" data-field="language" placeholder="Language (e.g., javascript, python, html)" value="${escapeHtml(block.language || '')}">
                    <textarea class="block-input" data-field="content" placeholder="${placeholderText}" rows="8">${escapeHtml(block.content || '')}></textarea>
                `;
                break;
            case 'blockquote':
                labelText = 'Blockquote:';
                placeholderText = 'Enter quote...';
                inputHtml = `
                    <textarea class="block-input" data-field="quote" placeholder="${placeholderText}">${block.quote || ''}</textarea>
                    <input type="text" class="block-input" data-field="author" placeholder="Author (optional)" value="${escapeHtml(block.author || '')}">
                `;
                break;
            case 'note':
                labelText = 'Note Box:';
                placeholderText = 'Note content...';
                inputHtml = `
                    <input type="text" class="block-input" data-field="title" placeholder="Note Title (optional)" value="${escapeHtml(block.title || '')}">
                    <textarea class="block-input" data-field="content" placeholder="${placeholderText}">${block.content || ''}</textarea>
                `;
                break;
            case 'youtube':
                labelText = 'YouTube Video:';
                placeholderText = 'YouTube Video ID (e.g., dQw4w9WgXcQ)';
                inputHtml = `<input type="text" class="block-input" placeholder="${placeholderText}" value="${escapeHtml(block.id || '')}">`;
                break;
            case 'table':
                labelText = 'Table (JSON Array of Arrays):';
                placeholderText = 'Example: [["Header 1", "Header 2"], ["Data 1", "Data 2"]]';
                inputHtml = `<textarea class="block-input" data-field="content" placeholder="${placeholderText}" rows="6">${block.content ? JSON.stringify(block.content, null, 2) : ''}</textarea>`;
                break;
            case 'ordered-list':
            case 'unordered-list':
                labelText = block.type === 'ordered-list' ? 'Ordered List (per line):' : 'Unordered List (per line):';
                placeholderText = 'Enter list items, one per line...';
                inputHtml = `<textarea class="block-input" data-field="items" placeholder="${placeholderText}">${Array.isArray(block.items) ? escapeHtml(block.items.join('\n')) : ''}</textarea>`;
                break;
            case 'tabs':
                labelText = 'Tabs:';
                inputHtml = `
                    <div class="tabs-items-container"></div>
                    <button class="add-tabs-item-btn btn-secondary btn-small" data-block-id="${block.id}">Add Tab</button>
                `;
                break;
            case 'accordion':
                labelText = 'Accordion:';
                inputHtml = `
                    <div class="accordion-items-container"></div>
                    <button class="add-accordion-item-btn btn-secondary btn-small" data-block-id="${block.id}">Add Accordion Item</button>
                `;
                break;
            case 'spoiler':
                labelText = 'Spoiler:';
                placeholderText = 'Spoiler content...';
                inputHtml = `
                    <input type="text" class="block-input" data-field="summary" placeholder="Spoiler Summary (optional)" value="${escapeHtml(block.summary || '')}">
                    <textarea class="block-input" data-field="content" placeholder="${placeholderText}">${block.content || ''}</textarea>
                `;
                break;
            default:
                inputHtml = `<p>Unknown block type: ${escapeHtml(block.type)}</p>`;
                break;
        }

        blockDiv.innerHTML = `
            <div class="block-controls">
                <button class="move-up-btn" title="Move Up"><i class="fas fa-arrow-up"></i></button>
                <button class="move-down-btn" title="Move Down"><i class="fas fa-arrow-down"></i></button>
                <button class="delete-block-btn" title="Delete Block"><i class="fas fa-times"></i></button>
            </div>
            <span class="block-type-label">${block.type.replace('-', ' ').toUpperCase()}</span>
            <label>${labelText}</label>
            ${inputHtml}
        `;

        // Add event listeners for main block inputs (if any)
        const mainInputs = blockDiv.querySelectorAll('.block-input:not([data-field])');
        mainInputs.forEach(input => {
            if (input.classList.contains('rich-text-editor')) {
                input.addEventListener('input', () => {
                    updateBlockContent(block.id, block.type, input);
                });
                // Add event listener for format text buttons
                const toolbar = blockDiv.querySelector('.rich-text-toolbar');
                if (toolbar) {
                    toolbar.querySelectorAll('.format-btn').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.preventDefault(); // Prevent losing focus
                            const command = btn.dataset.command;
                            if (command === 'createLink') {
                                addLink(input); // Call addLink function
                            } else {
                                formatText(command);
                            }
                        });
                    });
                    // Add event listener for fullscreen button
                    const fullscreenBtn = toolbar.querySelector('.fullscreen-btn');
                    if (fullscreenBtn) {
                        fullscreenBtn.addEventListener('click', (e) => {
                            e.preventDefault();
                            toggleFullscreen(input);
                        });
                    }
                }
            } else {
                input.addEventListener('input', () => {
                    updateBlockContent(block.id, block.type, input);
                });
            }
        });

        // Add event listeners for inputs with data-field
        const dataFieldInputs = blockDiv.querySelectorAll('.block-input[data-field]');
        dataFieldInputs.forEach(input => {
            input.addEventListener('input', () => {
                updateBlockContent(block.id, block.type, input);
            });
        });

        // Add event listeners for control buttons
        blockDiv.querySelector('.delete-block-btn').addEventListener('click', () => deleteBlock(block.id));
        blockDiv.querySelector('.move-up-btn').addEventListener('click', () => moveBlock(block.id, -1));
        blockDiv.querySelector('.move-down-btn').addEventListener('click', () => moveBlock(block.id, 1));

        // Add event listeners for "Add Image/Tab/Accordion" buttons
        if (block.type === 'carousel' || block.type === 'swipe-gallery' || block.type === 'grid-gallery') {
            blockDiv.querySelector('.add-image-btn').addEventListener('click', () => addImageItem(block.id));
            renderImageItems(block.id); // Render existing items when block is created
        } else if (block.type === 'tabs') {
            blockDiv.querySelector('.add-tabs-item-btn').addEventListener('click', () => addInteractiveItem(block.id, 'tabs'));
            renderInteractiveItems(block.id, 'tabs');
        } else if (block.type === 'accordion') {
            blockDiv.querySelector('.add-accordion-item-btn').addEventListener('click', () => addInteractiveItem(block.id, 'accordion'));
            renderInteractiveItems(block.id, 'accordion');
        }

        return blockDiv;
    }

    // Function to add a new block
    function addBlock(type, initialData = {}) {
        const newBlock = {
            id: generateUniqueId(),
            type: type,
        };

        // Initialize content based on type
        switch (type) {
            case 'paragraph':
                newBlock.content = initialData.content || ''; // Content can be HTML
                break;
            case 'heading2':
            case 'heading3':
            case 'heading4':
                newBlock.content = initialData.content || '';
                break;
            case 'image':
                newBlock.url = initialData.url || '';
                newBlock.caption = initialData.caption || '';
                break;
            case 'carousel':
            case 'swipe-gallery':
            case 'grid-gallery':
                newBlock.images = initialData.images || []; // Array of {id, url, caption}
                break;
            case 'code':
                newBlock.language = initialData.language || '';
                newBlock.content = initialData.content || '';
                break;
            case 'blockquote':
                newBlock.quote = initialData.quote || '';
                newBlock.author = initialData.author || '';
                break;
            case 'note':
                newBlock.title = initialData.title || '';
                newBlock.content = initialData.content || '';
                break;
            case 'youtube':
                newBlock.id = initialData.id || ''; // YouTube video ID
                break;
            case 'table':
                newBlock.content = initialData.content || []; // JSON array of arrays
                break;
            case 'ordered-list':
            case 'unordered-list':
                newBlock.items = initialData.items || []; // Array of strings
                break;
            case 'tabs':
            case 'accordion':
                newBlock.content = initialData.content || []; // Array of {id, title, content}
                break;
            case 'spoiler':
                newBlock.summary = initialData.summary || '';
                newBlock.content = initialData.content || '';
                break;
        }
        
        currentPost.content_blocks.push(newBlock);
        const blockElement = createBlockElement(newBlock);
        contentBlocksContainer.appendChild(blockElement);
    }

    // Function to update block content in the currentPost array
    function updateBlockContent(blockId, blockType, inputElement) {
        const blockIndex = currentPost.content_blocks.findIndex(b => b.id === blockId);
        if (blockIndex === -1) return;

        const block = currentPost.content_blocks[blockIndex];

        // Handle generic inputs (heading, youtube)
        if (['heading2', 'heading3', 'heading4', 'youtube'].includes(blockType)) {
            block.content = inputElement.value;
        }
        // Handle rich text editor for paragraph
        else if (blockType === 'paragraph') {
            block.content = inputElement.innerHTML; // Get innerHTML for rich text
        }
        // Handle inputs with data-field attribute
        else if (inputElement.dataset.field) {
            const field = inputElement.dataset.field;
            if (['code', 'blockquote', 'note', 'spoiler'].includes(blockType)) {
                block[field] = inputElement.value;
            } else if (blockType === 'image') {
                block[field] = inputElement.value;
            } else if (blockType === 'table') {
                try {
                    block.content = inputElement.value.trim() === '' ? [] : JSON.parse(inputElement.value);
                } catch (e) {
                    console.error("Invalid JSON for block type " + blockType, e);
                    displayMessage(editorMessage, 'Invalid table JSON format. Check console for details.', 'error');
                    block.content = [];
                }
            } else if (['ordered-list', 'unordered-list'].includes(blockType)) {
                block.items = inputElement.value.split('\n').map(item => item.trim()).filter(item => item !== '');
            }
        }
        // For gallery types (carousel, swipe-gallery, grid-gallery), tabs, accordion:
        // Their content is updated via specific `addImageItem`, `addInteractiveItem`, etc. functions
        // and their respective input event listeners, not through this general function.
    }

    // Function to delete a block
    function deleteBlock(blockId) {
        currentPost.content_blocks = currentPost.content_blocks.filter(b => b.id !== blockId);
        document.querySelector(`.content-block[data-id="${blockId}"]`).remove();
    }

    // Function to move a block (up/down)
    function moveBlock(blockId, direction) {
        const index = currentPost.content_blocks.findIndex(b => b.id === blockId);
        if (index === -1) return;

        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < currentPost.content_blocks.length) {
            const [movedBlock] = currentPost.content_blocks.splice(index, 1);
            currentPost.content_blocks.splice(newIndex, 0, movedBlock);
            renderContentBlocks(); // Re-render all blocks
        }
    }

    // Function to re-render all content blocks from currentPost.content_blocks
    function renderContentBlocks() {
        contentBlocksContainer.innerHTML = ''; // Clear container
        currentPost.content_blocks.forEach(block => {
            const blockElement = createBlockElement(block);
            contentBlocksContainer.appendChild(blockElement);
        });
    }

    // --- Fullscreen Functionality for Rich Text Editor ---
    let activeFullscreenEditor = null; // To keep track of the editor in fullscreen

    function toggleFullscreen(editorElement) {
        const body = document.body;
        const html = document.documentElement;
        const parentBlock = editorElement.closest('.content-block'); // Get the parent content block
        const fullscreenBtn = parentBlock.querySelector('.fullscreen-btn'); // Get the fullscreen button

        if (editorElement.classList.contains('fullscreen')) {
            // Exit fullscreen
            editorElement.classList.remove('fullscreen');
            if (parentBlock) parentBlock.classList.remove('fullscreen'); // Remove fullscreen class from parent
            body.classList.remove('no-scroll');
            html.classList.remove('no-scroll');
            activeFullscreenEditor = null;
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>'; // Change icon back to expand
                fullscreenBtn.title = 'Fullscreen'; // Change title back
            }
        } else {
            // Enter fullscreen
            if (activeFullscreenEditor) {
                // Exit previous fullscreen editor if any
                activeFullscreenEditor.classList.remove('fullscreen');
                const prevParentBlock = activeFullscreenEditor.closest('.content-block');
                if (prevParentBlock) prevParentBlock.classList.remove('fullscreen');
                const prevFullscreenBtn = prevParentBlock.querySelector('.fullscreen-btn');
                if (prevFullscreenBtn) {
                    prevFullscreenBtn.innerHTML = '<i class="fas fa-expand"></i>';
                    prevFullscreenBtn.title = 'Fullscreen';
                }
            }
            editorElement.classList.add('fullscreen');
            if (parentBlock) parentBlock.classList.add('fullscreen'); // Add fullscreen class to parent
            body.classList.add('no-scroll');
            html.classList.add('no-scroll');
            activeFullscreenEditor = editorElement;
            editorElement.focus(); // Ensure focus is on the fullscreen editor
            if (fullscreenBtn) {
                fullscreenBtn.innerHTML = '<i class="fas fa-compress"></i>'; // Change icon to compress
                fullscreenBtn.title = 'Exit Fullscreen'; // Change title
            }
        }
    }

    // Handle ESC key to exit fullscreen
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && activeFullscreenEditor) {
            toggleFullscreen(activeFullscreenEditor);
        }
    });


    // --- Preview Functionality ---

    function generatePreviewHtml() {
        let html = '';
        let tocHtml = '';
        const headings = []; // To collect headings for TOC

        // Title, synopsis, thumbnail
        if (postTitleInput.value) {
            html += `<h1 class="post-title">${escapeHtml(postTitleInput.value)}</h1>`;
        }
        if (postSynopsisTextarea.value) {
            html += `<p class="post-synopsis">${escapeHtml(postSynopsisTextarea.value)}</p>`;
        }
        if (thumbnailUrlInput.value) {
            html += `
                <div class="thumbnail-container">
                    <img src="${escapeHtml(thumbnailUrlInput.value)}" alt="${escapeHtml(thumbnailCaptionInput.value || 'Thumbnail')}" class="thumbnail">
                    ${thumbnailCaptionInput.value ? `<p class="thumbnail-caption">${escapeHtml(thumbnailCaptionInput.value)}</p>` : ''}
                </div>
            `;
        }

        // Collect headings for TOC
        currentPost.content_blocks.forEach((block) => {
            if (block.type.startsWith('heading') && block.content) {
                headings.push({
                    id: `heading-${block.id}`,
                    text: block.content,
                    level: parseInt(block.type.replace('heading', ''))
                });
            }
        });

        // Generate TOC HTML if headings exist
        if (headings.length > 0) {
            tocHtml += `
                <div class="toc-container">
                    <div class="toc-header">
                        <span>Table of Contents</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="toc-content">
                        <ul class="toc-list">
            `;
            let currentLevel = 2; // TOC starts from H2
            headings.forEach(heading => {
                // Close </li> tag from previous item if level is same or higher
                if (heading.level <= currentLevel && tocHtml !== `
                <div class="toc-container">
                    <div class="toc-header">
                        <span>Table of Contents</span>
                        <i class="fas fa-chevron-down"></i>
                    </div>
                    <div class="toc-content">
                        <ul class="toc-list">
            `) {
                    tocHtml += '</li>';
                }

                // Descend level (open new <ul>)
                while (currentLevel < heading.level) {
                    tocHtml += '<ul>';
                    currentLevel++;
                }
                // Ascend level (close </ul>)
                while (currentLevel > heading.level) {
                    tocHtml += '</ul></li>'; // Close <ul> and </li> from parent
                    currentLevel--;
                }
                
                // Add new <li> with link
                tocHtml += `<li${heading.level > 2 ? ' class="sub-item"' : ''}><a href="#${heading.id}">${escapeHtml(heading.text)}</a>`;
            });
            // Close all unclosed tags at the end
            while (currentLevel > 1) { // Close up to base level (e.g., H2)
                tocHtml += '</li></ul>';
                currentLevel--;
            }
            // Ensure the last </ul> of toc-list is closed if there's an unclosed <li>
            if (tocHtml.endsWith('</li>')) {
                tocHtml = tocHtml.substring(0, tocHtml.length - 5); // Remove unnecessary last </li>
            }
            tocHtml += `
                        </ul>
                    </div>
                </div>
            `;
            html += tocHtml;
        }


        // Content blocks
        currentPost.content_blocks.forEach((block, index) => {
            switch (block.type) {
                case 'paragraph':
                    // Add dropcap to the first paragraph if it exists
                    if (index === 0 && block.content) {
                        html += `<p class="dropcap">${block.content}</p>`; // block.content is already HTML from contenteditable
                    } else if (block.content) {
                        html += `<p>${block.content}</p>`; // block.content is already HTML from contenteditable
                    }
                    break;
                case 'heading2':
                    if (block.content) html += `<h2 id="heading-${block.id}">${escapeHtml(block.content)}</h2>`;
                    break;
                case 'heading3':
                    if (block.content) html += `<h3 id="heading-${block.id}">${escapeHtml(block.content)}</h3>`;
                    break;
                case 'heading4':
                    if (block.content) html += `<h4 id="heading-${block.id}">${escapeHtml(block.content)}</h4>`;
                    break;
                case 'image':
                    if (block.url) {
                        html += `
                            <figure>
                                <img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.caption || 'Image')}" class="post-image">
                                ${block.caption ? `<figcaption>${escapeHtml(block.caption)}</figcaption>` : ''}
                            </figure>
                        `;
                    }
                    break;
                case 'carousel':
                    if (Array.isArray(block.images) && block.images.length > 0) {
                        let carouselInnerHtml = '';
                        let indicatorsHtml = '';
                        block.images.forEach((img, imgIndex) => {
                            const isActive = imgIndex === 0 ? 'active' : '';
                            carouselInnerHtml += `
                                <div class="carousel-item">
                                    <img src="${escapeHtml(img.url || '')}" alt="${escapeHtml(img.caption || 'Carousel Image')}">
                                </div>
                            `;
                            indicatorsHtml += `<div class="carousel-indicator ${isActive}"></div>`;
                        });
                        html += `
                            <div class="carousel">
                                <div class="carousel-inner">${carouselInnerHtml}</div>
                                <div class="carousel-control prev"><i class="fas fa-chevron-left"></i></div>
                                <div class="carousel-control next"><i class="fas fa-chevron-right"></i></div>
                                <div class="carousel-indicators">${indicatorsHtml}</div>
                            </div>
                        `;
                    }
                    break;
                case 'swipe-gallery':
                    if (Array.isArray(block.images) && block.images.length > 0) {
                        let swipeInnerHtml = '';
                        block.images.forEach(img => {
                            swipeInnerHtml += `
                                <div class="swipe-item">
                                    <img src="${escapeHtml(img.url || '')}" alt="${escapeHtml(img.caption || 'Swipe Image')}">
                                </div>
                            `;
                        });
                        html += `
                            <div class="swipe-gallery">
                                <div class="swipe-inner">${swipeInnerHtml}</div>
                            </div>
                        `;
                    }
                    break;
                case 'grid-gallery':
                    if (Array.isArray(block.images) && block.images.length > 0) {
                        let gridInnerHtml = '';
                        block.images.forEach(img => {
                            gridInnerHtml += `
                                <figure>
                                    <img src="${escapeHtml(img.url || '')}" alt="${escapeHtml(img.caption || 'Grid Image')}">
                                    </figure>
                            `;
                        });
                        // Add show-all-btn if more than 4 images
                        const showAllButton = block.images.length > 4 ? `<button class="show-all-btn"><i class="fas fa-plus"></i> Show All</button>` : '';
                        html += `
                            <div class="gallery ${block.images.length > 4 ? 'more' : ''}">
                                <div class="grid-inner">
                                    ${gridInnerHtml}
                                    ${showAllButton}
                                </div>
                            </div>
                        `;
                    }
                    break;
                case 'code':
                    if (block.content) {
                        const languageClass = block.language ? `language-${block.language}` : '';
                        html += `
                            <pre><code class="${languageClass}">
                                <span class="code-header">${escapeHtml(block.language || 'Code')}</span>
                                ${escapeHtml(block.content)}
                            </code></pre>
                        `;
                    }
                    break;
                case 'blockquote':
                    if (block.quote) {
                        html += `
                            <blockquote class="custom-blockquote">
                                <p>${block.quote}</p>
                                ${block.author ? `<span class="quote-author">${escapeHtml(block.author)}</span>` : ''}
                            </blockquote>
                        `;
                    }
                    break;
                case 'note':
                    if (block.content) {
                        html += `
                            <div class="note-box">
                                ${block.title ? `<div class="note-title"><i class="fas fa-lightbulb"></i> ${escapeHtml(block.title)}</div>` : ''}
                                <div class="note-content">
                                    <p>${block.content}</p>
                                </div>
                            </div>
                        `;
                    }
                    break;
                case 'youtube':
                    if (block.id) {
                        html += `
                            <div class="youtube-container">
                                <img src="https://img.youtube.com/vi/${escapeHtml(block.id)}/maxresdefault.jpg" alt="YouTube Video Thumbnail" class="youtube-thumbnail">
                                <div class="youtube-play-button" data-video-id="${escapeHtml(block.id)}">
                                    <i class="fas fa-play"></i>
                                </div>
                            </div>
                        `;
                    }
                    break;
                case 'table':
                    if (Array.isArray(block.content) && block.content.length > 0) {
                        let tableHtml = '<table><thead><tr>';
                        // Header
                        if (block.content[0] && Array.isArray(block.content[0])) {
                            block.content[0].forEach(header => {
                                tableHtml += `<th>${escapeHtml(header)}</th>`;
                            });
                        }
                        tableHtml += '</tr></thead><tbody>';
                        // Rows
                        for (let i = 1; i < block.content.length; i++) {
                            if (Array.isArray(block.content[i])) {
                                tableHtml += '<tr>';
                                block.content[i].forEach(cell => {
                                    tableHtml += `<td>${escapeHtml(cell)}</td>`;
                                });
                                tableHtml += '</tr>';
                            }
                        }
                        tableHtml += '</tbody></table>';
                        html += tableHtml;
                    }
                    break;
                case 'ordered-list':
                case 'unordered-list':
                    if (Array.isArray(block.items) && block.items.length > 0) {
                        const listTag = block.type === 'ordered-list' ? 'ol' : 'ul';
                        let listHtml = `<${listTag}>`;
                        block.items.forEach(item => {
                            listHtml += `<li>${escapeHtml(item)}</li>`;
                        });
                        listHtml += `</${listTag}>`;
                        html += listHtml;
                    }
                    break;
                case 'tabs':
                    if (Array.isArray(block.content) && block.content.length > 0) {
                        let tabHeaderHtml = '<div class="tab-header">';
                        let tabContentHtml = '';
                        block.content.forEach((tab, tabIndex) => {
                            const isActive = tabIndex === 0 ? 'active' : '';
                            const tabId = `tab-${block.id}-${tabIndex}`; // Unique ID for each tab
                            tabHeaderHtml += `<button class="tab-btn ${isActive}" data-tab="${tabId}">${escapeHtml(tab.title || `Tab ${tabIndex + 1}`)}</button>`;
                            tabContentHtml += `
                                <div class="tab-content ${isActive}" id="${tabId}">
                                    <p>${block.content}</p>
                                </div>
                            `;
                        });
                        tabHeaderHtml += '</div>';
                        html += `<div class="tabs">${tabHeaderHtml}${tabContentHtml}</div>`;
                    }
                    break;
                case 'accordion':
                    if (Array.isArray(block.content) && block.content.length > 0) {
                        let accordionHtml = '<div class="accordion">';
                        block.content.forEach((item, itemIndex) => {
                            const isActive = itemIndex === 0 ? 'active' : ''; // Make first item active by default
                            accordionHtml += `
                                <div class="accordion-item ${isActive}">
                                    <div class="accordion-header">${escapeHtml(item.title || `Question ${itemIndex + 1}`)} <i class="fas fa-chevron-down"></i></div>
                                    <div class="accordion-content">
                                        <p>${item.content}</p>
                                    </div>
                                </div>
                            `;
                        });
                        accordionHtml += '</div>';
                        html += accordionHtml;
                    }
                    break;
                case 'spoiler':
                    if (block.content) {
                        html += `
                            <details class="spoiler">
                                <summary>${escapeHtml(block.summary || 'Click to reveal spoiler')}</summary>
                                <div class="spoiler-content">
                                    <p>${block.content}</p>
                                </div>
                            </details>
                        `;
                    }
                    break;
                default:
                    // No render for unimplemented types
                    break;
            }
        });

        // Add share float button at the end of preview content
        html += `
            <div class="share-float">
                <span>Share this post:</span>
                <a href="javascript:void(0);" class="share-btn" id="share-button-post"><i class="fas fa-share-alt"></i></a>
            </div>
        `;

        return html;
    }

    // Function to activate interactive functionalities in preview
    function activatePreviewInteractions() {
        // Syntax highlighting
        previewContent.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });

        // YouTube play button
        previewContent.querySelectorAll('.youtube-play-button').forEach(button => {
            button.addEventListener('click', () => {
                const videoId = button.dataset.videoId;
                const container = button.closest('.youtube-container');
                const thumbnail = container.querySelector('.youtube-thumbnail');
                const iframe = document.createElement('iframe');

                iframe.setAttribute('src', `https://www.youtube.com/embed/${videoId}?autoplay=1`);
                iframe.setAttribute('frameborder', '0');
                iframe.setAttribute('allowfullscreen', '1');
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.classList.add('youtube-embed');

                container.innerHTML = ''; // Clear thumbnail and button
                container.appendChild(iframe);
            });
        });

        // Tab functionality (copied from test.html script)
        previewContent.querySelectorAll('.tabs').forEach(tabContainer => {
            tabContainer.querySelectorAll('.tab-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tabId = btn.getAttribute('data-tab');
                    
                    tabContainer.querySelectorAll('.tab-btn').forEach(tb => tb.classList.remove('active'));
                    tabContainer.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                    
                    btn.classList.add('active');
                    tabContainer.querySelector(`#${tabId}`).classList.add('active');
                });
            });
        });

        // Accordion functionality (copied from test.html script)
        previewContent.querySelectorAll('.accordion').forEach(accordionContainer => {
            accordionContainer.querySelectorAll('.accordion-header').forEach(header => {
                header.addEventListener('click', () => {
                    const accordionItem = header.parentElement;
                    accordionItem.classList.toggle('active');
                    
                    const icon = header.querySelector('i');
                    if (icon) {
                        icon.style.transform = accordionItem.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
                    }
                });
            });
        });

        // Carousel functionality (copied from test.html script)
        previewContent.querySelectorAll('.carousel').forEach(carousel => {
            const inner = carousel.querySelector('.carousel-inner');
            const items = carousel.querySelectorAll('.carousel-item');
            const prevBtn = carousel.querySelector('.prev');
            const nextBtn = carousel.querySelector('.next');
            const indicators = carousel.querySelectorAll('.carousel-indicator');
            
            let currentIndex = 0;
            // Ensure itemWidth is calculated after content is rendered
            const itemWidth = items.length > 0 ? items[0].clientWidth : 0; 
            const totalItems = items.length;
            
            function updateCarousel() {
                if (itemWidth > 0) { // Only update if itemWidth is valid
                    inner.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
                }
                
                indicators.forEach((indicator, index) => {
                    if (index === currentIndex) {
                        indicator.classList.add('active');
                    } else {
                        indicator.classList.remove('active');
                    }
                });
            }
            
            nextBtn.addEventListener('click', () => {
                currentIndex = (currentIndex + 1) % totalItems;
                updateCarousel();
            });
            
            prevBtn.addEventListener('click', () => {
                currentIndex = (currentIndex - 1 + totalItems) % totalItems;
                updateCarousel();
            });
            
            indicators.forEach((indicator, index) => {
                indicator.addEventListener('click', () => {
                    currentIndex = index;
                    updateCarousel();
                });
            });
            
            let autoRotate = setInterval(() => {
                currentIndex = (currentIndex + 1) % totalItems;
                updateCarousel();
            }, 5000);
            
            carousel.addEventListener('mouseenter', () => {
                clearInterval(autoRotate);
            });
            
            carousel.addEventListener('mouseleave', () => {
                autoRotate = setInterval(() => {
                    currentIndex = (currentIndex + 1) % totalItems;
                    updateCarousel();
                }, 5000);
            });

            // Call updateCarousel for the first time for initialization
            updateCarousel();
        });

        // Gallery show all functionality (copied from test.html script)
        previewContent.querySelectorAll('.gallery').forEach(gallery => {
            const showAllBtn = gallery.querySelector('.show-all-btn');
            if (showAllBtn) {
                showAllBtn.addEventListener('click', () => {
                    gallery.classList.remove('more');
                    gallery.classList.add('expanded');
                    showAllBtn.remove(); // Remove button after click
                });
            }
        });

        // TOC functionality (copied from test.html script)
        const tocContainer = previewContent.querySelector('.toc-container');
        if (tocContainer) {
            const tocHeader = tocContainer.querySelector('.toc-header');
            
            tocHeader.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') return; // Don't toggle if clicking a link within TOC
                
                tocContainer.classList.toggle('active');
                // Icon rotation handled by CSS via .toc-container.active
            });
            
            previewContent.querySelectorAll('.toc-list a').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href');
                    const targetElement = previewContent.querySelector(targetId);
                    
                    if (targetElement) {
                        tocContainer.classList.remove('active'); // Close TOC after clicking link
                        window.scrollTo({
                            top: targetElement.offsetTop - 80, // Offset for sticky header
                            behavior: 'smooth'
                        });
                    }
                });
            });

            // Sticky TOC (desktop only, disabled on mobile via CSS)
            // Note: For sticky TOC in preview, we need to detect scroll on previewContent
            // Not window. However, for consistency with test.html which is sticky based on window,
            // we will still use window scroll for this demo.
            // If previewContent has its own scrollbar, this logic needs to be changed.
            let tocOriginalTop = tocContainer.offsetTop; // This will be relative to previewContent
            previewContent.addEventListener('scroll', () => { // Use scroll event from previewContent
                // Only activate sticky if screen width is large enough (e.g., > 768px)
                if (window.innerWidth > 768) {
                    // Calculate scroll position relative to preview container
                    if (previewContent.scrollTop > tocOriginalTop - previewContent.offsetTop + 100) { // Adjust offset
                        tocContainer.classList.add('sticky');
                    } else {
                        tocContainer.classList.remove('sticky');
                    }
                } else {
                    tocContainer.classList.remove('sticky'); // Ensure not sticky on mobile
                }
            });
        }

        // Share button functionality (copied from test.html script)
        const shareFloat = previewContent.querySelector('.share-float');
        const shareButton = previewContent.querySelector('#share-button-post'); // Corrected ID to match HTML
        let shareTimer;
        
        function startShareTimer() {
            shareTimer = setTimeout(() => {
                if (shareFloat) shareFloat.classList.add('visible');
            }, 5000);
        }
        
        // Only activate share float if Web Share API is supported
        if (navigator.share) {
            startShareTimer(); // Start timer when preview is loaded
            if (shareButton) {
                shareButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        await navigator.share({
                            title: postTitleInput.value || 'Tian Blog Post',
                            text: postSynopsisTextarea.value || 'Check out this interesting article!',
                            url: window.location.href // Current URL, can be replaced with final post URL
                        });
                    } catch (err) {
                        console.log('Error sharing:', err);
                    }
                });
            }

            // Hide share float on scroll and restart timer
            previewContent.addEventListener('scroll', () => { // Use previewContent for scroll event
                if (shareFloat) shareFloat.classList.remove('visible');
                clearTimeout(shareTimer);
                startShareTimer();
            });
        } else {
            if (shareFloat) shareFloat.style.display = 'none'; // Hide if not supported
        }
    }


    // --- Load Post (Edit Mode) ---
    async function loadPostForEditing(postId) {
        console.log(`DEBUG: loadPostForEditing called with postId: ${postId}`);
        showLoadingOverlay('Loading post...');

        try {
            // Using parent directory api.php
            const response = await fetch('../api.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_post', id: postId })
            });
            
            const rawResponseText = await response.text();
            console.log('DEBUG: loadPostForEditing - Raw API response:', rawResponseText);

            let result;
            try {
                result = JSON.parse(rawResponseText);
            } catch (e) {
                console.error('ERROR: loadPostForEditing - Error parsing JSON from API response:', e);
                displayMessage(editorMessage, 'Failed to load post: Invalid API response.', 'error');
                hideLoadingOverlay();
                return;
            }

            console.log('DEBUG: loadPostForEditing - Parsed API result:', result);

            if (result.success && result.post) {
                currentPost = result.post;
                postTitleInput.value = currentPost.title || '';
                postSynopsisTextarea.value = currentPost.synopsis || '';
                thumbnailUrlInput.value = currentPost.thumbnail_url || '';
                thumbnailCaptionInput.value = currentPost.thumbnail_caption || '';
                postCategoryInput.value = currentPost.category || 'Uncategorized';
                renderContentBlocks();
                console.log('DEBUG: Post data loaded and rendered successfully.');
                displayMessage(editorMessage, 'Post loaded successfully!', 'success');
            } else {
                console.error('ERROR: loadPostForEditing - Failed to load post:', result.message);
                displayMessage(editorMessage, 'Failed to load post: ' + result.message, 'error');
                currentPost.id = null;
            }
        } catch (error) {
            console.error('ERROR: loadPostForEditing - Network or unexpected error:', error);
            displayMessage(editorMessage, 'An error occurred while loading the post.', 'error');
            currentPost.id = null;
        } finally {
            hideLoadingOverlay();
        }
    }

    // --- Card Navigation ---
    function showCard(cardNumber) {
        if (card1) card1.style.display = 'none';
        if (card2) card2.style.display = 'none';
        
        if (floatingPreviewBtn) floatingPreviewBtn.style.display = 'none'; // Hide floating button by default

        if (cardNumber === 1) {
            if (card1) card1.style.display = 'block';
            // Hide save and publish buttons on card 1
            saveDraftBtn.style.display = 'none';
            publishPostBtn.style.display = 'none';
        } else if (cardNumber === 2) {
            if (card2) card2.style.display = 'block';
            // Show preview, save, and publish buttons on Card 2
            // Only show floating button on mobile
            if (window.innerWidth <= 768) {
                if (floatingPreviewBtn) floatingPreviewBtn.style.display = 'block';
            }
            saveDraftBtn.style.display = 'inline-block';
            publishPostBtn.style.display = 'inline-block';
        }
        currentCard = cardNumber;
    }

    function goToNextCard() {
        // Save data from Card 1 before moving
        currentPost.title = postTitleInput.value;
        currentPost.synopsis = postSynopsisTextarea.value;
        currentPost.thumbnail_url = thumbnailUrlInput.value;
        currentPost.thumbnail_caption = thumbnailCaptionInput.value;
        currentPost.category = postCategoryInput.value || 'Uncategorized';

        showCard(2);
    }

    function goToPreviousCard() {
        // Text editor content is already handled by input event listeners on each block
        showCard(1);
    }


    // --- Event Listeners ---

    // "Add Block" button
    addBlockBtn.addEventListener('click', () => {
        const selectedType = blockTypeSelect.value;
        if (selectedType) {
            addBlock(selectedType);
            blockTypeSelect.value = ''; // Reset selection
        } else {
            displayMessage(editorMessage, 'Please select a block type first.', 'error');
        }
    });

    // "Back to Dashboard" button (in header)
    backToDashboardBtn.addEventListener('click', () => {
        window.location.href = '/blog/thoughts/';
    });

    // "Next" button (Card 1 to Card 2)
    if (nextCardBtn) nextCardBtn.addEventListener('click', goToNextCard);

    // "Back" button (Card 2 to Card 1)
    if (backCardBtn) backCardBtn.addEventListener('click', goToPreviousCard);

    // Function to save draft (used by button and auto-save)
    async function saveDraft() {
        if (isAutoSaving) return;
        isAutoSaving = true;

        showLoadingOverlay();

        // Ensure latest metadata is saved
        currentPost.title = postTitleInput.value;
        currentPost.synopsis = postSynopsisTextarea.value;
        currentPost.thumbnail_url = thumbnailUrlInput.value;
        currentPost.thumbnail_caption = thumbnailCaptionInput.value;
        currentPost.category = postCategoryInput.value || 'Uncategorized';
        currentPost.status = 'draft';
        currentPost.edited_at = new Date().toISOString(); // Update edit time

        const action = currentPost.id ? 'update_post' : 'create_post';
        const url = '../api.php';

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action, post: currentPost })
            });
            const result = await response.json();

            if (result.success) {
                displayMessage(editorMessage, 'Draft saved successfully!', 'success');
                // Always update the editor_url_path in currentPost
                const usernameSlug = typeof CURRENT_USERNAME_SLUG !== 'undefined' ? CURRENT_USERNAME_SLUG : 'guest';
                const randomNumbers = Math.floor(10000 + Math.random() * 90000); // 5 random digits
                
                // If it's a new post, update currentPost.id and set the initial editor_url_path
                if (!currentPost.id) {
                    currentPost.id = result.post_id; // Get the actual post ID from API
                    currentPost.editor_url_path = `/blog/thoughts/ink/?id=${currentPost.id}@${usernameSlug}/666/${randomNumbers}`;
                    window.history.replaceState({}, '', currentPost.editor_url_path);
                } else {
                    // If updating an existing post, just update the random numbers in the editor_url_path
                    // to reflect a "new session" for this edit, but keep the post ID.
                    // This ensures the URL format is consistent without changing the base ID.
                    // Check if current URL already has the custom format before replacing
                    const currentUrl = window.location.href;
                    const customPathRegex = /\?id=(\d+)?@([a-zA-Z0-9_.-]+)\/666\/(\d{5})$/;
                    if (currentUrl.match(customPathRegex)) {
                         // Update only random numbers
                        const parts = currentUrl.split('/666/');
                        currentPost.editor_url_path = `${parts[0]}/666/${randomNumbers}`;
                    } else {
                        // If not in custom format, convert it
                        currentPost.editor_url_path = `/blog/thoughts/ink/?id=${currentPost.id}@${usernameSlug}/666/${randomNumbers}`;
                    }
                    window.history.replaceState({}, '', currentPost.editor_url_path);
                }

                // Update post_url in currentPost if returned by API (for published link)
                if (result.post_url) {
                    currentPost.post_url = result.post_url;
                }
                fetchCategories(); // Refresh categories after saving
            } else {
                displayMessage(editorMessage, 'Failed to save draft: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            displayMessage(editorMessage, 'An error occurred while saving the draft.', 'error');
        } finally {
            isAutoSaving = false;
            hideLoadingOverlay();
        }
    }

    // "Save Draft" button
    saveDraftBtn.addEventListener('click', saveDraft);

    // "Publish" button
    publishPostBtn.addEventListener('click', async () => {
        // Minimum validation before publishing
        if (!postTitleInput.value.trim()) {
            displayMessage(editorMessage, 'Post title cannot be empty.', 'error');
            return;
        }

        showLoadingOverlay('Publishing...');

        currentPost.title = postTitleInput.value;
        currentPost.synopsis = postSynopsisTextarea.value;
        currentPost.thumbnail_url = thumbnailUrlInput.value;
        currentPost.thumbnail_caption = thumbnailCaptionInput.value;
        currentPost.category = postCategoryInput.value || 'Uncategorized';
        currentPost.status = 'published';
        currentPost.published_at = currentPost.published_at || new Date().toISOString(); // Set publish time if not already set
        currentPost.edited_at = new Date().toISOString(); // Update edit time

        const action = currentPost.id ? 'update_post' : 'create_post';
        const url = '../api.php';

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action, post: currentPost, publish: true })
            });
            const result = await response.json();

            if (result.success) {
                displayMessage(editorMessage, 'Post published successfully!', 'success');
                fetchCategories(); // Refresh categories after publishing
                // Redirect to the published post page using the returned URL
                if (result.post_url) {
                    setTimeout(() => {
                        window.location.href = result.post_url;
                    }, 1000); // Give a little time for the message to be seen
                } else {
                    // Fallback if URL is not returned (should not happen)
                    setTimeout(() => {
                        window.location.href = '/blog/thoughts/';
                    }, 1000);
                }
            } else {
                displayMessage(editorMessage, 'Failed to publish post: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error publishing post:', error);
            displayMessage(editorMessage, 'An error occurred while publishing the post.', 'error');
        } finally {
            hideLoadingOverlay();
        }
    });

    // Preview button (floating button)
    // Add null check for floatingPreviewBtn before adding event listener
    if (floatingPreviewBtn) {
        floatingPreviewBtn.addEventListener('click', () => {
            // Ensure previewContent is not null before setting innerHTML
            if (!previewContent) {
                console.error("ERROR: previewContent element not found for rendering preview.");
                displayMessage(editorMessage, 'Preview functionality is temporarily unavailable. Missing preview area.', 'error');
                return;
            }

            if (editorMode) editorMode.style.display = 'none';
            if (card1) card1.style.display = 'none';
            if (card2) card2.style.display = 'none';
            
            if (previewMode) previewMode.style.display = 'block';
            if (floatingPreviewBtn) floatingPreviewBtn.style.display = 'none'; // Hide preview button when in preview mode

            previewContent.innerHTML = generatePreviewHtml();
            activatePreviewInteractions(); // Activate interactions in preview
            if (previewMode) previewMode.scrollTop = 0; // Scroll to top of preview
        });
    }


    // "Exit Preview" button
    exitPreviewBtn.addEventListener('click', () => {
        if (previewMode) previewMode.style.display = 'none';
        // Show editor again, and specifically the correct card
        // This is the fix for the editor not showing after exiting preview
        if (editorMode) editorMode.style.display = 'block'; // Ensure editorMode container is visible
        showCard(currentCard); // Use showCard to manage visibility of the correct card
    });

    // --- Auto-Save ---
    // Auto-save every 5 minutes (300,000 ms)
    setInterval(saveDraft, 300000);


    // --- Initialization ---
    const urlParams = new URLSearchParams(window.location.search);
    let idParam = urlParams.get('id'); // Get the raw value of the 'id' parameter

    let initialLoadHandled = false;

    if (idParam) {
        // Try to parse ID from the custom format: [post_id]@[username]/666/[random]
        const customFormatRegex = /^(\d+)@([a-zA-Z0-9_.-]+)\/666\/(\d{5})$/;
        const customFormatMatch = idParam.match(customFormatRegex);

        // Try to parse ID from the new draft custom format: @username/666/[random]
        const newDraftCustomFormatRegex = /^@([a-zA-Z0-9_.-]+)\/666\/(\d{5})$/;
        const newDraftCustomFormatMatch = idParam.match(newDraftCustomFormatRegex);

        if (customFormatMatch) {
            // Case 1: Existing post with custom URL (e.g., ?id=123@username/666/random)
            currentPost.id = parseInt(customFormatMatch[1]);
            loadPostForEditing(currentPost.id).then(() => {
                showCard(1);
                initialLoadHandled = true;
            });
            console.log(`DEBUG: Detected existing post with custom URL format. ID: ${currentPost.id}`);
        } else if (newDraftCustomFormatMatch) {
            // Case 2: New draft with custom URL (e.g., ?id=@username/666/random)
            // currentPost.id remains null for new drafts until first save
            console.log("DEBUG: Detected new draft with custom URL format.");
            showCard(1);
            initialLoadHandled = true;
        } else if (!isNaN(parseInt(idParam))) {
            // Case 3: Old numerical ID format (e.g., ?id=123)
            currentPost.id = parseInt(idParam);
            loadPostForEditing(currentPost.id).then(() => {
                showCard(1);
                initialLoadHandled = true;
                // After loading, update URL to new custom format for consistency
                const usernameSlug = typeof CURRENT_USERNAME_SLUG !== 'undefined' ? CURRENT_USERNAME_SLUG : 'guest';
                const randomNumbers = Math.floor(10000 + Math.random() * 90000);
                const newEditorUrl = `/blog/thoughts/ink/?id=${currentPost.id}@${usernameSlug}/666/${randomNumbers}`;
                window.history.replaceState({}, '', newEditorUrl);
                console.log("DEBUG: Converted old numerical ID URL to new custom format.");
            });
        } else {
            // Case 4: Malformed ID or other unexpected 'id' parameter value. Treat as new draft.
            console.warn("WARN: Malformed 'id' parameter detected. Treating as new draft.");
            const usernameSlug = typeof CURRENT_USERNAME_SLUG !== 'undefined' ? CURRENT_USERNAME_SLUG : 'guest';
            const randomNumbers = Math.floor(10000 + Math.random() * 90000);
            const editorUrl = `/blog/thoughts/ink/?id=@${usernameSlug}/666/${randomNumbers}`; // New custom URL
            window.history.replaceState({}, '', editorUrl);
            showCard(1);
            initialLoadHandled = true;
        }
    } else {
        // Case 5: No 'id' parameter at all (e.g., user navigated to /blog/thoughts/ink/)
        console.log("DEBUG: No 'id' parameter. Generating new custom URL for new draft.");
        const usernameSlug = typeof CURRENT_USERNAME_SLUG !== 'undefined' ? CURRENT_USERNAME_SLUG : 'guest';
        const randomNumbers = Math.floor(10000 + Math.random() * 90000); // 5 random digits
        const editorUrl = `/blog/thoughts/ink/?id=@${usernameSlug}/666/${randomNumbers}`; // New custom URL for draft
        window.history.replaceState({}, '', editorUrl);
        showCard(1);
        initialLoadHandled = true;
    }

    // Fallback to show card 1 if for some reason initialLoadHandled is false
    if (!initialLoadHandled) {
        showCard(1);
    }

    // Fetch categories on editor load
    fetchCategories();
});
