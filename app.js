document.addEventListener('DOMContentLoaded', () => {
    // --- 核心變數與配置 ---
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbzBWXpjzWSt9I4zik7rnDCEbnSIH922PX-GYe8s64XkEdQynbHMJuFuyWaUoMEEbPbH/exec';
    let currentCount = 0;
    let batchData = [];
    let allAttendees = [];

    // --- 1. 初始化級數選單 ---
    function initGradYearSelects() {
        const selects = ['gradYear', 'filterGradYear'];
        selects.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                // 清空除了第一個選項以外的內容
                while (el.options.length > 1) el.remove(1);
                for (let i = 115; i >= 75; i--) {
                    const option = document.createElement('option');
                    option.value = i + '級';
                    option.textContent = i + '級';
                    el.appendChild(option);
                }
            }
        });
    }

    // --- 2. 報名表單邏輯 ---
    function initRegistrationForm() {
        const regForm = document.getElementById('regForm');
        const attendBanquet = document.getElementById('attendBanquet');
        const banquetDetails = document.getElementById('banquetDetails');
        const guestsSelect = document.getElementById('guests');
        const guestDietGroup = document.getElementById('guestDietGroup');

        if (attendBanquet && banquetDetails) {
            attendBanquet.addEventListener('change', () => {
                banquetDetails.style.display = attendBanquet.checked ? 'block' : 'none';
                if (attendBanquet.checked) {
                    banquetDetails.style.opacity = '0';
                    setTimeout(() => {
                        banquetDetails.style.transition = 'opacity 0.5s ease';
                        banquetDetails.style.opacity = '1';
                    }, 10);
                }
            });
        }

        if (guestsSelect && guestDietGroup) {
            guestsSelect.addEventListener('change', () => {
                guestDietGroup.style.display = parseInt(guestsSelect.value) > 0 ? 'block' : 'none';
            });
        }

        if (regForm) {
            regForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const submitBtn = regForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerText;
                submitBtn.innerText = '正在提交資料...';
                submitBtn.disabled = true;

                try {
                    const formData = new FormData(regForm);
                    const data = Object.fromEntries(formData.entries());
                    await fetch(GAS_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        body: JSON.stringify(data)
                    });
                    submitBtn.innerText = '✅ 報名成功！';
                    submitBtn.style.background = '#28a745';
                    setTimeout(() => {
                        alert('感謝您的報名！');
                        regForm.reset();
                        if (banquetDetails) banquetDetails.style.display = 'none';
                        submitBtn.innerText = originalText;
                        submitBtn.style.background = '';
                        submitBtn.disabled = false;
                        fetchStats();
                    }, 1500);
                } catch (error) {
                    console.error('提交失敗:', error);
                    alert('提交時出現錯誤，請稍後再試。');
                    submitBtn.innerText = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
    }

    // --- 3. 數據獲取與統計 UI ---
    async function fetchStats() {
        try {
            const cacheBuster = `?t=${new Date().getTime()}`;
            const response = await fetch(GAS_URL + cacheBuster);
            if (!response.ok) throw new Error('網路回應不正確');
            const data = await response.json();
            
            currentCount = data.total || 0;
            batchData = data.batchData || [];
            allAttendees = data.attendees || [];
            
            updateStatsUI();
            renderAttendeeList();
        } catch (error) {
            console.error('統計數據讀取失敗:', error);
            const errorEls = ['hero-count', 'reg-count'];
            errorEls.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerText = '--';
            });
        }
    }

    function updateStatsUI() {
        const animate = (id, target) => {
            const el = document.getElementById(id);
            if (!el) return;
            let start = parseInt(el.innerText) || 0;
            let startTime = null;
            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                let progress = Math.min((timestamp - startTime) / 1000, 1);
                el.innerText = Math.floor(progress * (target - start) + start);
                if (progress < 1) window.requestAnimationFrame(step);
            }
            window.requestAnimationFrame(step);
        };

        animate('hero-count', currentCount);
        animate('reg-count', currentCount);

        const batchBarsEl = document.getElementById('batch-bars');
        const leadingBatchEl = document.getElementById('leading-batch');
        if (batchBarsEl && batchData.length > 0) {
            const sorted = [...batchData].sort((a, b) => b.count - a.count);
            if (leadingBatchEl) leadingBatchEl.innerText = sorted[0].batch;
            const maxCount = sorted[0].count;
            batchBarsEl.innerHTML = sorted.slice(0, 5).map(item => `
                <div class="batch-bar-item">
                    <div class="batch-label">${item.batch}</div>
                    <div class="batch-progress-wrap">
                        <div class="batch-progress-fill" style="width: ${(item.count / maxCount) * 100}%"></div>
                    </div>
                    <div class="batch-count">${item.count}</div>
                </div>
            `).join('');
        }
    }

    // --- 4. 出席名單渲染 ---
    function renderAttendeeList() {
        const attendeeGrid = document.getElementById('attendeeGrid');
        const noResults = document.getElementById('noResults');
        const searchName = document.getElementById('searchName');
        const filterGradYear = document.getElementById('filterGradYear');
        
        if (!attendeeGrid) return;

        const searchText = searchName ? searchName.value.trim().toLowerCase() : '';
        const selectedBatch = filterGradYear ? filterGradYear.value : '';

        if (allAttendees.length === 0) {
            if (currentCount > 0) {
                attendeeGrid.innerHTML = `
                    <div class="info-msg">
                        <p>📍 目前已有 ${currentCount} 位隊友報名</p>
                        <p><small>詳細名單同步中 (需 GAS 回傳 attendees 欄位)。</small></p>
                    </div>`;
            } else {
                attendeeGrid.innerHTML = '<div class="info-msg">目前尚無報名資料</div>';
            }
            if (noResults) noResults.classList.add('hidden');
            return;
        }

        const filtered = allAttendees.filter(person => {
            const matchesSearch = !searchText || (person.name && person.name.toLowerCase().includes(searchText));
            const matchesBatch = !selectedBatch || (person.gradYear === selectedBatch);
            return matchesSearch && matchesBatch;
        });

        if (filtered.length > 0) {
            if (noResults) noResults.classList.add('hidden');
            attendeeGrid.innerHTML = '<div class="attendee-grid-inner">' + filtered.map((person, index) => `
                <div class="attendee-card" style="animation-delay: ${Math.min(index * 0.05, 1)}s">
                    <div class="attendee-name">${person.name || '未知名稱'}</div>
                    <div class="attendee-batch">${person.gradYear || '未知'}</div>
                </div>
            `).join('') + '</div>';
        } else {
            attendeeGrid.innerHTML = '';
            if (noResults) {
                noResults.classList.remove('hidden');
                noResults.innerHTML = selectedBatch ? `找不到符合 <strong>${selectedBatch}</strong> 的隊友` : `找不到符合條件的隊友`;
            }
        }
    }

    // --- 5. 導覽與 UI 效果 ---
    function initUIEffects() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            });
        });

        window.addEventListener('scroll', () => {
            const nav = document.querySelector('.glass-nav');
            if (nav) {
                nav.style.padding = window.scrollY > 50 ? '10px 0' : '20px 0';
                nav.style.background = window.scrollY > 50 ? 'rgba(0, 31, 63, 0.95)' : 'rgba(0, 31, 63, 0.8)';
            }
        });

        const menuToggle = document.getElementById('menuToggle');
        const navLinks = document.getElementById('navLinks');
        if (menuToggle && navLinks) {
            menuToggle.addEventListener('click', () => {
                menuToggle.classList.toggle('active');
                navLinks.classList.toggle('active');
            });
            navLinks.querySelectorAll('a').forEach(link => {
                link.addEventListener('click', () => {
                    menuToggle.classList.remove('active');
                    navLinks.classList.remove('active');
                });
            });
        }
    }

    // --- 6. 管理後台邏輯 ---
    function initAdminPanel() {
        const trigger = document.getElementById('adminTrigger');
        const panel = document.getElementById('adminPanel');
        const closeBtn = document.getElementById('closeAdmin');
        const saveBtn = document.getElementById('saveAdmin');
        const listContainer = document.getElementById('admin-items-list');

        if (!trigger || !panel) return;

        const defaultItems = [
            { id: 1, name: '募款進度', status: '已達標', progress: 100 },
            { id: 2, name: '晚宴籌劃', status: '已訂位', progress: 70 },
            { id: 3, name: '紀念品製作', status: '設計中', progress: 40 },
            { id: 4, name: '休息區佈置', status: '規劃中', progress: 40 },
            { id: 5, name: '攝影紀錄', status: '已確認', progress: 60 }
        ];

        let items = JSON.parse(localStorage.getItem('rugby_progress_data')) || defaultItems;

        const syncUI = () => {
            const uiItems = document.querySelectorAll('.progress-item');
            items.forEach((item, i) => {
                if (uiItems[i]) {
                    const tag = uiItems[i].querySelector('.status-tag');
                    const bar = uiItems[i].querySelector('.progress-bar');
                    if (tag) tag.innerText = item.status;
                    if (bar) bar.style.width = item.progress + '%';
                }
            });
        };

        syncUI();

        trigger.addEventListener('click', () => {
            panel.style.display = 'block';
            if (listContainer) {
                listContainer.innerHTML = items.map(item => `
                    <div class="admin-item-edit">
                        <label>${item.name}</label>
                        <input type="text" value="${item.status}" class="status-input">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <input type="range" min="0" max="100" value="${item.progress}" class="ps">
                            <span>${item.progress}%</span>
                        </div>
                    </div>
                `).join('');
                listContainer.querySelectorAll('.ps').forEach(s => {
                    s.addEventListener('input', e => e.target.nextElementSibling.innerText = e.target.value + '%');
                });
            }
        });

        if (closeBtn) closeBtn.addEventListener('click', () => panel.style.display = 'none');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const edits = panel.querySelectorAll('.admin-item-edit');
                edits.forEach((edit, i) => {
                    items[i].status = edit.querySelector('.status-input').value;
                    items[i].progress = parseInt(edit.querySelector('.ps').value);
                });
                localStorage.setItem('rugby_progress_data', JSON.stringify(items));
                syncUI();
                alert('已儲存！');
                panel.style.display = 'none';
            });
        }
    }

    // --- 執行初始化 ---
    try {
        initGradYearSelects();
        initRegistrationForm();
        initUIEffects();
        initAdminPanel();
        
        // 綁定出席名單即時搜尋事件
        const sn = document.getElementById('searchName');
        const fgy = document.getElementById('filterGradYear');
        const sbtn = document.getElementById('searchBtn');

        if (sn) sn.addEventListener('input', renderAttendeeList);
        if (fgy) fgy.addEventListener('change', renderAttendeeList);
        if (sbtn) sbtn.addEventListener('click', renderAttendeeList);

        // 獲取數據
        fetchStats();
    } catch (e) {
        console.error('初始化過程中發生錯誤:', e);
    }
});
