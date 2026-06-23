document.addEventListener('DOMContentLoaded', () => {
    
    // Module: Live System Telemetry (Chart.js)
    const ctx = document.getElementById('liveSystemChart');
    if (ctx && window.Chart) {
        const sysChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(30).fill(''),
                datasets: [
                    { label: 'CPU Usage (%)', data: Array(30).fill(0), borderColor: '#00ff41', backgroundColor: 'rgba(0, 255, 65, 0.1)', fill: true, tension: 0.4 },
                    { label: 'RAM Usage (%)', data: Array(30).fill(0), borderColor: '#00ffff', backgroundColor: 'rgba(0, 255, 255, 0.1)', fill: true, tension: 0.4 }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                animation: { duration: 0 },
                plugins: { legend: { labels: { color: '#e0e0e0', font: { family: 'JetBrains Mono' } } } },
                scales: { 
                    y: { min: 0, max: 100, grid: { color: '#1a1a24' }, ticks: { color: '#808080' } },
                    x: { grid: { color: '#1a1a24' } }
                } 
            }
        });
        
        setInterval(async () => {
            if (window.electronAPI) {
                const stats = await window.electronAPI.getSystemStats();
                sysChart.data.datasets[0].data.shift();
                sysChart.data.datasets[0].data.push(stats.cpu);
                sysChart.data.datasets[1].data.shift();
                sysChart.data.datasets[1].data.push(stats.ram);
                sysChart.update();
            }
        }, 1000);
    }

    // Module: Navigation Handling
    const navLinks = document.querySelectorAll('.nav-links li');
    const sections = document.querySelectorAll('.tool-section');

    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            const targetId = link.getAttribute('data-target');
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            sections.forEach(sec => {
                if(sec.id === targetId) sec.classList.remove('hidden');
                else sec.classList.add('hidden');
            });
        });
    });

    // Module: Clipboard Utilities
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const targetId = btn.getAttribute('data-copy-target');
            const el = document.getElementById(targetId);
            if(el) {
                navigator.clipboard.writeText(el.innerText || el.value);
                const icon = btn.querySelector('i');
                icon.className = 'fa-solid fa-check';
                icon.style.color = 'var(--accent-primary)';
                setTimeout(() => {
                    icon.className = 'fa-solid fa-copy';
                    icon.style.color = '';
                }, 2000);
            }
        });
    });

    // Module: Password Strength Evaluation & Leak Checking
    const pwdInput = document.getElementById('pwd-input');
    const pwdBar = document.getElementById('pwd-strength-bar');
    const pwdStatus = document.getElementById('pwd-status');
    const pwdFeedback = document.getElementById('pwd-feedback');
    const pwdLeakStatus = document.getElementById('pwd-leak-status');
    const togglePwd = document.getElementById('toggle-pwd-visibility');
    let leakCheckTimeout;

    togglePwd.addEventListener('click', () => {
        if(pwdInput.type === 'password') {
            pwdInput.type = 'text';
            togglePwd.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
        } else {
            pwdInput.type = 'password';
            togglePwd.innerHTML = '<i class="fa-solid fa-eye"></i>';
        }
    });

    pwdInput.addEventListener('input', () => {
        const val = pwdInput.value;
        let score = 0;
        let feedback = [];

        clearTimeout(leakCheckTimeout);
        pwdLeakStatus.innerHTML = '';

        if(val.length === 0) {
            pwdBar.style.width = '0%';
            pwdStatus.innerText = 'Strength: None';
            pwdFeedback.innerHTML = '';
            return;
        }

        if(val.length > 8) { score += 20; feedback.push({msg: "Length > 8", good: true}); }
        else { feedback.push({msg: "Too short (< 8 chars)", good: false}); }
        if(val.length > 12) { score += 10; feedback.push({msg: "Length > 12", good: true}); }
        if(/[A-Z]/.test(val)) { score += 20; feedback.push({msg: "Contains uppercase", good: true}); }
        else { feedback.push({msg: "Missing uppercase", good: false}); }
        if(/[0-9]/.test(val)) { score += 20; feedback.push({msg: "Contains numbers", good: true}); }
        else { feedback.push({msg: "Missing numbers", good: false}); }
        if(/[^A-Za-z0-9]/.test(val)) { score += 30; feedback.push({msg: "Contains symbols", good: true}); }
        else { feedback.push({msg: "Missing special symbols", good: false}); }

        let color = '', label = '', badgeClass = '';
        if(score < 40) { color = 'var(--text-alert)'; label = 'Weak'; badgeClass = 'badge-alert'; pwdBar.style.width = '33%'; }
        else if (score < 80) { color = 'var(--text-warn)'; label = 'Moderate'; badgeClass = 'badge-warn'; pwdBar.style.width = '66%'; }
        else { color = 'var(--text-safe)'; label = 'Strong'; badgeClass = 'badge-safe'; pwdBar.style.width = '100%'; }

        pwdBar.style.backgroundColor = color;
        pwdStatus.innerHTML = `Strength: <span class="badge ${badgeClass}">${label}</span>`;
        pwdFeedback.innerHTML = feedback.map(f => `<li class="${f.good ? 'good' : 'bad'}">${f.msg}</li>`).join('');

        // HIBP Leak Checking
        if (window.electronAPI) {
            pwdLeakStatus.innerHTML = '<span class="badge badge-warn">Checking leaks...</span>';
            leakCheckTimeout = setTimeout(async () => {
                const res = await window.electronAPI.checkPasswordLeak(val);
                if (res.success) {
                    if (res.leaked) {
                        pwdLeakStatus.innerHTML = `<span class="badge badge-alert">Compromised</span> This password has been seen ${res.count} times in known data breaches! Do not use it.`;
                    } else {
                        pwdLeakStatus.innerHTML = `<span class="badge badge-safe">Secure</span> No known data breaches found.`;
                    }
                } else {
                    pwdLeakStatus.innerHTML = `Error checking leaks: ${res.error}`;
                }
            }, 800); // debounce
        }
    });

    // Module: Cryptographic File Hashing & Integrity
    const btnHashFile = document.createElement('button');
    btnHashFile.className = 'primary-btn';
    btnHashFile.innerText = 'Select File to Hash';
    btnHashFile.style.marginTop = '15px';
    document.getElementById('file-drop-area').appendChild(btnHashFile);

    btnHashFile.addEventListener('click', async () => {
        if (!window.electronAPI) return alert('Running outside Electron!');
        
        document.getElementById('hash-sha256').innerText = 'Calculating...';
        document.getElementById('hash-sha1').innerText = 'Calculating...';
        document.getElementById('hash-results').classList.remove('hidden');
        document.getElementById('hash-match-status').innerHTML = '';

        const expectedHash = document.getElementById('expected-hash').value.trim().toLowerCase();
        const result = await window.electronAPI.hashFile();
        
        if (result.success) {
            document.getElementById('hash-filename').innerText = result.filename;
            document.getElementById('hash-filesize').innerText = (result.filesize / 1024 / 1024).toFixed(2) + ' MB';
            document.getElementById('hash-sha256').innerText = result.sha256;
            document.getElementById('hash-sha1').innerText = result.sha1;

            if (expectedHash) {
                if (expectedHash === result.sha256 || expectedHash === result.sha1 || expectedHash === result.md5) {
                    document.getElementById('hash-match-status').innerHTML = '<span class="badge badge-safe">Integrity Verified</span> Hash matches expected value.';
                } else {
                    document.getElementById('hash-match-status').innerHTML = '<span class="badge badge-alert">Tampered / Mismatch</span> Hash does NOT match expected value!';
                }
            }
        } else {
            document.getElementById('hash-results').classList.add('hidden');
            if (result.error !== 'User canceled') alert('Error: ' + result.error);
        }
    });

    // Module: Heuristic URL Analysis
    const btnCheckUrl = document.getElementById('btn-check-url');
    btnCheckUrl.addEventListener('click', () => {
        const urlString = document.getElementById('url-input').value;
        const resDiv = document.getElementById('url-results');
        const statusEl = document.getElementById('url-status');
        const feedbackEl = document.getElementById('url-feedback');
        const scoreText = document.getElementById('url-score-text');
        
        if(!urlString) return;
        resDiv.classList.remove('hidden');

        let isSafe = true, score = 10, reasons = [];
        try {
            const url = new URL(urlString.startsWith('http') ? urlString : 'http://' + urlString);
            if (url.protocol !== 'https:') { isSafe = false; score -= 4; reasons.push({msg: "Uses HTTP (Not encrypted)", good: false}); }
            else { reasons.push({msg: "Uses HTTPS (Encrypted)", good: true}); }

            if (/^([0-9]{1,3}\.){3}[0-9]{1,3}$/.test(url.hostname)) { isSafe = false; score -= 5; reasons.push({msg: "Hostname is an IP address", good: false}); }
            if (url.hostname.length > 50) { isSafe = false; score -= 2; reasons.push({msg: "Unusually long hostname", good: false}); }

            let charCount = 0;
            ['@', '-', '_'].forEach(c => charCount += (url.hostname.match(new RegExp(`\\${c}`, 'g')) || []).length);
            if (charCount > 3) { isSafe = false; score -= 2; reasons.push({msg: "Multiple special characters in domain", good: false}); }
        } catch (e) {
            score = 0; isSafe = false; reasons.push({msg: "Malformed URL", good: false});
        }

        scoreText.innerText = `${Math.max(0, score)}/10`;
        
        if (score >= 8) statusEl.innerHTML = `<span class="badge badge-safe">Likely Safe</span>`;
        else if (score >= 5) statusEl.innerHTML = `<span class="badge badge-warn">Suspicious</span>`;
        else statusEl.innerHTML = `<span class="badge badge-alert">High Risk</span>`;

        feedbackEl.innerHTML = reasons.map(f => `<li class="${f.good ? 'good' : 'bad'}">${f.msg}</li>`).join('');
    });

    // Module: Network Diagnostics
    const btnNetScan = document.getElementById('btn-fetch-network');
    btnNetScan.innerText = "Run Local Ping Sweep (Subnet)";
    const netResultsContainer = document.getElementById('network-results');
    netResultsContainer.innerHTML = `
        <div class="input-group">
            <input type="text" id="ping-target" placeholder="Enter IP (e.g. 8.8.8.8) or Domain" value="1.1.1.1">
            <button id="exec-ping" class="primary-btn">PING</button>
        </div>
        <div id="net-terminal" class="terminal-output">Waiting for command...</div>
    `;

    document.getElementById('exec-ping').addEventListener('click', async () => {
        if (!window.electronAPI) return;
        const target = document.getElementById('ping-target').value;
        const term = document.getElementById('net-terminal');
        netResultsContainer.classList.remove('hidden');
        term.innerText = `> ping ${target}\nExecuting...`;
        const res = await window.electronAPI.networkScan(target);
        if (res.success) term.innerText += `\n${res.output}`;
        else term.innerText += `\n[ERROR] ${res.error}\n${res.output || ''}`;
    });

    btnNetScan.addEventListener('click', async () => {
         if (!window.electronAPI) return;
         const term = document.getElementById('net-terminal');
         netResultsContainer.classList.remove('hidden');
         term.innerText = `> Fetching local interfaces...\n`;
         const res = await window.electronAPI.networkScan(null);
         if (res.success) {
             term.innerText += `Hostname: ${res.hostname}\n\n${JSON.stringify(res.interfaces, null, 2)}`;
         }
    });

    // Module: AES-256-GCM Encryption
    const encTabs = document.querySelectorAll('[data-enc-tab]');
    encTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            encTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            if(tab.getAttribute('data-enc-tab') === 'encrypt') {
                document.getElementById('enc-encrypt-tab').classList.remove('hidden');
                document.getElementById('enc-decrypt-tab').classList.add('hidden');
            } else {
                document.getElementById('enc-decrypt-tab').classList.remove('hidden');
                document.getElementById('enc-encrypt-tab').classList.add('hidden');
            }
            document.getElementById('crypto-results').classList.add('hidden');
        });
    });

    document.getElementById('btn-encrypt').addEventListener('click', async () => {
        if (!window.electronAPI) return;
        const text = document.getElementById('enc-input-text').value;
        const pass = document.getElementById('enc-password').value;
        if (!text || !pass) return;
        const res = await window.electronAPI.encryptText(text, pass);
        if (res.success) {
            document.getElementById('crypto-results').classList.remove('hidden');
            document.getElementById('crypto-result-label').innerHTML = '<span class="badge badge-safe">Encrypted Ciphertext (AES-256-GCM)</span>';
            document.getElementById('crypto-output').innerText = res.result;
        }
    });

    document.getElementById('btn-decrypt').addEventListener('click', async () => {
        if (!window.electronAPI) return;
        const text = document.getElementById('dec-input-text').value;
        const pass = document.getElementById('dec-password').value;
        if (!text || !pass) return;
        const res = await window.electronAPI.decryptText(text, pass);
        if (res.success) {
            document.getElementById('crypto-results').classList.remove('hidden');
            document.getElementById('crypto-result-label').innerHTML = '<span class="badge badge-safe">Decrypted Plaintext</span>';
            document.getElementById('crypto-output').innerText = res.result;
        } else {
            alert(res.error);
        }
    });
});
