document.addEventListener('DOMContentLoaded', () => {
    // Elemen utama
    const editorMode = document.getElementById('editor-mode');
    const previewMode = document.getElementById('preview-mode');
    const previewContent = document.getElementById('preview-content');
    const editorMessage = document.getElementById('editor-message');
    const loadingOverlay = document.getElementById('loading-overlay'); // New: Loading overlay element

    // Input metadata postingan
    const postTitleInput = document.getElementById('post-title');
    const postSynopsisTextarea = document.getElementById('post-synopsis');
    const thumbnailUrlInput = document.getElementById('thumbnail-url');
    const thumbnailCaptionInput = document.getElementById('thumbnail-caption');
    const postCategoryInput = document.getElementById('post-category'); // New category input
    const categorySuggestionsDatalist = document.getElementById('category-suggestions'); // New datalist for suggestions

    // Kontrol blok konten
    const contentBlocksContainer = document.getElementById('content-blocks-container');
    const blockTypeSelect = document.getElementById('block-type-select');
    const addBlockBtn = document.getElementById('add-block-btn');

    // Tombol-tombol aksi
    const backToDashboardBtn = document.getElementById('back-to-dashboard-btn');
    const saveDraftBtn = document.getElementById('save-draft-btn');
    const publishPostBtn = document.getElementById('publish-post-btn');
    const previewBtn = document.getElementById('preview-btn');
    const exitPreviewBtn = document.getElementById('exit-preview-btn');
    const previewBtnSticky = document.createElement('button'); // New sticky preview button
    previewBtnSticky.id = 'preview-btn-sticky';
    previewBtnSticky.className = 'btn btn-primary'; // Gunakan gaya tombol yang sudah ada
    previewBtnSticky.textContent = 'Pratinjau';
    document.body.appendChild(previewBtnSticky);


    // Variabel untuk menyimpan struktur postingan
    let currentPost = {
        id: null,
        title: '',
        synopsis: '',
        thumbnail_url: '',
        thumbnail_caption: '',
        category: 'Uncategorized', // Default category
        content_blocks: [], // Array of { type: 'paragraph', content: '...' }
        status: 'draft',
        published_at: null,
        edited_at: null
    };

    let isAutoSaving = false; // Flag untuk mencegah auto-save berulang saat save sedang berjalan

    // --- Fungsi Utilitas ---

    // Fungsi untuk menampilkan pesan
    function displayMessage(element, message, type) {
        element.textContent = message;
        element.className = `message ${type}`; // Reset dan terapkan kelas baru
        element.style.display = 'block';
        // Hapus pesan setelah 5 detik, kecuali jika itu pesan auto-save
        if (!isAutoSaving) { // Hanya sembunyikan otomatis jika bukan auto-save
            setTimeout(() => {
                element.style.display = 'none';
                element.textContent = '';
            }, 5000);
        }
    }

    // Fungsi untuk menampilkan/menyembunyikan loading overlay
    function showLoadingOverlay(message = 'Menyimpan...') {
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

    // Fungsi untuk menghasilkan ID unik sederhana
    function generateUniqueId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    // Fungsi untuk meng-escape HTML (DIKOREKSI)
    function escapeHtml(text) {
        if (typeof text !== 'string') return text;
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, function(m) { return map[m]; });
    }

    // --- Manajemen Kategori ---
    async function fetchCategories() {
        try {
            const response = await fetch('../api.php', {
                method: 'POST', // Menggunakan POST untuk get_posts
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


    // --- Manajemen Blok Konten ---

    // Fungsi untuk membuat elemen input untuk item gambar (untuk galeri)
    function createImageItemElement(blockId, imageItem) {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add('image-item-input');
        itemDiv.dataset.itemId = imageItem.id; // ID unik untuk setiap item gambar

        itemDiv.innerHTML = `
            <input type="url" class="block-input image-url-input" placeholder="URL Gambar" value="${escapeHtml(imageItem.url || '')}">
            <input type="text" class="block-input image-caption-input" placeholder="Keterangan Gambar (opsional)" value="${escapeHtml(imageItem.caption || '')}">
            <button class="remove-image-item-btn btn-danger btn-small" title="Hapus Gambar"><i class="fas fa-trash"></i></button>
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

    // Fungsi untuk merender input item gambar dalam blok galeri
    function renderImageItems(blockId) {
        const block = currentPost.content_blocks.find(b => b.id === blockId);
        if (!block) return;

        const container = document.querySelector(`.content-block[data-id="${blockId}"] .image-items-container`);
        if (!container) return; // Pastikan container ada

        container.innerHTML = ''; // Bersihkan yang lama
        (block.images || []).forEach(imageItem => {
            container.appendChild(createImageItemElement(blockId, imageItem));
        });
    }

    // Fungsi untuk menambahkan item gambar baru ke blok galeri
    function addImageItem(blockId, url = '', caption = '') {
        const block = currentPost.content_blocks.find(b => b.id === blockId);
        if (!block) return;

        if (!block.images) block.images = [];
        const newItem = { id: generateUniqueId(), url, caption };
        block.images.push(newItem);
        renderImageItems(blockId); // Render ulang semua item
    }

    // Fungsi untuk menghapus item gambar dari blok galeri
    function removeImageItem(blockId, itemId) {
        const block = currentPost.content_blocks.find(b => b.id === blockId);
        if (!block || !block.images) return;

        block.images = block.images.filter(item => item.id !== itemId);
        renderImageItems(blockId); // Render ulang semua item
    }

    // Fungsi untuk membuat elemen input untuk item tab/accordion
    function createInteractiveItemElement(blockId, item, type) {
        const itemDiv = document.createElement('div');
        itemDiv.classList.add(`${type}-item-input`);
        itemDiv.dataset.itemId = item.id; // ID unik untuk setiap item

        itemDiv.innerHTML = `
            <input type="text" class="block-input ${type}-title-input" placeholder="Judul ${type}" value="${escapeHtml(item.title || '')}">
            <textarea class="block-input ${type}-content-input" placeholder="Konten ${type}" rows="3">${escapeHtml(item.content || '')}</textarea>
            <button class="remove-${type}-item-btn btn-danger btn-small" title="Hapus Item"><i class="fas fa-trash"></i></button>
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

    // Fungsi untuk merender input item tab/accordion dalam blok
    function renderInteractiveItems(blockId, type) {
        const block = currentPost.content_blocks.find(b => b.id === blockId);
        if (!block) return;

        const container = document.querySelector(`.content-block[data-id="${blockId}"] .${type}-items-container`);
        if (!container) return;

        container.innerHTML = ''; // Bersihkan yang lama
        (block.content || []).forEach(item => {
            container.appendChild(createInteractiveItemElement(blockId, item, type));
        });
    }

    // Fungsi untuk menambahkan item baru ke blok tab/accordion
    function addInteractiveItem(blockId, type, title = '', content = '') {
        const block = currentPost.content_blocks.find(b => b.id === blockId);
        if (!block) return;

        if (!block.content) block.content = [];
        const newItem = { id: generateUniqueId(), title, content };
        block.content.push(newItem);
        renderInteractiveItems(blockId, type); // Render ulang semua item
    }

    // Fungsi untuk menghapus item dari blok tab/accordion
    function removeInteractiveItem(blockId, itemId, type) {
        const block = currentPost.content_blocks.find(b => b.id === blockId);
        if (!block || !block.content) return;

        block.content = block.content.filter(item => item.id !== itemId);
        renderInteractiveItems(blockId, type); // Render ulang semua item
    }


    // Fungsi untuk membuat elemen blok konten baru
    function createBlockElement(block) {
        const blockDiv = document.createElement('div');
        blockDiv.classList.add('content-block');
        blockDiv.dataset.id = block.id; // Simpan ID blok di dataset

        let inputHtml = '';
        let labelText = '';
        let placeholderText = '';

        switch (block.type) {
            case 'paragraph':
                labelText = 'Paragraf:';
                placeholderText = 'Masukkan teks paragraf...';
                inputHtml = `<textarea class="block-input" placeholder="${placeholderText}">${escapeHtml(block.content || '')}</textarea>`;
                break;
            case 'heading2':
            case 'heading3':
            case 'heading4':
                labelText = `Heading ${block.type.replace('heading', 'H')}:`;
                placeholderText = `Masukkan teks heading ${block.type.replace('heading', 'H')}...`;
                inputHtml = `<input type="text" class="block-input" placeholder="${placeholderText}" value="${escapeHtml(block.content || '')}">`;
                break;
            case 'image': // Default/Figure Image
                labelText = 'Gambar (URL & Keterangan):';
                placeholderText = 'URL Gambar';
                inputHtml = `
                    <input type="url" class="block-input" data-field="url" placeholder="${placeholderText}" value="${escapeHtml(block.url || '')}">
                    <input type="text" class="block-input" data-field="caption" placeholder="Keterangan Gambar (opsional)" value="${escapeHtml(block.caption || '')}">
                `;
                break;
            case 'carousel':
            case 'swipe-gallery':
            case 'grid-gallery':
                labelText = `${block.type.replace('-', ' ').toUpperCase()}:`;
                inputHtml = `
                    <div class="image-items-container"></div>
                    <button class="add-image-btn btn-secondary btn-small" data-block-id="${block.id}">Tambah Gambar</button>
                `;
                break;
            case 'code':
                labelText = 'Kode:';
                placeholderText = 'Masukkan kode di sini...';
                inputHtml = `
                    <input type="text" class="block-input" data-field="language" placeholder="Bahasa (e.g., javascript, python, html)" value="${escapeHtml(block.language || '')}">
                    <textarea class="block-input" data-field="content" placeholder="${placeholderText}" rows="8">${escapeHtml(block.content || '')}</textarea>
                `;
                break;
            case 'blockquote':
                labelText = 'Blockquote:';
                placeholderText = 'Masukkan kutipan...';
                inputHtml = `
                    <textarea class="block-input" data-field="quote" placeholder="${placeholderText}">${escapeHtml(block.quote || '')}</textarea>
                    <input type="text" class="block-input" data-field="author" placeholder="Penulis (opsional)" value="${escapeHtml(block.author || '')}">
                `;
                break;
            case 'note':
                labelText = 'Note Box:';
                placeholderText = 'Isi catatan...';
                inputHtml = `
                    <input type="text" class="block-input" data-field="title" placeholder="Judul Catatan (opsional)" value="${escapeHtml(block.title || '')}">
                    <textarea class="block-input" data-field="content" placeholder="${placeholderText}">${escapeHtml(block.content || '')}</textarea>
                `;
                break;
            case 'youtube':
                labelText = 'Video YouTube:';
                placeholderText = 'ID Video YouTube (misal: dQw4w9WgXcQ)';
                inputHtml = `<input type="text" class="block-input" placeholder="${placeholderText}" value="${escapeHtml(block.id || '')}">`;
                break;
            case 'table':
                labelText = 'Tabel (JSON Array of Arrays):'; // Tetap JSON untuk tabel karena strukturnya kompleks
                placeholderText = 'Contoh: [["Header 1", "Header 2"], ["Data 1", "Data 2"]]';
                inputHtml = `<textarea class="block-input" data-field="content" placeholder="${placeholderText}" rows="6">${block.content ? JSON.stringify(block.content, null, 2) : ''}</textarea>`;
                break;
            case 'ordered-list':
            case 'unordered-list':
                labelText = block.type === 'ordered-list' ? 'Daftar Berurutan (per baris):' : 'Daftar Tak Berurutan (per baris):';
                placeholderText = 'Masukkan item daftar, satu per baris...';
                inputHtml = `<textarea class="block-input" data-field="items" placeholder="${placeholderText}">${Array.isArray(block.items) ? escapeHtml(block.items.join('\n')) : ''}</textarea>`;
                break;
            case 'tabs':
                labelText = 'Tabs:';
                inputHtml = `
                    <div class="tabs-items-container"></div>
                    <button class="add-tabs-item-btn btn-secondary btn-small" data-block-id="${block.id}">Tambah Tab</button>
                `;
                break;
            case 'accordion':
                labelText = 'Accordion:';
                inputHtml = `
                    <div class="accordion-items-container"></div>
                    <button class="add-accordion-item-btn btn-secondary btn-small" data-block-id="${block.id}">Tambah Item Accordion</button>
                `;
                break;
            case 'spoiler':
                labelText = 'Spoiler:';
                placeholderText = 'Konten spoiler...';
                inputHtml = `
                    <input type="text" class="block-input" data-field="summary" placeholder="Ringkasan Spoiler (opsional)" value="${escapeHtml(block.summary || '')}">
                    <textarea class="block-input" data-field="content" placeholder="${placeholderText}">${escapeHtml(block.content || '')}</textarea>
                `;
                break;
            default:
                inputHtml = `<p>Tipe blok tidak dikenal: ${escapeHtml(block.type)}</p>`;
                break;
        }

        blockDiv.innerHTML = `
            <div class="block-controls">
                <button class="move-up-btn" title="Pindah ke Atas"><i class="fas fa-arrow-up"></i></button>
                <button class="move-down-btn" title="Pindah ke Bawah"><i class="fas fa-arrow-down"></i></button>
                <button class="delete-block-btn" title="Hapus Blok"><i class="fas fa-times"></i></button>
            </div>
            <span class="block-type-label">${block.type.replace('-', ' ').toUpperCase()}</span>
            <label>${labelText}</label>
            ${inputHtml}
        `;

        // Tambahkan event listener untuk input utama blok (jika ada)
        const mainInputs = blockDiv.querySelectorAll('.block-input:not([data-field="content"]):not([data-field="language"]):not([data-field="url"]):not([data-field="caption"]):not([data-field="quote"]):not([data-field="author"]):not([data-field="title"]):not([data-field="summary"]):not([data-field="items"])');
        mainInputs.forEach(input => {
            input.addEventListener('input', () => {
                updateBlockContent(block.id, block.type, input);
            });
        });

        // Tambahkan event listener untuk input dengan data-field
        const dataFieldInputs = blockDiv.querySelectorAll('.block-input[data-field]');
        dataFieldInputs.forEach(input => {
            input.addEventListener('input', () => {
                updateBlockContent(block.id, block.type, input);
            });
        });

        // Tambahkan event listener untuk tombol kontrol
        blockDiv.querySelector('.delete-block-btn').addEventListener('click', () => deleteBlock(block.id));
        blockDiv.querySelector('.move-up-btn').addEventListener('click', () => moveBlock(block.id, -1));
        blockDiv.querySelector('.move-down-btn').addEventListener('click', () => moveBlock(block.id, 1));

        // Tambahkan event listener untuk tombol "Tambah Gambar/Tab/Accordion"
        if (block.type === 'carousel' || block.type === 'swipe-gallery' || block.type === 'grid-gallery') {
            blockDiv.querySelector('.add-image-btn').addEventListener('click', () => addImageItem(block.id));
            renderImageItems(block.id); // Render item yang sudah ada saat blok dibuat
        } else if (block.type === 'tabs') {
            blockDiv.querySelector('.add-tabs-item-btn').addEventListener('click', () => addInteractiveItem(block.id, 'tabs'));
            renderInteractiveItems(block.id, 'tabs');
        } else if (block.type === 'accordion') {
            blockDiv.querySelector('.add-accordion-item-btn').addEventListener('click', () => addInteractiveItem(block.id, 'accordion'));
            renderInteractiveItems(block.id, 'accordion');
        }

        return blockDiv;
    }

    // Fungsi untuk menambahkan blok baru
    function addBlock(type, initialData = {}) {
        const newBlock = {
            id: generateUniqueId(),
            type: type,
        };

        // Inisialisasi konten berdasarkan tipe
        switch (type) {
            case 'paragraph':
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

    // Fungsi untuk memperbarui konten blok di array currentPost
    function updateBlockContent(blockId, blockType, inputElement) {
        const blockIndex = currentPost.content_blocks.findIndex(b => b.id === blockId);
        if (blockIndex === -1) return;

        const block = currentPost.content_blocks[blockIndex];

        // Handle generic inputs (paragraph, heading, youtube)
        if (['paragraph', 'heading2', 'heading3', 'heading4', 'youtube'].includes(blockType)) {
            block.content = inputElement.value;
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
                    displayMessage(editorMessage, 'Format JSON tabel tidak valid. Periksa konsol untuk detail.', 'error');
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

    // Fungsi untuk menghapus blok
    function deleteBlock(blockId) {
        currentPost.content_blocks = currentPost.content_blocks.filter(b => b.id !== blockId);
        document.querySelector(`.content-block[data-id="${blockId}"]`).remove();
    }

    // Fungsi untuk memindahkan blok (atas/bawah)
    function moveBlock(blockId, direction) {
        const index = currentPost.content_blocks.findIndex(b => b.id === blockId);
        if (index === -1) return;

        const newIndex = index + direction;
        if (newIndex >= 0 && newIndex < currentPost.content_blocks.length) {
            const [movedBlock] = currentPost.content_blocks.splice(index, 1);
            currentPost.content_blocks.splice(newIndex, 0, movedBlock);
            renderContentBlocks(); // Render ulang semua blok
        }
    }

    // Fungsi untuk merender ulang semua blok konten dari currentPost.content_blocks
    function renderContentBlocks() {
        contentBlocksContainer.innerHTML = ''; // Bersihkan container
        currentPost.content_blocks.forEach(block => {
            const blockElement = createBlockElement(block);
            contentBlocksContainer.appendChild(blockElement);
        });
    }

    // --- Fungsionalitas Pratinjau ---

    function generatePreviewHtml() {
        let html = '';
        let tocHtml = '';
        const headings = []; // Untuk mengumpulkan heading untuk TOC

        // Judul, sinopsis, thumbnail
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

        // Kumpulkan heading untuk TOC
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
            let currentLevel = 2; // TOC dimulai dari H2
            headings.forEach(heading => {
                while (currentLevel < heading.level) {
                    tocHtml += '<ul><li class="sub-item">';
                    currentLevel++;
                }
                while (currentLevel > heading.level) {
                    tocHtml += '</li></ul>';
                    currentLevel--;
                }
                tocHtml += `<li><a href="#${heading.id}">${escapeHtml(heading.text)}</a>`;
            });
            while (currentLevel > 2) { // Tutup tag yang belum tertutup
                tocHtml += '</li></ul>';
                currentLevel--;
            }
            tocHtml += `
                        </ul>
                    </div>
                </div>
            `;
            html += tocHtml;
        }


        // Konten blok
        currentPost.content_blocks.forEach((block, index) => {
            switch (block.type) {
                case 'paragraph':
                    // Tambahkan dropcap ke paragraf pertama jika ada
                    if (index === 0 && block.content) {
                        html += `<p class="dropcap">${escapeHtml(block.content)}</p>`;
                    } else if (block.content) {
                        html += `<p>${escapeHtml(block.content)}</p>`;
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
                                <img src="${escapeHtml(block.url)}" alt="${escapeHtml(block.caption || 'Gambar')}" class="post-image">
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
                            <blockquote>
                                <p>${escapeHtml(block.quote)}</p>
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
                                    <p>${escapeHtml(block.content)}</p>
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
                                    <p>${escapeHtml(tab.content || '')}</p>
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
                            const isActive = itemIndex === 0 ? 'active' : ''; // Buat item pertama aktif secara default
                            accordionHtml += `
                                <div class="accordion-item ${isActive}">
                                    <div class="accordion-header">${escapeHtml(item.title || `Pertanyaan ${itemIndex + 1}`)} <i class="fas fa-chevron-down"></i></div>
                                    <div class="accordion-content">
                                        <p>${escapeHtml(item.content || '')}</p>
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
                                    <p>${escapeHtml(block.content)}</p>
                                </div>
                            </details>
                        `;
                    }
                    break;
                default:
                    // Tidak ada render untuk tipe yang belum diimplementasikan
                    break;
            }
        });

        // Tambahkan tombol share float di akhir konten pratinjau
        html += `
            <div class="share-float">
                <span>Share this post:</span>
                <a href="#" class="share-btn" id="share-button-preview"><i class="fas fa-share-alt"></i></a>
            </div>
        `;

        return html;
    }

    // Fungsi untuk mengaktifkan fungsionalitas interaktif di preview
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
            // Pastikan itemWidth dihitung setelah konten dirender
            const itemWidth = items.length > 0 ? items[0].clientWidth : 0; 
            const totalItems = items.length;
            
            function updateCarousel() {
                if (itemWidth > 0) { // Hanya update jika itemWidth valid
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

            // Panggil updateCarousel pertama kali untuk inisialisasi
            updateCarousel();
        });

        // Gallery show all functionality (copied from test.html script)
        previewContent.querySelectorAll('.gallery').forEach(gallery => {
            const showAllBtn = gallery.querySelector('.show-all-btn');
            if (showAllBtn) {
                showAllBtn.addEventListener('click', () => {
                    gallery.classList.remove('more');
                    gallery.classList.add('expanded');
                    showAllBtn.remove(); // Hapus tombol setelah diklik
                });
            }
        });

        // TOC functionality (copied from test.html script)
        const tocContainer = previewContent.querySelector('.toc-container');
        if (tocContainer) {
            const tocHeader = tocContainer.querySelector('.toc-header');
            
            tocHeader.addEventListener('click', (e) => {
                if (e.target.tagName === 'A') return; // Jangan toggle jika klik link di dalam TOC
                
                tocContainer.classList.toggle('active');
                // Icon rotation handled by CSS via .toc-container.active
            });
            
            previewContent.querySelectorAll('.toc-list a').forEach(link => {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    const targetId = link.getAttribute('href');
                    const targetElement = previewContent.querySelector(targetId);
                    
                    if (targetElement) {
                        tocContainer.classList.remove('active'); // Tutup TOC setelah klik link
                        window.scrollTo({
                            top: targetElement.offsetTop - 80, // Offset untuk header sticky
                            behavior: 'smooth'
                        });
                    }
                });
            });

            // Sticky TOC (hanya di desktop, dinonaktifkan di mobile via CSS)
            // Note: Untuk sticky TOC di preview, kita perlu mendeteksi scroll pada previewContent
            // Bukan window. Namun, untuk konsistensi dengan test.html yang sticky berdasarkan window,
            // kita akan tetap menggunakan window scroll untuk demo ini.
            // Jika previewContent memiliki scrollbar sendiri, logika ini perlu diubah.
            let tocOriginalTop = tocContainer.offsetTop; // Ini akan relatif terhadap previewContent
            previewContent.addEventListener('scroll', () => { // Gunakan scroll event dari previewContent
                // Hanya aktifkan sticky jika lebar layar cukup besar (misal > 768px)
                if (window.innerWidth > 768) {
                    // Hitung posisi scroll relatif terhadap kontainer preview
                    if (previewContent.scrollTop > tocOriginalTop - previewContent.offsetTop + 100) { // Sesuaikan offset
                        tocContainer.classList.add('sticky');
                    } else {
                        tocContainer.classList.remove('sticky');
                    }
                } else {
                    tocContainer.classList.remove('sticky'); // Pastikan tidak sticky di mobile
                }
            });
        }

        // Share button functionality (copied from test.html script)
        const shareFloat = previewContent.querySelector('.share-float');
        const shareButton = previewContent.querySelector('#share-button-preview'); // Menggunakan ID yang berbeda untuk preview
        let shareTimer;
        
        function startShareTimer() {
            shareTimer = setTimeout(() => {
                if (shareFloat) shareFloat.classList.add('visible');
            }, 5000);
        }
        
        // Hanya aktifkan share float jika Web Share API didukung
        if (navigator.share) {
            startShareTimer(); // Mulai timer saat preview dimuat
            if (shareButton) {
                shareButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    try {
                        await navigator.share({
                            title: postTitleInput.value || 'Tian Blog Post',
                            text: postSynopsisTextarea.value || 'Check out this interesting article!',
                            url: window.location.href // URL saat ini, bisa diganti dengan URL postingan final
                        });
                    } catch (err) {
                        console.log('Error sharing:', err);
                    }
                });
            }

            // Sembunyikan share float saat scroll dan mulai timer lagi
            previewContent.addEventListener('scroll', () => { // Gunakan previewContent untuk scroll event
                if (shareFloat) shareFloat.classList.remove('visible');
                clearTimeout(shareTimer);
                startShareTimer();
            });
        } else {
            if (shareFloat) shareFloat.style.display = 'none'; // Sembunyikan jika tidak didukung
        }
    }


    // --- Load Post (Edit Mode) ---
    async function loadPostForEditing(postId) {
        console.log(`DEBUG: loadPostForEditing called with postId: ${postId}`);
        showLoadingOverlay('Memuat postingan...'); // Show loading overlay

        try {
            // Menggunakan parent directory api.php
            const response = await fetch('../api.php', {
                method: 'POST', // Menggunakan POST
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'get_post', id: postId }) // Mengirim ID di body JSON
            });
            
            const rawResponseText = await response.text();
            console.log('DEBUG: loadPostForEditing - Raw API response:', rawResponseText);

            let result;
            try {
                result = JSON.parse(rawResponseText);
            } catch (e) {
                console.error('ERROR: loadPostForEditing - Error parsing JSON from API response:', e);
                displayMessage(editorMessage, 'Gagal memuat postingan: Respons API tidak valid.', 'error');
                hideLoadingOverlay(); // Hide loading overlay on error
                return;
            }

            console.log('DEBUG: loadPostForEditing - Parsed API result:', result);

            if (result.success && result.post) {
                currentPost = result.post;
                postTitleInput.value = currentPost.title || '';
                postSynopsisTextarea.value = currentPost.synopsis || '';
                thumbnailUrlInput.value = currentPost.thumbnail_url || '';
                thumbnailCaptionInput.value = currentPost.thumbnail_caption || '';
                postCategoryInput.value = currentPost.category || 'Uncategorized'; // Load category
                renderContentBlocks(); // Render blok konten yang sudah ada
                console.log('DEBUG: Post data loaded and rendered successfully.');
                displayMessage(editorMessage, 'Postingan berhasil dimuat!', 'success'); // Feedback
            } else {
                console.error('ERROR: loadPostForEditing - Failed to load post:', result.message);
                displayMessage(editorMessage, 'Gagal memuat postingan: ' + result.message, 'error');
                currentPost.id = null; // Pastikan ID direset jika tidak ditemukan
            }
        } catch (error) {
            console.error('ERROR: loadPostForEditing - Network or unexpected error:', error);
            displayMessage(editorMessage, 'Terjadi kesalahan saat memuat postingan.', 'error');
            currentPost.id = null; // Pastikan ID direset
        } finally {
            hideLoadingOverlay(); // Always hide loading overlay
        }
    }

    // --- Event Listeners ---

    // Tombol "Tambah Blok"
    addBlockBtn.addEventListener('click', () => {
        const selectedType = blockTypeSelect.value;
        if (selectedType) {
            addBlock(selectedType);
            blockTypeSelect.value = ''; // Reset pilihan
        } else {
            displayMessage(editorMessage, 'Pilih tipe blok terlebih dahulu.', 'error');
        }
    });

    // Tombol "Kembali ke Dashboard"
    backToDashboardBtn.addEventListener('click', () => {
        window.location.href = '/blog/thoughts/';
    });

    // Fungsi untuk menyimpan draft (digunakan oleh tombol dan auto-save)
    async function saveDraft() {
        if (isAutoSaving) return; // Jangan jalankan jika auto-save sedang berjalan
        isAutoSaving = true;

        showLoadingOverlay(); // Show loading overlay

        currentPost.title = postTitleInput.value;
        currentPost.synopsis = postSynopsisTextarea.value;
        currentPost.thumbnail_url = thumbnailUrlInput.value;
        currentPost.thumbnail_caption = thumbnailCaptionInput.value;
        currentPost.category = postCategoryInput.value || 'Uncategorized'; // Save category
        currentPost.status = 'draft';
        currentPost.edited_at = new Date().toISOString(); // Update waktu edit

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
                displayMessage(editorMessage, 'Draft berhasil disimpan!', 'success');
                if (!currentPost.id) { // Jika ini postingan baru, update ID-nya
                    currentPost.id = result.post_id;
                    // Update URL browser tanpa reload
                    window.history.replaceState({}, '', `/blog/thoughts/ink/?id=${currentPost.id}`);
                }
                fetchCategories(); // Refresh categories after saving
            } else {
                displayMessage(editorMessage, 'Gagal menyimpan draft: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error saving draft:', error);
            displayMessage(editorMessage, 'Terjadi kesalahan saat menyimpan draft.', 'error');
        } finally {
            isAutoSaving = false; // Setel ulang flag setelah selesai
            hideLoadingOverlay(); // Hide loading overlay
        }
    }

    // Tombol "Simpan Draft"
    saveDraftBtn.addEventListener('click', saveDraft);

    // Tombol "Publikasikan"
    publishPostBtn.addEventListener('click', async () => {
        // Validasi minimal sebelum publikasi
        if (!postTitleInput.value.trim()) {
            displayMessage(editorMessage, 'Judul postingan tidak boleh kosong.', 'error');
            return;
        }

        showLoadingOverlay('Mempublikasikan...'); // Show loading overlay

        currentPost.title = postTitleInput.value;
        currentPost.synopsis = postSynopsisTextarea.value;
        currentPost.thumbnail_url = thumbnailUrlInput.value;
        currentPost.thumbnail_caption = thumbnailCaptionInput.value;
        currentPost.category = postCategoryInput.value || 'Uncategorized'; // Save category
        currentPost.status = 'published';
        currentPost.published_at = currentPost.published_at || new Date().toISOString(); // Set publish time if not already set
        currentPost.edited_at = new Date().toISOString(); // Update waktu edit

        const action = currentPost.id ? 'update_post' : 'create_post';
        const url = '../api.php';

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: action, post: currentPost, publish: true }) // Tambahkan flag publish
            });
            const result = await response.json();

            if (result.success) {
                displayMessage(editorMessage, 'Postingan berhasil dipublikasikan!', 'success');
                fetchCategories(); // Refresh categories after publishing
                // Redirect ke halaman postingan yang dipublikasikan
                if (result.post_url) {
                    setTimeout(() => {
                        window.location.href = result.post_url;
                    }, 1000); // Beri sedikit waktu agar pesan terlihat
                } else {
                    // Fallback jika URL tidak dikembalikan (seharusnya tidak terjadi)
                    setTimeout(() => {
                        window.location.href = '/blog/thoughts/';
                    }, 1000);
                }
            } else {
                displayMessage(editorMessage, 'Gagal mempublikasikan postingan: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('Error publishing post:', error);
            displayMessage(editorMessage, 'Terjadi kesalahan saat mempublikasikan postingan.', 'error');
        } finally {
            hideLoadingOverlay(); // Hide loading overlay
        }
    });

    // Tombol "Pratinjau"
    // Event listener untuk tombol preview asli
    previewBtn.addEventListener('click', () => {
        editorMode.style.display = 'none';
        previewMode.style.display = 'block';
        previewContent.innerHTML = generatePreviewHtml();
        activatePreviewInteractions(); // Aktifkan interaksi di preview
        previewBtnSticky.style.display = 'none'; // Sembunyikan tombol sticky preview
        // Scroll ke atas preview
        previewMode.scrollTop = 0;
    });

    // Event listener untuk tombol preview sticky
    previewBtnSticky.addEventListener('click', () => {
        previewBtn.click(); // Panggil event click tombol preview asli
    });


    // Tombol "Keluar Pratinjau"
    exitPreviewBtn.addEventListener('click', () => {
        previewMode.style.display = 'none';
        editorMode.style.display = 'block';
        // Tampilkan tombol sticky preview hanya di mobile
        if (window.innerWidth <= 768) {
            previewBtnSticky.style.display = 'block';
        }
    });

    // --- Auto-Save ---
    // Auto-save setiap 5 menit (300.000 ms)
    setInterval(saveDraft, 300000);


    // --- Inisialisasi ---
    const urlParams = new URLSearchParams(window.location.search);
    const postIdFromUrl = urlParams.get('id');
    if (postIdFromUrl) {
        currentPost.id = parseInt(postIdFromUrl);
        loadPostForEditing(currentPost.id);
    }

    // Fetch categories on editor load
    fetchCategories();

    // Tampilkan tombol sticky preview jika di mobile dan editor mode aktif
    if (window.innerWidth <= 768 && editorMode.style.display !== 'none') {
        previewBtnSticky.style.display = 'block';
    }
});
