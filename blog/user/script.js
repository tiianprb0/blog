document.addEventListener('DOMContentLoaded', () => {
    // Elemen tampilan profil
    const currentUsernameTextElement = document.getElementById('current-username-text'); // Mengambil elemen span username
    const profileAvatarDisplay = document.getElementById('profile-avatar-display');
    const displayNameText = document.getElementById('display-name-text');
    const userBioDisplay = document.getElementById('user-bio-display');

    // Elemen Mode View dan Edit
    const profileViewMode = document.getElementById('profile-view-mode');
    const profileEditMode = document.getElementById('profile-edit-mode');

    // Elemen Form Edit Inline
    const editProfileForm = document.getElementById('edit-profile-form');
    const editUsernameInput = document.getElementById('edit-username');
    const editDisplayNameInput = document.getElementById('edit-display-name');
    const editProfilePictureInput = document.getElementById('edit-profile-picture');
    const editDateOfBirthInput = document.getElementById('edit-date-of-birth');
    const editBioTextarea = document.getElementById('edit-bio');
    const editProfileMessage = document.getElementById('edit-profile-message');

    // Elemen Modal Hamburger Menu
    const hamburgerMenuModal = document.getElementById('hamburger-menu-modal');
    const hamburgerMenuBtn = document.getElementById('hamburger-menu-btn');
    const logoutBtnModal = document.getElementById('logout-btn-modal');
    const closeHamburgerModalBtn = document.getElementById('close-hamburger-modal');
    const blogLinkBtn = document.getElementById('blog-link-btn'); // Tombol link blog baru

    // Tombol-tombol
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const shareProfileBtn = document.getElementById('share-profile-btn'); // Tombol share baru

    const loadingOverlay = document.getElementById('loading-overlay'); // Ambil elemen loading overlay

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

    // Fungsi untuk menampilkan/menyembunyikan loading overlay
    function showLoadingOverlay(message = 'Memuat...') {
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

    // Simpan nilai asli saat masuk mode edit untuk fungsi cancel
    let originalProfileData = {};

    // Mengaktifkan mode edit (menampilkan form inline)
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            // Sembunyikan mode view, tampilkan mode edit
            profileViewMode.style.display = 'none';
            profileEditMode.style.display = 'block';

            // Isi form edit dengan data saat ini
            editUsernameInput.value = currentUsernameTextElement.textContent.replace('@', ''); // Ambil username tanpa '@'
            editDisplayNameInput.value = displayNameText.textContent;
            editProfilePictureInput.value = profileAvatarDisplay.src;
            editDateOfBirthInput.value = editDateOfBirthInput.value; // Pastikan ini mengambil nilai dari atribut value HTML
            editBioTextarea.value = userBioDisplay.textContent;

            // Simpan data asli sebelum edit
            originalProfileData = {
                username: editUsernameInput.value,
                display_name: editDisplayNameInput.value,
                profile_picture: editProfilePictureInput.value,
                date_of_birth: editDateOfBirthInput.value,
                bio: editBioTextarea.value
            };
        });
    }

    // Membatalkan mode edit (kembali ke view mode)
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            // Tampilkan mode view, sembunyikan mode edit
            profileViewMode.style.display = 'block';
            profileEditMode.style.display = 'none';

            // Kembalikan nilai form ke data asli (jika ada perubahan yang belum disimpan)
            editUsernameInput.value = originalProfileData.username;
            editDisplayNameInput.value = originalProfileData.display_name;
            editProfilePictureInput.value = originalProfileData.profile_picture;
            editDateOfBirthInput.value = originalProfileData.date_of_birth;
            editBioTextarea.value = originalProfileData.bio;

            editProfileMessage.style.display = 'none'; // Bersihkan pesan
        });
    }

    // Menangani pengiriman form edit profil
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            showLoadingOverlay('Menyimpan perubahan...'); // Tampilkan loading

            const updatedData = {
                action: 'update_profile',
                username: editUsernameInput.value,
                display_name: editDisplayNameInput.value,
                profile_picture: editProfilePictureInput.value,
                date_of_birth: editDateOfBirthInput.value,
                bio: editBioTextarea.value
            };

            try {
                const response = await fetch('../knock2/auth.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedData)
                });
                
                // Debug: Log raw response text
                const rawResponseText = await response.text();
                console.log('DEBUG: Update Profile Raw API response:', rawResponseText);

                let result;
                try {
                    result = JSON.parse(rawResponseText);
                } catch (e) {
                    console.error('ERROR: Update Profile - Error parsing JSON from API response:', e);
                    displayMessage(editProfileMessage, 'Terjadi kesalahan: Respons API tidak valid.', 'error');
                    return; // Stop execution if parsing fails
                }

                if (result.success) {
                    displayMessage(editProfileMessage, result.message, 'success');
                    // Perbarui tampilan profil dengan data baru
                    currentUsernameTextElement.textContent = '@' + updatedData.username; // Tambahkan '@'
                    profileAvatarDisplay.src = updatedData.profile_picture || 'https://placehold.co/100x100/A0B9A0/white?text=User';
                    displayNameText.textContent = updatedData.display_name;
                    userBioDisplay.textContent = updatedData.bio;

                    // Kembali ke view mode setelah berhasil menyimpan
                    setTimeout(() => {
                        profileViewMode.style.display = 'block';
                        profileEditMode.style.display = 'none';
                        editProfileMessage.style.display = 'none';
                    }, 1500); // Beri sedikit waktu agar pesan terlihat

                } else {
                    displayMessage(editProfileMessage, result.message, 'error');
                }
            } catch (error) {
                console.error('Error:', error);
                displayMessage(editProfileMessage, 'Terjadi kesalahan saat menyimpan perubahan.', 'error');
            } finally {
                hideLoadingOverlay(); // Selalu sembunyikan loading
            }
        });
    }

    // Menangani tombol Share Profile
    if (shareProfileBtn) {
        shareProfileBtn.addEventListener('click', async () => {
            const usernameForUrl = currentUsernameTextElement.textContent; // Ambil username termasuk '@'
            const profileUrl = `${window.location.origin}/blog/user/${usernameForUrl}`; // URL yang diminta
            const profileTitle = `Check out ${displayNameText.textContent}'s profile on Tian Blog!`;
            const profileText = userBioDisplay.textContent;

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: profileTitle,
                        text: profileText,
                        url: profileUrl
                    });
                    console.log('Profile shared successfully!');
                } catch (error) {
                    console.error('Error sharing profile:', error);
                }
            } else {
                // Fallback for browsers that do not support Web Share API
                const tempInput = document.createElement('textarea');
                tempInput.value = profileUrl;
                document.body.appendChild(tempInput);
            tempInput.select();
                try {
                    document.execCommand('copy');
                    alert('Profile URL copied to clipboard: ' + profileUrl);
                } catch (err) {
                    console.error('Failed to copy URL:', err);
                    alert('Could not copy URL to clipboard. Please copy manually: ' + profileUrl);
                } finally {
                    document.body.removeChild(tempInput);
                }
            }
        });
    }

    // Menangani tombol Hamburger Menu (untuk menampilkan modal logout)
    if (hamburgerMenuBtn) {
        hamburgerMenuBtn.addEventListener('click', () => {
            hamburgerMenuModal.classList.add('active');
        });
    }

    // Menangani tombol Logout di modal hamburger
    if (logoutBtnModal) {
        logoutBtnModal.addEventListener('click', async () => {
            console.log("DEBUG: Logout button clicked.");
            showLoadingOverlay('Melakukan logout...'); // Tampilkan loading
            try {
                const response = await fetch('../knock2/auth.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ action: 'logout' })
                });
                
                // Debug: Log raw response text
                const rawResponseText = await response.text();
                console.log('DEBUG: Logout Raw API response:', rawResponseText);

                let result;
                try {
                    result = JSON.parse(rawResponseText);
                } catch (e) {
                    console.error('ERROR: Logout - Error parsing JSON from API response:', e);
                    alert('Terjadi kesalahan: Respons logout tidak valid.'); // Inform user about invalid response
                    return; // Stop execution if parsing fails
                }

                console.log("DEBUG: Logout API response:", result);

                if (result.success) {
                    console.log("DEBUG: Logout successful, redirecting...");
                    // Beri sedikit waktu agar loading terlihat, lalu redirect
                    setTimeout(() => {
                        window.location.href = '/blog/knock2/';
                    }, 500); 
                } else {
                    console.error('ERROR: Logout failed:', result.message);
                    alert('Logout gagal: ' + result.message); // Inform user about failure
                }
            } catch (error) {
                console.error('ERROR: Error during logout fetch:', error);
                alert('Terjadi kesalahan saat mencoba logout.'); // Inform user about network error
            } finally {
                hideLoadingOverlay(); // Selalu sembunyikan loading
            }
        });
    }

    // Menangani tombol Close di modal hamburger
    if (closeHamburgerModalBtn) {
        closeHamburgerModalBtn.addEventListener('click', () => {
            hamburgerMenuModal.classList.remove('active');
        });
    }

    // Menangani tombol Blog Link (ikon kamera/lingkaran)
    if (blogLinkBtn) {
        blogLinkBtn.addEventListener('click', () => {
            window.location.href = '/blog/'; // Arahkan ke /blog/
        });
    }
});
