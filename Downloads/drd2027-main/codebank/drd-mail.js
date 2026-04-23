/**
 * DRD-Mail - CodeBank Service
 * Secure messaging and email service
 */

class DRDMail {
    constructor() {
        this.currentFolder = 'inbox';
        this.currentEmail = null;
        this.viewMode = 'list'; // list or detail
        this.emails = this.initializeEmails();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.displayFolder('inbox');
    }

    setupEventListeners() {
        // Sidebar folders
        document.querySelectorAll('.folder-item').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchFolder(e.target.closest('.folder-item').dataset.folder));
        });

        // Compose button
        document.getElementById('composeBtn').addEventListener('click', () => this.openCompose());
        document.getElementById('closeCompose').addEventListener('click', () => this.closeCompose());
        document.getElementById('discardCompose').addEventListener('click', () => this.closeCompose());

        // Compose form
        document.getElementById('composeForm').addEventListener('submit', (e) => this.sendEmail(e));
        document.getElementById('saveDraft').addEventListener('click', () => this.saveDraft());

        // Mail list
        document.querySelectorAll('.mail-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.matches('input[type="checkbox"]')) {
                    this.viewEmail(parseInt(item.dataset.id));
                }
            });
        });

        // Back button
        document.getElementById('backBtn').addEventListener('click', () => this.backToList());

        // Refresh and settings
        document.getElementById('refreshBtn').addEventListener('click', () => this.refresh());
        document.getElementById('settingsBtn').addEventListener('click', () => this.openSettings());

        // Select all
        document.getElementById('selectAll').addEventListener('change', (e) => this.selectAll(e.target.checked));
    }

    initializeEmails() {
        return {
            inbox: [
                { id: 1, from: 'John Doe', subject: 'Re: Project Updates', date: 'Today', body: 'The updates look great!' },
                { id: 2, from: 'Jane Smith', subject: 'Meeting Scheduled for Tomorrow', date: 'Yesterday', body: 'Let\'s meet at 10 AM' },
                { id: 3, from: 'Tech Support', subject: 'Password Reset Confirmation', date: '2 days ago', body: 'Your password has been reset' },
                { id: 4, from: 'System Alert', subject: 'Security Update Available', date: '3 days ago', body: 'Please update your system' },
                { id: 5, from: 'Client Name', subject: 'Invoice #2024-001', date: '5 days ago', body: 'Payment due by 30th' }
            ],
            sent: [
                { id: 101, from: 'You', subject: 'Project Proposal', date: '3 days ago', body: 'Please review the attached proposal' },
                { id: 102, from: 'You', subject: 'Meeting Confirmation', date: '5 days ago', body: 'Confirmed for next week' }
            ],
            drafts: [
                { id: 201, from: 'Draft', subject: 'Important Update...', date: 'Today', body: 'Incomplete message' }
            ],
            starred: [],
            trash: [
                { id: 301, from: 'Spam Sender', subject: 'Limited Time Offer!', date: '1 day ago', body: 'Click here for amazing deals!' }
            ]
        };
    }

    switchFolder(folder) {
        this.currentFolder = folder;
        document.querySelectorAll('.folder-item').forEach(f => f.classList.remove('active'));
        document.querySelector(`[data-folder="${folder}"]`).classList.add('active');
        this.displayFolder(folder);
        if (this.viewMode === 'detail') {
            this.backToList();
        }
    }

    displayFolder(folder) {
        const mailList = document.getElementById('mailList');
        const emails = this.emails[folder] || [];

        if (emails.length === 0) {
            mailList.innerHTML = '<div class="empty-state">No messages in this folder</div>';
            return;
        }

        let html = `
            <div class="mail-list-header">
                <input type="checkbox" id="selectAll" title="Select all">
                <div class="list-col-from">From</div>
                <div class="list-col-subject">Subject</div>
                <div class="list-col-date">Date</div>
            </div>
        `;

        emails.forEach(email => {
            html += `
                <div class="mail-item" data-id="${email.id}">
                    <input type="checkbox">
                    <div class="list-col-from">${email.from}</div>
                    <div class="list-col-subject">${email.subject}</div>
                    <div class="list-col-date">${email.date}</div>
                </div>
            `;
        });

        mailList.innerHTML = html;

        // Reattach event listeners
        document.querySelectorAll('.mail-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.matches('input[type="checkbox"]')) {
                    this.viewEmail(parseInt(item.dataset.id));
                }
            });
        });

        document.getElementById('selectAll').addEventListener('change', (e) => this.selectAll(e.target.checked));
    }

    viewEmail(id) {
        const allEmails = Object.values(this.emails).flat();
        const email = allEmails.find(e => e.id === id);
        
        if (!email) return;

        this.currentEmail = email;
        this.viewMode = 'detail';

        const detail = document.getElementById('mailDetail');
        detail.style.display = 'block';
        document.getElementById('mailList').style.display = 'none';

        const content = document.getElementById('detailContent');
        content.innerHTML = `
            <div class="email-meta">
                <div class="meta-row">
                    <span class="meta-label">From:</span>
                    <span class="meta-value">${email.from}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Subject:</span>
                    <span class="meta-value">${email.subject}</span>
                </div>
                <div class="meta-row">
                    <span class="meta-label">Date:</span>
                    <span class="meta-value">${email.date}</span>
                </div>
            </div>

            <div class="email-body">
                <p>${email.body}</p>
            </div>
        `;
    }

    backToList() {
        this.viewMode = 'list';
        document.getElementById('mailDetail').style.display = 'none';
        document.getElementById('mailList').style.display = 'block';
        this.currentEmail = null;
    }

    openCompose() {
        document.getElementById('composeModal').style.display = 'flex';
    }

    closeCompose() {
        document.getElementById('composeModal').style.display = 'none';
        document.getElementById('composeForm').reset();
    }

    sendEmail(event) {
        event.preventDefault();
        const form = event.target;
        const to = form.querySelector('input[type="email"]').value;
        const subject = form.querySelector('input[type="text"]').value;

        alert(`Email sent to ${to}\nSubject: ${subject}\n\nIn a full implementation, this would send via SMTP or an email API.`);
        this.closeCompose();
    }

    saveDraft() {
        alert('Draft saved successfully!');
    }

    selectAll(checked) {
        document.querySelectorAll('.mail-item input[type="checkbox"]').forEach(cb => {
            cb.checked = checked;
        });
    }

    refresh() {
        alert('Checking for new messages...');
        // Simulate refresh
        console.log('[DRD-Mail] Refreshing...');
    }

    openSettings() {
        alert('Email Settings:\n\n- Auto-reply\n- Notifications\n- Signature\n- Storage\n\nSettings would open in a full implementation.');
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.drdMail = new DRDMail();
    console.log('[DRD-Mail] Initialized successfully');
});

// Close modal on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('composeModal');
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});
