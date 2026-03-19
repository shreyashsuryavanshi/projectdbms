document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    const headers = { 'Authorization': `Bearer ${token}` };

    // --- FETCH USER PROFILE ---
    try {
        const response = await fetch('/api/me', { headers });
        if (!response.ok) throw new Error('Unauthorized');
        
        const data = await response.json();
        const user = data.user;
        
        document.getElementById('welcomeMessage').textContent = `Hello, ${user.fullname}!`;
        document.getElementById('profileName').value = user.fullname;
        document.getElementById('profileEmail').value = user.email;
        
        // Setup floating labels visually
        document.querySelectorAll('.input-group input').forEach(input => {
            if(input.value) input.classList.add('has-value');
            input.addEventListener('input', () => {
                if (input.value.trim() !== '') input.classList.add('has-value');
                else input.classList.remove('has-value');
            });
        });
        
    } catch (error) {
        console.error('Auth error:', error);
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        window.location.href = 'index.html';
        return;
    }

    // --- PROFILE UPDATE ---
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const fullname = document.getElementById('profileName').value;
        const email = document.getElementById('profileEmail').value;
        const btn = document.getElementById('profileSubmit');
        
        btn.textContent = 'Updating...';
        try {
            const res = await fetch('/api/user', {
                method: 'PUT',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullname, email })
            });
            const data = await res.json();
            if(res.ok) {
                document.getElementById('welcomeMessage').textContent = `Hello, ${fullname}!`;
                btn.textContent = 'Saved!';
                btn.style.background = '#10b981';
                setTimeout(() => {
                    btn.textContent = 'Update Profile';
                    btn.style.background = '';
                }, 2000);
            } else {
                alert(data.error || 'Failed to update profile');
                btn.textContent = 'Update Profile';
            }
        } catch(e) {
            alert('Error updating profile');
            btn.textContent = 'Update Profile';
        }
    });

    // --- LOGOUT LOGIC & MODAL ---
    const logoutBtn = document.getElementById('logoutBtn');
    const logoutModal = document.getElementById('logoutModal');
    const cancelLogout = document.getElementById('cancelLogout');
    const confirmLogout = document.getElementById('confirmLogout');

    logoutBtn.addEventListener('click', () => logoutModal.classList.add('active'));
    cancelLogout.addEventListener('click', () => logoutModal.classList.remove('active'));
    confirmLogout.addEventListener('click', () => {
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        window.location.href = 'index.html';
    });

    // --- TODO LIST LOGIC ---
    const loadTodos = async () => {
        try {
            const res = await fetch('/api/todos', { headers });
            const data = await res.json();
            const list = document.getElementById('todoList');
            list.innerHTML = '';
            
            data.todos.forEach(todo => {
                const li = document.createElement('li');
                if(todo.completed) li.classList.add('completed');
                
                li.innerHTML = `
                    <span>${todo.task}</span>
                    <div class="actions">
                        <button class="check-btn" onclick="toggleTodo(${todo.id}, ${!todo.completed})">✓</button>
                        <button class="del-btn" onclick="deleteTodo(${todo.id})">✕</button>
                    </div>
                `;
                list.appendChild(li);
            });
        } catch(e) { console.error('Error loading todos', e); }
    };

    window.toggleTodo = async (id, status) => {
        await fetch(`/api/todos/${id}`, {
            method: 'PUT',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ completed: status })
        });
        loadTodos();
    };

    window.deleteTodo = async (id) => {
        await fetch(`/api/todos/${id}`, { method: 'DELETE', headers });
        loadTodos();
    };

    document.getElementById('todoForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('todoInput');
        if(!input.value.trim()) return;
        
        await fetch('/api/todos', {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ task: input.value })
        });
        input.value = '';
        loadTodos();
    });

    loadTodos();

    // --- FILE UPLOAD LOGIC ---
    const uploadForm = document.getElementById('uploadForm');
    const fileInput = document.getElementById('fileInput');
    const uploadBtn = document.getElementById('uploadBtn');
    const uploadResult = document.getElementById('uploadResult');
    const uploadStatusText = document.getElementById('uploadStatusText');

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if(!fileInput.files[0]) return;

        const formData = new FormData();
        formData.append('file', fileInput.files[0]);
        
        uploadBtn.textContent = 'Uploading...';
        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }, // Do not set Content-Type header with FormData, browser does it (with boundary)
                body: formData
            });
            const data = await res.json();
            
            if(res.ok) {
                uploadResult.innerHTML = `Success! <a href="${data.fileUrl}" target="_blank" style="color:var(--primary);text-decoration:underline;">View File</a>`;
                uploadStatusText.textContent = "Upload another file";
                fileInput.value = ''; // Reset
            } else {
                uploadResult.textContent = 'Upload failed: ' + data.error;
            }
        } catch(e) {
            uploadResult.textContent = 'Network error during upload.';
        } finally {
            uploadBtn.textContent = 'Upload';
        }
    });

    // --- FILE DRAG & DROP UI FEEDBACK ---
    const uploadArea = document.querySelector('.upload-area');
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = 'var(--primary)';
        uploadArea.style.background = 'rgba(99,102,241,0.1)';
    });
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.style.borderColor = '';
        uploadArea.style.background = '';
    });
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.style.borderColor = '';
        uploadArea.style.background = '';
        if(e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            uploadStatusText.textContent = `Ready: ${fileInput.files[0].name}`;
        }
    });
    fileInput.addEventListener('change', () => {
        if(fileInput.files.length) {
            uploadStatusText.textContent = `Ready: ${fileInput.files[0].name}`;
        }
    });

    // --- AI CHATBOT LOGIC ---
    const chatToggle = document.getElementById('chatToggle');
    const chatBody = document.getElementById('chatBody');
    const chatHeader = document.getElementById('chatHeader');
    const chatForm = document.getElementById('chatForm');
    const chatInput = document.getElementById('chatInput');
    const chatMessages = document.getElementById('chatMessages');

    chatHeader.addEventListener('click', () => {
        chatBody.classList.toggle('collapsed');
        chatToggle.textContent = chatBody.classList.contains('collapsed') ? '▲' : '▼';
    });

    const appendMessage = (text, sender) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-msg ${sender}`;
        msgDiv.textContent = text;
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const text = chatInput.value.trim();
        if(!text) return;

        appendMessage(text, 'user');
        chatInput.value = '';

        // Add loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'chat-msg bot loading-msg';
        loadingDiv.textContent = '...';
        chatMessages.appendChild(loadingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { ...headers, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: text })
            });
            const data = await res.json();
            
            loadingDiv.remove();
            
            if(res.ok) {
                appendMessage(data.reply, 'bot');
            } else {
                appendMessage("Error reaching AI service.", 'bot');
            }
        } catch(e) {
            loadingDiv.remove();
            appendMessage("Network error.", 'bot');
        }
    });
});
