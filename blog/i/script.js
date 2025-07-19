        // Syntax highlighting
        document.addEventListener('DOMContentLoaded', (event) => {
            document.querySelectorAll('pre code').forEach((block) => {
                hljs.highlightElement(block);
            });
        });
        
        // Copy code functionality
        document.querySelectorAll('.copy-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const code = btn.parentElement.textContent.replace('Copy', '').replace(btn.parentElement.querySelector('.code-header').textContent, '');
                navigator.clipboard.writeText(code).then(() => {
                    btn.textContent = 'Copied!';
                    setTimeout(() => {
                        btn.textContent = 'Copy';
                    }, 2000);
                });
            });
        });
        
        // Tab functionality
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                const tabContainer = btn.closest('.tabs');
                
                tabContainer.querySelectorAll('.tab-btn').forEach(tb => tb.classList.remove('active'));
                tabContainer.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
                
                btn.classList.add('active');
                document.getElementById(tabId).classList.add('active');
            });
        });
        
        // Accordion functionality
        document.querySelectorAll('.accordion-header').forEach(header => {
            header.addEventListener('click', () => {
                const accordionItem = header.parentElement;
                accordionItem.classList.toggle('active');
                
                const icon = header.querySelector('i');
                if (icon) {
                    icon.style.transform = accordionItem.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
                }
            });
        });
        
        // TOC functionality
        const tocContainer = document.querySelector('.toc-container');
        const tocHeader = document.querySelector('.toc-header');
        
        tocHeader.addEventListener('click', (e) => {
            if (e.target.tagName === 'A') return;
            
            tocContainer.classList.toggle('active');
            const icon = tocHeader.querySelector('i');
            icon.style.transform = tocContainer.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
        });
        
        document.querySelectorAll('.toc-list a').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetElement = document.querySelector(targetId);
                
                if (targetElement) {
                    tocContainer.classList.remove('active');
                    const icon = tocHeader.querySelector('i');
                    icon.style.transform = 'rotate(0deg)';
                    
                    window.scrollTo({
                        top: targetElement.offsetTop - 80,
                        behavior: 'smooth'
                    });
                }
            });
        });
        
        window.addEventListener('scroll', () => {
            const toc = document.querySelector('.toc-container');
            const tocOffset = toc.offsetTop;
            const scrollPosition = window.scrollY;
            
            if (scrollPosition > tocOffset + 100) {
                toc.classList.add('sticky');
            } else {
                toc.classList.remove('sticky');
            }
            
            clearTimeout(shareTimer);
            shareTimer = setTimeout(() => {
                shareFloat.classList.add('visible');
            }, 5000);
            
            // Paragraph animation
            document.querySelectorAll('.animate-paragraph').forEach(p => {
                const rect = p.getBoundingClientRect();
                if (rect.top < window.innerHeight * 0.8) {
                    p.classList.add('visible');
                }
            });
        });
        
        // Back to top button
        const backToTopBtn = document.querySelector('.back-to-top');
        window.addEventListener('scroll', () => {
            const scrollPercentage = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
            if (scrollPercentage > 70) {
                backToTopBtn.classList.add('visible');
            } else {
                backToTopBtn.classList.remove('visible');
            }
        });
        
        backToTopBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        // Gallery show all functionality
        const gallery = document.querySelector('.gallery');
        const showAllBtn = document.querySelector('.show-all-btn');
        
        if (showAllBtn) {
            showAllBtn.addEventListener('click', () => {
                gallery.classList.remove('more');
                gallery.classList.add('expanded');
                showAllBtn.remove();
            });
        }
        
        // Carousel functionality
        const carousel = document.querySelector('.carousel');
        if (carousel) {
            const inner = carousel.querySelector('.carousel-inner');
            const items = carousel.querySelectorAll('.carousel-item');
            const prevBtn = carousel.querySelector('.prev');
            const nextBtn = carousel.querySelector('.next');
            const indicators = carousel.querySelectorAll('.carousel-indicator');
            
            let currentIndex = 0;
            const itemWidth = items[0].clientWidth;
            const totalItems = items.length;
            
            function updateCarousel() {
                inner.style.transform = `translateX(-${currentIndex * itemWidth}px)`;
                
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
        }
        
        // YouTube video functionality
        const youtubeContainer = document.querySelector('.youtube-container');
        if (youtubeContainer) {
            const thumbnail = youtubeContainer.querySelector('.youtube-thumbnail');
            const playButton = youtubeContainer.querySelector('.youtube-play-button');
            const iframe = document.createElement('iframe');
            
            iframe.setAttribute('src', 'https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1');
            iframe.setAttribute('frameborder', '0');
            iframe.setAttribute('allowfullscreen', '1');
            iframe.style.width = '100%';
            iframe.style.height = '100%';
            iframe.style.display = 'none';
            
            youtubeContainer.appendChild(iframe);
            
            youtubeContainer.addEventListener('click', () => {
                thumbnail.style.display = 'none';
                playButton.style.display = 'none';
                iframe.style.display = 'block';
            });
        }
        
        // Share button functionality
        const shareFloat = document.querySelector('.share-float');
        const shareButton = document.getElementById('share-button');
        let shareTimer;
        
        function startShareTimer() {
            shareTimer = setTimeout(() => {
                shareFloat.classList.add('visible');
            }, 5000);
        }
        
        startShareTimer();
        
        if (navigator.share) {
            shareButton.addEventListener('click', async (e) => {
                e.preventDefault();
                try {
                    await navigator.share({
                        title: document.title,
                        text: 'Check out this interesting article!',
                        url: window.location.href
                    });
                } catch (err) {
                    console.log('Error sharing:', err);
                }
            });
        } else {
            shareFloat.style.display = 'none';
        }
        
        window.addEventListener('scroll', () => {
            shareFloat.classList.remove('visible');
            clearTimeout(shareTimer);
            startShareTimer();
        });
        
        // Calculate reading time
        function calculateReadingTime() {
            const text = document.querySelector('.post-content').textContent;
            const wordCount = text.trim().split(/\s+/).length;
            const readingTime = Math.ceil(wordCount / 200);
            document.querySelector('.fa-clock').parentNode.textContent = ` ${readingTime} min read`;
        }
        
        calculateReadingTime();