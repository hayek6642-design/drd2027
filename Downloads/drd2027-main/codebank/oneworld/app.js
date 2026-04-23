// OneWorld - Anonymous Social Platform Frontend
import { createPost, getPosts, getAnonId } from './supabase.js';

// Global state
let posts = [];
let loading = false;

// DOM elements
const app = document.getElementById('app');
const loadingOverlay = document.getElementById('loading-overlay');
const postsFeed = document.getElementById('posts-feed');
const postContent = document.getElementById('post-content');
const submitPost = document.getElementById('submit-post');
const charCount = document.getElementById('char-count');

// Initialize the application
async function initApp() {
    try {
        showLoading();

        // Setup event listeners
        setupEventListeners();

        // Load initial posts
        await loadPosts();

        // Show app
        showApp();

        hideLoading();
    } catch (error) {
        console.error('App initialization error:', error);
        showToast('Failed to initialize app', 'error');
        hideLoading();
    }
}

// Load posts from the anonymous platform
async function loadPosts() {
    try {
        const data = await getPosts();
        posts = data;
        renderPosts();
    } catch (error) {
        console.error('Load posts error:', error);
        showToast('Failed to load posts', 'error');
    }
}

// Render posts in the feed
function renderPosts() {
    postsFeed.innerHTML = '';

    if (posts.length === 0) {
        postsFeed.innerHTML = '<div class="empty-state">No posts yet. Be the first to share something!</div>';
        return;
    }

    posts.forEach(post => {
        const postElement = createPostElement(post);
        postsFeed.appendChild(postElement);
    });
}

// Create a post element for display
function createPostElement(post) {
    const postDiv = document.createElement('div');
    postDiv.className = 'post';
    postDiv.dataset.postId = post.id;

    postDiv.innerHTML = `
        <div class="post-content">
            <div class="post-text">
                <strong>Someone:</strong> ${escapeHtml(post.message)}
            </div>
            <div class="post-time">${formatTime(post.created_at)}</div>
        </div>
    `;

    return postDiv;
}

// Event listeners setup
function setupEventListeners() {
    // Post composer
    postContent.addEventListener('input', updatePostComposer);
    submitPost.addEventListener('click', handlePostSubmit);
}

// Handle post submission
async function handlePostSubmit() {
    const message = postContent.value.trim();
    if (!message) return;

    try {
        showLoading();

        await createPost(message);

        // Clear the input
        postContent.value = '';
        updatePostComposer();

        // Reload posts to show the new one
        await loadPosts();

        showToast('Post created successfully!', 'success');

    } catch (error) {
        console.error('Post submit error:', error);
        showToast('Failed to create post', 'error');
    } finally {
        hideLoading();
    }
}

// Update post composer UI
function updatePostComposer() {
    const content = postContent.value;
    const remaining = 1000 - content.length;
    charCount.textContent = remaining;

    if (remaining < 0) {
        charCount.style.color = 'red';
        submitPost.disabled = true;
    } else {
        charCount.style.color = remaining <= 50 ? 'orange' : '#666';
        submitPost.disabled = !content.trim();
    }
}

// Utility functions
function showLoading() {
    loadingOverlay.classList.remove('hidden');
}

function hideLoading() {
    loadingOverlay.classList.add('hidden');
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    document.getElementById('toast-container').appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, 3000);
}

function showApp() {
    app.classList.remove('hidden');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatTime(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;

    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;

    return date.toLocaleDateString();
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initApp();
});