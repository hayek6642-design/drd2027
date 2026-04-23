// codebank-usage-tracker.js
// Unified usage tracker for all CodeBank services
// Updated: charge ONLY logged-in users, guests = free usage

// ----------------------------
// CONFIG
// ----------------------------
const CODEBANK_USAGE_API = null;
const SUPABASE_ANON_KEY = null;

 

// ----------------------------
// Supabase insert helper
// ----------------------------
async function logUsageToSupabase(data) { return { ok:false, status:404 } }

// ----------------------------
// SERVICE LIST — all CodeBank tabs
// ----------------------------
const CodebankServices = {
    "Samma3ny": { hourly: true },
    "Farragna": { hourly: true },
    "E7ki!": { hourly: true },
    "OneWorld": { hourly: true },
    "Community": { hourly: true },
    "Games-centre": { hourly: true },
    "CoRsA": { hourly: true },
    
    "Piston": { hourly: false }
};

let activeTimers = {};

// ----------------------------
// ON TAB CLICK — charge 1 code (only if logged in)
// ----------------------------
async function onServiceOpened(userId, serviceName) {

    console.log(`Opened: ${serviceName}`);

    // GUEST USER → free, exit function
    if (isGuest(userId)) {
        console.log(`Guest user → no charge for ${serviceName}`);
        return;
    }

    // 1) Charge 1 code immediately
    console.log('[Usage] click_charge blocked for', serviceName);

    // 2) start hourly charge if enabled
    if (CodebankServices[serviceName].hourly) {
        startHourlyCharge(userId, serviceName);
    }
}

// ----------------------------
// HOURLY CHARGE — only for logged in users
// ----------------------------
function startHourlyCharge(userId, serviceName) {
    stopHourlyCharge(serviceName);
    activeTimers[serviceName] = null;
}

function stopHourlyCharge(serviceName) {
    if (activeTimers[serviceName]) {
        clearInterval(activeTimers[serviceName]);
        delete activeTimers[serviceName];
    }
}

window.addEventListener("blur", () => {
    Object.keys(activeTimers).forEach(service => stopHourlyCharge(service));
});

window.CodeBankUsage = {
    onServiceOpened,
    stopHourlyCharge
};
