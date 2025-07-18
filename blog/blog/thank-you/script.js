document.addEventListener('DOMContentLoaded', () => {
    const slidesWrapper = document.querySelector('.slides-wrapper');
    const nextSlideBtn = document.getElementById('next-slide');
    const profileSetupForm = document.getElementById('profile-setup-form');
    const profileMessage = document.getElementById('profile-message');
    const profilePictureInput = document.getElementById('profile-picture');
    const profileOptions = document.querySelectorAll('.profile-option');

    let currentSlide = 0; // 0 for slide 1, 1 for slide 2

    // Fungsi untuk menampilkan pesan
    function displayMessage(element, message, type) {
        element.textContent = message;
        element.className = `message ${type}`; // Reset dan terapkan kelas baru
        element.style.display = 'block';
        setTimeout(() => {
            element.style.display = 'none';
            element.textContent = '';
        }, 5000); // Sembunyikan setelah 5 detik
    }

    // Fungsi untuk beralih slide
    function showSlide(index) {
        currentSlide = index;
        slidesWrapper.style.transform = `translateX(-${index * 50}%)`; // 50% karena setiap slide 50% dari wrapper
    }

    // Event listener untuk tombol "Continue"
    if (nextSlideBtn) {
        nextSlideBtn.addEventListener('click', () => {
            showSlide(1); // Pindah ke slide 2
        });
    }

    // Handle profile picture option selection
    profileOptions.forEach(option => {
        option.addEventListener('click', () => {
            // Remove 'selected' class from all options
            profileOptions.forEach(opt => opt.classList.remove('selected'));
            // Add 'selected' class to the clicked option
            option.classList.add('selected');
            // Set the URL input value to the selected option's URL
            profilePictureInput.value = option.dataset.url;
        });
    });

    // Clear selection if user types in the URL input
    if (profilePictureInput) {
        profilePictureInput.addEventListener('input', () => {
            profileOptions.forEach(opt => opt.classList.remove('selected'));
        });
    }


    // Menangani Pengiriman Formulir Pengaturan Profil
    if (profileSetupForm) {
        profileSetupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(profileSetupForm);
            const data = Object.fromEntries(formData.entries());

            try {
                // Mengirim data ke auth.php dengan action 'update_profile'
                const response = await fetch('../knock2/auth.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ action: 'update_profile', ...data })
                });
                const result = await response.json();

                if (result.success) {
                    displayMessage(profileMessage, result.message, 'success');
                    // Opsional: Redirect ke halaman lain setelah profil disimpan
                    setTimeout(() => {
                        window.location.href = '/blog/'; // Contoh: Redirect ke homepage blog
                    }, 2000);
                } else {
                    displayMessage(profileMessage, result.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                displayMessage(profileMessage, 'Terjadi kesalahan saat mencoba menyimpan profil.', 'error');
            }
        });
    }
});
