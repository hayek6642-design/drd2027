/**
 * safe-code-manager.js - Safe Code Management System for CodeBank
 */

export function setupSafeSelect() {
    const LONG_MS = 600;
    const codeItems = document.querySelectorAll('.code-item');
    const sendButton = document.getElementById('send-selected-codes');
    const emailPopup = document.getElementById('email-popup');
    const emailInput = document.getElementById('receiver-email');
    const confirmSend = document.getElementById('confirm-send');
    const cancelSend = document.getElementById('cancel-send');

    const hasPopupUI = !!(emailPopup && emailInput && confirmSend);

    codeItems.forEach(item => {
        if(item.dataset.bound === 'true') return;
        item.dataset.bound = 'true';

        let checkbox = item.querySelector('.code-checkbox') || createCheckbox(item);
        let checkmark = item.querySelector('.code-check') || createCheckmark(item);

        let pressTimer = null;
        const startPress = () => {
            pressTimer = setTimeout(() => {
                checkbox.checked = true;
                checkmark.style.display = 'inline';
                updateSendButtonVisibility();
                showEmailPopup([item.dataset.code]);
            }, LONG_MS);
        };
        const endPress = () => {
            if(pressTimer){
                clearTimeout(pressTimer);
                checkbox.checked = !checkbox.checked;
                checkmark.style.display = checkbox.checked ? 'inline' : 'none';
                updateSendButtonVisibility();
            }
        };

        item.addEventListener('mousedown', startPress);
        item.addEventListener('mouseup', endPress);
        item.addEventListener('touchstart', startPress, { passive: true });
        item.addEventListener('touchend', endPress);
        checkbox.addEventListener('change', () => {
            checkmark.style.display = checkbox.checked ? 'inline' : 'none';
            updateSendButtonVisibility();
        });
    });

    function createCheckbox(item) {
        const cb = document.createElement('input');
        cb.type = 'checkbox'; cb.className = 'code-checkbox'; cb.style.display = 'none';
        item.appendChild(cb); return cb;
    }
    function createCheckmark(item) {
        const cm = document.createElement('span');
        cm.className = 'code-check'; cm.textContent = '✅'; cm.style.display = 'none'; cm.style.marginLeft = '10px';
        item.appendChild(cm); return cm;
    }

    function updateSendButtonVisibility(){
        const anyChecked = Array.from(document.querySelectorAll('.code-checkbox')).some(cb => cb.checked);
        if (sendButton) sendButton.style.display = anyChecked ? 'inline-block' : 'none';
    }

    if (sendButton) sendButton.onclick = () => {
        const selectedCodes = Array.from(document.querySelectorAll('.code-checkbox'))
                                   .filter(cb => cb.checked)
                                   .map(cb => cb.closest('.code-item').dataset.code);
        if (selectedCodes.length > 0) {
            window.BankodeBus?.emit?.({ type:'SEND_INIT', data:{ codes:selectedCodes.slice(), timestamp: Date.now() } });
            showEmailPopup(selectedCodes);
        }
    };

    function showEmailPopup(codes){
        if (!hasPopupUI) { window.showToast?.('Selection UI unavailable', 'warning'); return; }
        emailPopup.style.display = 'block'; emailInput.value = '';
        confirmSend.dataset.codes = JSON.stringify(codes);
    }

    if (confirmSend) confirmSend.onclick = async () => {
        const codes = JSON.parse(confirmSend.dataset.codes || '[]');
        const email = emailInput.value.trim();
        if(!email) return alert("Please enter a valid email");
        const txId = 'tx_' + Date.now() + '_' + Math.random().toString(16).slice(2);
        const tx = { id: txId, codes: codes.slice(), to: email, status: 'pending', syncStatus: 'queued', createdAt: Date.now() };
        window.Bankode?.storeTransaction?.(tx);
        window.BankodeBus?.emit?.({ type:'SEND_EXECUTE', data:{ codes: codes.slice(), to: email, txId, timestamp: Date.now() } });
        window.showToast?.('Send initiated');
        emailPopup.style.display = 'none'; updateSendButtonVisibility();

        const userId = (window.APP_AUTH?.user?.id) || (window.AUTH?.userId) || null;
        const sessionId = (window.APP_AUTH?.sessionId) || (window.AUTH?.sessionId) || null;
        const payload = { userId, sessionId, codes, receiverEmail: email, tab: window.ACTIVE_ASSET_TAB || 'codes', timestamp: Date.now() };

        try {
            const res = await fetch('/api/send-codes', { method:'POST', headers:{'Content-Type':'application/json','Idempotency-Key': txId}, credentials:'include', body: JSON.stringify(payload) });
            const data = await res.json().catch(()=>({}));
            if (res.ok && (data.ok || data.success)) {
                window.Bankode?.updateTx?.(txId, { status:'sent', syncStatus:'synced' });
                codes.forEach(code => document.querySelector(`.code-item[data-code="${code}"]`)?.remove());
                window.AssetBus?.removeAsset?.('codes', codes);
                window.dispatchEvent(new CustomEvent('assets:updated', { detail:{ source:'send-execute', snapshot: window.AssetBus?.snapshot?.() || {} } }));
            } else {
                window.Bankode?.updateTx?.(txId, { status:'pending', syncStatus:'failed' });
                window.Bankode?.queueTransaction?.(tx);
            }
        } catch(err){
            window.Bankode?.updateTx?.(txId, { status:'pending', syncStatus:'failed' });
            window.Bankode?.queueTransaction?.(tx);
        }
    };
    if (cancelSend) cancelSend.onclick = () => { if (emailPopup) emailPopup.style.display = 'none'; };
}
