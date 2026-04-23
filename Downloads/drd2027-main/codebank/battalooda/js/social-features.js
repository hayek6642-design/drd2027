/**
 * Social Features Module
 * Handles likes, comments, shares, and user interactions
 */

class SocialFeatures {
    constructor() {
        this.currentUser = null;
        this.commentCache = new Map();
        this.likeCache = new Map();
    }

    async init() {
        this.currentUser = window.battaloodaApp?.currentUser;
    }

    // Like functionality
    async likeRecording(recordingId) {
        if (!this.currentUser) {
            this.showError('يجب تسجيل الدخول للإعجاب');
            return null;
        }

        try {
            const response = await fetch('/api/battalooda/like', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ recordingId })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update cache
                this.likeCache.set(recordingId, true);
                
                // Update UI
                this.updateLikeButton(recordingId, true, data.likes);
                
                return data;
            } else {
                throw new Error('Failed to like recording');
            }
        } catch (error) {
            console.error('Error liking recording:', error);
            this.showError('فشل في التصويت');
            return null;
        }
    }

    async unlikeRecording(recordingId) {
        if (!this.currentUser) {
            return null;
        }

        try {
            const response = await fetch('/api/battalooda/unlike', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ recordingId })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Update cache
                this.likeCache.set(recordingId, false);
                
                // Update UI
                this.updateLikeButton(recordingId, false, data.likes);
                
                return data;
            } else {
                throw new Error('Failed to unlike recording');
            }
        } catch (error) {
            console.error('Error unliking recording:', error);
            return null;
        }
    }

    toggleLike(recordingId) {
        const isLiked = this.likeCache.get(recordingId) || false;
        
        if (isLiked) {
            return this.unlikeRecording(recordingId);
        } else {
            return this.likeRecording(recordingId);
        }
    }

    updateLikeButton(recordingId, isLiked, likesCount) {
        const likeBtn = document.querySelector(`.like-btn[data-recording-id="${recordingId}"]`);
        if (likeBtn) {
            likeBtn.dataset.liked = isLiked;
            likeBtn.classList.toggle('liked', isLiked);
            likeBtn.querySelector('span').textContent = likesCount || 0;
        }
    }

    // Comment functionality
    async getComments(recordingId, page = 1, limit = 10) {
        try {
            const cacheKey = `${recordingId}_${page}_${limit}`;
            
            if (this.commentCache.has(cacheKey)) {
                return this.commentCache.get(cacheKey);
            }

            const response = await fetch(`/api/battalooda/comments?recordingId=${recordingId}&page=${page}&limit=${limit}`);
            
            if (response.ok) {
                const data = await response.json();
                
                // Cache results
                this.commentCache.set(cacheKey, data);
                
                return data;
            } else {
                throw new Error('Failed to load comments');
            }
        } catch (error) {
            console.error('Error loading comments:', error);
            return { comments: [], total: 0 };
        }
    }

    async addComment(recordingId, text) {
        if (!this.currentUser) {
            this.showError('يجب تسجيل الدخول للتعليق');
            return null;
        }

        if (!text || text.trim().length === 0) {
            this.showError('التعليق لا يمكن أن يكون فارغًا');
            return null;
        }

        try {
            const response = await fetch('/api/battalooda/comment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    recordingId, 
                    text: text.trim(),
                    userId: this.currentUser.id 
                })
            });

            if (response.ok) {
                const data = await response.json();
                
                // Clear cache for this recording
                this.clearCommentCache(recordingId);
                
                // Update UI
                this.updateCommentCount(recordingId, data.commentCount);
                
                return data;
            } else {
                throw new Error('Failed to add comment');
            }
        } catch (error) {
            console.error('Error adding comment:', error);
            this.showError('فشل إرسال التعليق');
            return null;
        }
    }

    async deleteComment(commentId) {
        if (!this.currentUser) {
            return false;
        }

        try {
            const response = await fetch(`/api/battalooda/comment/${commentId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: this.currentUser.id })
            });

            if (response.ok) {
                return true;
            } else {
                throw new Error('Failed to delete comment');
            }
        } catch (error) {
            console.error('Error deleting comment:', error);
            return false;
        }
    }

    updateCommentCount(recordingId, count) {
        const commentBtn = document.querySelector(`.comment-btn[data-recording-id="${recordingId}"] span`);
        if (commentBtn) {
            commentBtn.textContent = count || 0;
        }
    }

    clearCommentCache(recordingId) {
        // Clear all cached comments for this recording
        for (const key of this.commentCache.keys()) {
            if (key.startsWith(`${recordingId}_`)) {
                this.commentCache.delete(key);
            }
        }
    }

    // Share functionality
    async shareRecording(recordingId, platform) {
        const recording = await this.getRecording(recordingId);
        if (!recording) return false;

        const shareData = {
            title: `استمع إلى هذا التسجيل من ${recording.user_name}`,
            text: `تسجيل صوتي مذهل من منصة بطلودة`,
            url: `${window.location.origin}/battalooda/recording/${recordingId}`
        };

        try {
            if (navigator.share && platform === 'native') {
                await navigator.share(shareData);
                return true;
            } else {
                // Fallback to social media sharing
                return this.shareToSocialMedia(recordingId, platform, shareData);
            }
        } catch (error) {
            console.error('Error sharing recording:', error);
            this.showError('فشل مشاركة التسجيل');
            return false;
        }
    }

    shareToSocialMedia(recordingId, platform, shareData) {
        const url = encodeURIComponent(shareData.url);
        const text = encodeURIComponent(shareData.text);
        
        let shareUrl = '';

        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
                break;
            case 'whatsapp':
                shareUrl = `https://api.whatsapp.com/send?text=${text}%20${url}`;
                break;
            case 'telegram':
                shareUrl = `https://t.me/share/url?url=${url}&text=${text}`;
                break;
            default:
                shareUrl = shareData.url;
        }

        window.open(shareUrl, '_blank');
        return true;
    }

    // User interactions
    async followUser(userId) {
        if (!this.currentUser) {
            this.showError('يجب تسجيل الدخول للمتابعة');
            return false;
        }

        try {
            const response = await fetch('/api/battalooda/follow', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId })
            });

            if (response.ok) {
                this.showSuccess('تمت المتابعة بنجاح');
                return true;
            } else {
                throw new Error('Failed to follow user');
            }
        } catch (error) {
            console.error('Error following user:', error);
            this.showError('فشل المتابعة');
            return false;
        }
    }

    async reportRecording(recordingId, reason) {
        if (!this.currentUser) {
            this.showError('يجب تسجيل الدخول للإبلاغ');
            return false;
        }

        if (!reason || reason.trim().length === 0) {
            this.showError('يرجى تحديد سبب الإبلاغ');
            return false;
        }

        try {
            const response = await fetch('/api/battalooda/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    recordingId, 
                    reason: reason.trim(),
                    userId: this.currentUser.id 
                })
            });

            if (response.ok) {
                this.showSuccess('تم الإبلاغ عن التسجيل');
                return true;
            } else {
                throw new Error('Failed to report recording');
            }
        } catch (error) {
            console.error('Error reporting recording:', error);
            this.showError('فشل الإبلاغ عن التسجيل');
            return false;
        }
    }

    // Notifications
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        // Add to DOM
        document.body.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    // Recording management
    async deleteRecording(recordingId) {
        if (!this.currentUser) {
            return false;
        }

        if (!confirm('هل أنت متأكد من حذف هذا التسجيل؟')) {
            return false;
        }

        try {
            const response = await fetch(`/api/battalooda/recording/${recordingId}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ userId: this.currentUser.id })
            });

            if (response.ok) {
                // Remove from DOM
                const card = document.querySelector(`.voice-card[data-id="${recordingId}"]`);
                if (card) {
                    card.remove();
                }
                
                this.showSuccess('تم حذف التسجيل بنجاح');
                return true;
            } else {
                throw new Error('Failed to delete recording');
            }
        } catch (error) {
            console.error('Error deleting recording:', error);
            this.showError('فشل حذف التسجيل');
            return false;
        }
    }

    // Real-time updates
    setupRealTimeUpdates() {
        // Setup WebSocket connection for real-time updates
        if (window.WebSocket) {
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            const ws = new WebSocket(`${protocol}//${location.host}/battalooda`);
            
            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.handleRealTimeUpdate(data);
            };

            ws.onclose = () => {
                // Reconnect after 5 seconds
                setTimeout(() => this.setupRealTimeUpdates(), 5000);
            };
        }
    }

    handleRealTimeUpdate(data) {
        switch (data.type) {
            case 'new_like':
                this.updateLikeButton(data.recordingId, true, data.likesCount);
                break;
            case 'new_comment':
                this.updateCommentCount(data.recordingId, data.commentCount);
                break;
            case 'new_recording':
                this.addNewRecordingToFeed(data.recording);
                break;
        }
    }

    addNewRecordingToFeed(recording) {
        const mainFeed = document.getElementById('mainFeed');
        const card = window.battaloodaApp.createVoiceCard(recording);
        
        // Add to top of feed
        mainFeed.insertBefore(card, mainFeed.firstChild);
        
        // Scroll to top
        mainFeed.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Utility methods
    async getRecording(recordingId) {
        try {
            const response = await fetch(`/api/battalooda/recording/${recordingId}`);
            if (response.ok) {
                return await response.json();
            }
        } catch (error) {
            console.error('Error getting recording:', error);
        }
        return null;
    }

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) {
            return 'الآن';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} دقيقة`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} ساعة`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} يوم`;
        }
    }

    sanitizeText(text) {
        // Basic HTML sanitization
        return text.replace(/[<>]/g, '');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SocialFeatures };
}
