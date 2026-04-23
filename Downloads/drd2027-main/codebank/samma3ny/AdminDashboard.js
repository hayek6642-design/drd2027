// Samma3ny Admin Dashboard
// Opens when Samma3ny tab is clicked 7 times consecutively

// Add CSS for progress bar
const progressBarCSS = `
<style>
.admin-progress-container {
    margin: 15px 0;
    padding: 15px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    border: 1px solid rgba(176, 67, 255, 0.3);
}

.admin-progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    color: #fff;
    font-size: 14px;
    font-weight: 500;
}

.admin-progress-bar {
    width: 100%;
    height: 12px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow: hidden;
    position: relative;
}

.admin-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #B043FF, #FF77E9);
    border-radius: 10px;
    transition: width 0.3s ease;
    position: relative;
    overflow: hidden;
}

.admin-progress-fill::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    right: 0;
    background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.4),
        transparent
    );
    animation: admin-shimmer 2s infinite;
}

@keyframes admin-shimmer {
    0% { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
}

.admin-progress-text {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
    color: #ccc;
    font-size: 12px;
}

.admin-progress-percentage {
    font-weight: 600;
    color: #B043FF;
}
</style>
`;

document.addEventListener('DOMContentLoaded', function() {
    const samma3nyTab = document.getElementById('samma3ny-tab');
    let clickCount = 0;
    let clickTimer = null;

    if (samma3nyTab) {
        samma3nyTab.addEventListener('click', function() {
            clickCount++;
            if (clickCount === 1) {
                clickTimer = setTimeout(() => {
                    clickCount = 0;
                }, 2000); // Reset after 2 seconds
            } else if (clickCount === 7) {
                clearTimeout(clickTimer);
                clickCount = 0;
                openAdminDashboard();
            }
        });
    }

    function openAdminDashboard() {
        // Open the new React admin dashboard
        window.open('admin.html', '_blank');
    }

    function showAdminDashboard() {
        // Inject CSS into document head
        document.head.insertAdjacentHTML('beforeend', progressBarCSS);
        
        const dashboard = document.createElement('div');
        dashboard.id = 'admin-dashboard';
        dashboard.innerHTML = `
            <div class="admin-header">
                <h3>Samma3ny Admin Panel</h3>
                <button id="close-admin-dashboard">Close</button>
            </div>
            <div class="admin-content">
                <input type="file" id="upload-input" accept="audio/*" multiple />
                <button id="upload-btn">Upload Songs</button>
                <div id="upload-progress" class="admin-progress-container" style="display: none;">
                    <div class="admin-progress-header">
                        <span>Uploading Files...</span>
                        <span class="admin-progress-percentage" id="progress-percentage">0%</span>
                    </div>
                    <div class="admin-progress-bar">
                        <div class="admin-progress-fill" id="progress-fill" style="width: 0%;"></div>
                    </div>
                    <div class="admin-progress-text">
                        <span id="progress-filename">No file selected</span>
                        <span id="progress-status">Ready</span>
                    </div>
                </div>
                <ul id="song-list"></ul>
                <button id="sync-btn">Sync Now</button>
                <p><a href="#" id="reset-password-link">Reset Password</a></p>
            </div>
        `;
        document.body.appendChild(dashboard);

        // Style the dashboard
        dashboard.style.position = 'fixed';
        dashboard.style.top = '0';
        dashboard.style.right = '0';
        dashboard.style.width = '400px';
        dashboard.style.height = '100%';
        dashboard.style.backgroundColor = '#f0f0f0';
        dashboard.style.borderLeft = '1px solid #ccc';
        dashboard.style.padding = '10px';
        dashboard.style.overflowY = 'auto';
        dashboard.style.zIndex = '9999';

        // Close button
        document.getElementById('close-admin-dashboard').addEventListener('click', function() {
            dashboard.remove();
        });

        // Upload functionality
        document.getElementById('upload-btn').addEventListener('click', async function() {
            await selectFile();
        });

        // Also handle file input change for web
        document.getElementById('upload-input').addEventListener('change', async function() {
            const files = this.files;
            for (const file of files) {
                await uploadToCloudinary(file);
            }
        });

        // Sync functionality
        document.getElementById('sync-btn').addEventListener('click', function() {
            location.reload(); // Simple sync by reloading
        });

        // Reset password
        document.getElementById('reset-password-link').addEventListener('click', function(e) {
            e.preventDefault();
            const newPassword = prompt('Enter new admin password:');
            if (newPassword) {
                localStorage.setItem('adminPassword', btoa(newPassword));
                alert('Password reset successfully');
            }
        });

        // Load existing songs
        loadSongs();
    }

    // Progress bar helper functions
    function showProgressBar() {
        const progressContainer = document.getElementById('upload-progress');
        if (progressContainer) {
            progressContainer.style.display = 'block';
        }
    }

    function hideProgressBar() {
        const progressContainer = document.getElementById('upload-progress');
        if (progressContainer) {
            progressContainer.style.display = 'none';
        }
    }

    function updateProgressBar(percentage, filename, status = 'Uploading...') {
        const progressFill = document.getElementById('progress-fill');
        const progressPercentage = document.getElementById('progress-percentage');
        const progressFilename = document.getElementById('progress-filename');
        const progressStatus = document.getElementById('progress-status');

        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        if (progressPercentage) {
            progressPercentage.textContent = `${Math.round(percentage)}%`;
        }
        if (progressFilename) {
            progressFilename.textContent = filename;
        }
        if (progressStatus) {
            progressStatus.textContent = status;
        }
    }

    async function uploadToCloudinary(file) {
        const CLOUD_NAME = "dhpyneqgk";
        const UPLOAD_PRESET = "media-player1";
        const CLOUD_FOLDER = "songs/";
        const CLOUD_ENDPOINT = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`;

        // Show progress bar and initialize
        showProgressBar();
        updateProgressBar(0, file.name, 'Starting upload...');

        const formData = new FormData();
        formData.append("file", file);
        formData.append("upload_preset", UPLOAD_PRESET);
        formData.append("folder", CLOUD_FOLDER);

        try {
            updateProgressBar(25, file.name, 'Uploading to cloud...');
            
            const response = await fetch(CLOUD_ENDPOINT, {
                method: "POST",
                body: formData,
            });

            updateProgressBar(75, file.name, 'Processing response...');

            const data = await response.json();
            if (!data.secure_url) throw new Error("Upload failed");

            updateProgressBar(100, file.name, 'Upload complete!');
            console.log('✅ Uploaded:', data);

            // Save metadata to localStorage
            await saveSongMetadata(data);
            
            // Hide progress bar after a short delay
            setTimeout(() => {
                hideProgressBar();
            }, 1500);

            // Update UI
            loadSongs();
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed');
        }
    }

    // Detect platform and use appropriate file picker
    async function selectFile() {
        if (typeof window !== 'undefined' && window.Capacitor && window.Capacitor.isNativePlatform()) {
            // Mobile: Use Capacitor FilePicker
            try {
                const { FilePicker } = await import('@capawesome/capacitor-file-picker');
                const result = await FilePicker.pickFiles({
                    types: ['audio/*'],
                    multiple: true
                });

                if (result.files.length > 0) {
                    for (const file of result.files) {
                        const blob = new Blob([file.data], { type: file.mimeType });
                        await uploadToServer(blob);
                    }
                }
            } catch (error) {
                console.error('File selection failed:', error);
                alert('File selection failed');
            }
        } else {
            // Web: Use standard file input
            document.getElementById('upload-input').click();
        }
    }

    async function saveSongMetadata(data) {
        const song = {
            id: data.public_id,
            title: data.original_filename,
            url: data.secure_url,
            duration: data.duration || 0,
            uploadedAt: new Date().toISOString(),
        };

        // Load existing songs from localStorage
        let songs = JSON.parse(localStorage.getItem('songs') || '[]');

        // Add new song
        songs.push(song);

        // Save back to localStorage
        localStorage.setItem('songs', JSON.stringify(songs));
    }

    async function loadSongs() {
        const songList = document.getElementById('song-list');
        songList.innerHTML = '';

        // Load from localStorage
        const songs = JSON.parse(localStorage.getItem('songs') || '[]');

        songs.forEach(song => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${song.title}</span>
                <audio controls src="${song.url}" style="width:100%"></audio>
                <button class="delete-btn" data-id="${song.id}">Delete</button>
                <button class="rename-btn" data-id="${song.id}">Rename</button>
            `;
            songList.appendChild(li);
        });

        // Add event listeners for delete and rename
        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const id = this.getAttribute('data-id');
                await deleteSong(id);
            });
        });

        document.querySelectorAll('.rename-btn').forEach(btn => {
            btn.addEventListener('click', async function() {
                const id = this.getAttribute('data-id');
                const newTitle = prompt('Enter new title:');
                if (newTitle) {
                    await renameSong(id, newTitle);
                }
            });
        });
    }

    async function deleteSong(id) {
        // Update localStorage
        let songs = JSON.parse(localStorage.getItem('songs') || '[]');
        songs = songs.filter(song => song.id !== id);
        localStorage.setItem('songs', JSON.stringify(songs));

        console.log(`🗑 Deleted ${id}`);
        loadSongs();
    }

    async function renameSong(id, newTitle) {
        // Update localStorage
        let songs = JSON.parse(localStorage.getItem('songs') || '[]');
        const songIndex = songs.findIndex(song => song.id === id);
        if (songIndex !== -1) {
            songs[songIndex].title = newTitle;
            localStorage.setItem('songs', JSON.stringify(songs));
        }

        console.log(`✏️ Renamed ${id} to ${newTitle}`);
        loadSongs();
    }
});