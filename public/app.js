const form = document.getElementById('campaignForm');
const loadBtn = document.getElementById('loadBtn');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resumeBtn = document.getElementById('resumeBtn');
const clearBtn = document.getElementById('clearBtn');
const tableBody = document.querySelector('#numbersTable tbody');
let pollInterval;

// Load New Campaign
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const fileInput = document.getElementById('csvFile');
    if (!fileInput.files.length) {
        alert("Please select a CSV file to load.");
        return;
    }

    const formData = new FormData(form);
    
    try {
        loadBtn.disabled = true;
        const response = await fetch('/api/load', {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (!response.ok) {
            alert(`Error: ${data.error}`);
            loadBtn.disabled = false;
            return;
        }
        
        fileInput.value = ''; // clear input
        startPolling();
    } catch (error) {
        alert('Failed to connect to the server.');
        loadBtn.disabled = false;
    }
});

// Start Campaign
startBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/start', { method: 'POST' });
        
        if (!response.ok) {
            const data = await response.json();
            alert(`Error: ${data.error}`);
            return;
        }
        
        startPolling();
    } catch (error) {
        alert('Failed to start.');
    }
});

// Pause Campaign
pauseBtn.addEventListener('click', async () => {
    try {
        await fetch('/api/pause', { method: 'POST' });
        pauseBtn.disabled = true;
        updateStatus(); // force immediate update
    } catch (error) {
        alert('Failed to send pause signal.');
    }
});

// Resume Campaign
resumeBtn.addEventListener('click', async () => {
    try {
        const response = await fetch('/api/start', { method: 'POST' });
        
        if (!response.ok) {
            const data = await response.json();
            alert(`Error: ${data.error}`);
            return;
        }
        
        resumeBtn.style.display = 'none';
        pauseBtn.style.display = 'block';
        startPolling();
    } catch (error) {
        alert('Failed to resume.');
    }
});

// Clear Campaign List
clearBtn.addEventListener('click', async () => {
    if (!confirm("Are you sure you want to clear the list? This will remove all loaded and processed numbers.")) return;
    
    try {
        const response = await fetch('/api/clear', { method: 'POST' });
        
        if (!response.ok) {
            const data = await response.json();
            alert(`Error: ${data.error}`);
            return;
        }
        
        updateStatus();
    } catch (error) {
        alert('Failed to clear list.');
    }
});

function startPolling() {
    if (pollInterval) clearInterval(pollInterval);
    updateStatus();
    pollInterval = setInterval(updateStatus, 2000);
}

function renderTable(items) {
    tableBody.innerHTML = '';
    
    // We get max 500 items to not freeze the DOM.
    items.forEach(item => {
        const tr = document.createElement('tr');
        tr.className = item.status;
        
        let statusBadge = `<span class="badge ${item.status}">${item.status.toUpperCase()}</span>`;
        
        tr.innerHTML = `
            <td>${item.id + 1}</td>
            <td>${item.phone}</td>
            <td>${statusBadge}</td>
            <td>${item.error || '-'}</td>
        `;
        tableBody.appendChild(tr);
    });
}

async function updateStatus() {
    try {
        const response = await fetch('/api/status');
        const state = await response.json();
        
        // Update Stats
        document.getElementById('statTotal').innerText = state.stats.total;
        document.getElementById('statPending').innerText = state.stats.pending;
        document.getElementById('statSent').innerText = state.stats.sent;
        document.getElementById('statFailed').innerText = state.stats.failed;
        
        // Format Status Text
        let statusText = state.status.toUpperCase();
        if (state.status === 'paused_batch') statusText = 'PAUSING FOR BATCH LIMIT';
        document.getElementById('currentStatus').innerText = statusText;
        
        // Update Progress Bar
        const processed = state.stats.sent + state.stats.failed;
        let percentage = 0;
        if (state.stats.total > 0) {
            percentage = Math.floor((processed / state.stats.total) * 100);
        }
        document.getElementById('progressBar').style.width = `${percentage}%`;
        
        // Render Table
        renderTable(state.items);

        // Update Buttons Based on State
        if (state.status === 'loaded') {
            loadBtn.disabled = false;
            startBtn.disabled = false;
            startBtn.style.display = 'block';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'none';
            clearBtn.disabled = false;
        } else if (state.status === 'running' || state.status === 'paused_batch') {
            loadBtn.disabled = true;
            startBtn.disabled = true;
            startBtn.style.display = 'none';
            pauseBtn.disabled = false;
            pauseBtn.style.display = 'block';
            resumeBtn.style.display = 'none';
            clearBtn.disabled = true;
        } else if (state.status === 'paused') {
            loadBtn.disabled = false;
            startBtn.disabled = true;
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'none';
            resumeBtn.style.display = 'block';
            resumeBtn.disabled = false;
            clearBtn.disabled = false;
            if (pollInterval) clearInterval(pollInterval); // Stop polling when paused
        } else if (state.status === 'completed' || state.status === 'idle') {
            loadBtn.disabled = false;
            startBtn.disabled = true;
            startBtn.style.display = 'none';
            pauseBtn.style.display = 'block';
            pauseBtn.disabled = true;
            resumeBtn.style.display = 'none';
            clearBtn.disabled = (state.stats.total === 0); // Only disable clear if list is already empty
            if (pollInterval && state.status !== 'idle') clearInterval(pollInterval);
        }
    } catch (error) {
        console.error("Error fetching status:", error);
    }
}

// Initial fetch on page load
updateStatus();
startPolling(); // Keep polling initially to catch any running background state
