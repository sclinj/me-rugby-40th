document.addEventListener('DOMContentLoaded', () => {
    const regForm = document.getElementById('regForm');
    const attendBanquet = document.getElementById('attendBanquet');
    const banquetDetails = document.getElementById('banquetDetails');
    const guestsSelect = document.getElementById('guests');
    const gradYearSelect = document.getElementById('gradYear');
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbzBWXpjzWSt9I4zik7rnDCEbnSIH922PX-GYe8s64XkEdQynbHMJuFuyWaUoMEEbPbH/exec';

    // 自動生成畢業級數選項 (75級 ~ 115級)
    if (gradYearSelect) {
        for (let i = 115; i >= 75; i--) { // 從新到舊排序
            const option = document.createElement('option');
            option.value = i + '級';
            option.textContent = i + '級';
            gradYearSelect.appendChild(option);
        }
    }
    
    // 報名人數邏輯 (從 GAS 讀取)
    let currentCount = 0;
    let batchData = [];

    const heroCountEl = document.getElementById('hero-count');
    const regCountEl = document.getElementById('reg-count');
    const leadingBatchEl = document.getElementById('leading-batch');
    const batchBarsEl = document.getElementById('batch-bars');

    // 出席名單相關元素
    const filterGradYear = document.getElementById('filterGradYear');
    const searchName = document.getElementById('searchName');
    const attendeeGrid = document.getElementById('attendeeGrid');
    const noResults = document.getElementById('noResults');
    let allAttendees = []; // 儲存所有報名名單

    // 初始化級數篩選選單
    if (filterGradYear) {
        for (let i = 115; i >= 75; i--) {
            const option = document.createElement('option');
            option.value = i + '級';
            option.textContent = i + '級';
            filterGradYear.appendChild(option);
        }
    }

    async function fetchStats() {
        try {
            const cacheBuster = `?t=${new Date().getTime()}`;
            const response = await fetch(GAS_URL + cacheBuster);
            
            if (!response.ok) throw new Error('網路回應不正確');
            
            const data = await response.json();
            
            currentCount = data.total || 0;
            batchData = data.batchData || [];
            allAttendees = data.attendees || []; // 假設 GAS 會回傳 attendees 陣列
            
            // 如果 GAS 尚未回傳名單，為了展示功能，可以使用模擬數據 (正式環境建議移除)
            if (allAttendees.length === 0 && currentCount > 0) {
                console.warn('GAS 未回傳詳細名單，暫時使用模擬數據進行展示');
                // 這裡可以選擇不顯示或顯示提示
            }

            updateUI();
            renderAttendees();
        } catch (error) {
            console.error('無法讀取統計數據:', error);
            if (heroCountEl) heroCountEl.innerText = '--';
            if (regCountEl) regCountEl.innerText = '--';
            if (attendeeGrid) attendeeGrid.innerHTML = '<div class="error-msg">暫時無法讀取名單</div>';
        }
    }

    function renderAttendees() {
        if (!attendeeGrid) return;

        const searchText = searchName.value.trim().toLowerCase();
        const selectedBatch = filterGradYear.value;

        // 過濾名單
        const filtered = allAttendees.filter(person => {
            const matchesSearch = person.name.toLowerCase().includes(searchText);
            const matchesBatch = !selectedBatch || person.gradYear === selectedBatch;
            return matchesSearch && matchesBatch;
        });

        // 排序：依級數從新到舊，同級數依姓名
        filtered.sort((a, b) => {
            const batchA = parseInt(a.gradYear) || 0;
            const batchB = parseInt(b.gradYear) || 0;
            if (batchB !== batchA) return batchB - batchA;
            return a.name.localeCompare(b.name, 'zh-Hant');
        });

        if (filtered.length > 0) {
            noResults.classList.add('hidden');
            attendeeGrid.innerHTML = filtered.map((person, index) => `
                <div class="attendee-card" style="animation-delay: ${Math.min(index * 0.05, 1)}s">
                    <div class="attendee-name">${person.name}</div>
                    <div class="attendee-batch">${person.gradYear}</div>
                </div>
            `).join('');
        } else {
            attendeeGrid.innerHTML = '';
            noResults.classList.remove('hidden');
        }
    }

    // 綁定搜尋與篩選事件
    if (searchName) searchName.addEventListener('input', renderAttendees);
    if (filterGradYear) filterGradYear.addEventListener('change', renderAttendees);

    function updateUI() {
        // 更新主計數器
        const animate = (el, target) => {
            if (!el) return;
            let start = parseInt(el.innerText) || 0;
            let duration = 1000;
            let startTime = null;
            function step(timestamp) {
                if (!startTime) startTime = timestamp;
                let progress = Math.min((timestamp - startTime) / duration, 1);
                el.innerText = Math.floor(progress * (target - start) + start);
                if (progress < 1) window.requestAnimationFrame(step);
            }
            window.requestAnimationFrame(step);
        };

        animate(heroCountEl, currentCount);
        animate(regCountEl, currentCount);

        // 更新排行榜
        if (batchBarsEl && batchData.length > 0) {
            const sorted = [...batchData].sort((a, b) => b.count - a.count);
            const maxCount = sorted[0].count;
            if (leadingBatchEl) leadingBatchEl.innerText = sorted[0].batch;

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

    // 初始讀取
    fetchStats();

    // 處理參加晚宴的顯示邏輯
    attendBanquet.addEventListener('change', () => {
        if (attendBanquet.checked) {
            banquetDetails.style.display = 'block';
            banquetDetails.style.opacity = '0';
            setTimeout(() => {
                banquetDetails.style.transition = 'opacity 0.5s ease';
                banquetDetails.style.opacity = '1';
            }, 10);
        } else {
            banquetDetails.style.display = 'none';
        }
    });

    // 處理攜伴人數的顯示邏輯
    guestsSelect.addEventListener('change', () => {
        if (parseInt(guestsSelect.value) > 0) {
            guestDietGroup.style.display = 'block';
        } else {
            guestDietGroup.style.display = 'none';
        }
    });

    // 表單提交處理 (正式串接 GAS)
    regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = regForm.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = '正在提交資料...';
        submitBtn.disabled = true;

        const formData = new FormData(regForm);
        const data = Object.fromEntries(formData.entries());
        
        try {
            const response = await fetch(GAS_URL, {
                method: 'POST',
                mode: 'no-cors', // GAS web apps usually require no-cors or redirect handling
                body: JSON.stringify(data)
            });

            // 成功反饋
            submitBtn.innerText = '✅ 報名成功！';
            submitBtn.style.background = '#28a745';
            
            setTimeout(() => {
                alert('感謝您的報名！資料已同步至雲端試算表。');
                regForm.reset();
                banquetDetails.style.display = 'none';
                submitBtn.innerText = originalText;
                submitBtn.style.background = '';
                submitBtn.disabled = false;
                fetchStats(); // 重新讀取人數
            }, 1500);

        } catch (error) {
            console.error('提交失敗:', error);
            alert('抱歉，提交時出現錯誤，請稍後再試。');
            submitBtn.innerText = originalText;
            submitBtn.disabled = false;
        }
    });

    // 平滑捲動
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // 捲動時導航欄變色
    window.addEventListener('scroll', () => {
        const nav = document.querySelector('.glass-nav');
        if (window.scrollY > 50) {
            nav.style.padding = '10px 0';
            nav.style.background = 'rgba(0, 31, 63, 0.95)';
        } else {
            nav.style.padding = '20px 0';
            nav.style.background = 'rgba(0, 31, 63, 0.8)';
        }
    });

    // Mobile Menu Logic
    const menuToggle = document.getElementById('menuToggle');
    const navLinks = document.getElementById('navLinks');
    const navLinksItems = document.querySelectorAll('.nav-links a');

    if (menuToggle) {
        menuToggle.addEventListener('click', () => {
            menuToggle.classList.toggle('active');
            navLinks.classList.toggle('active');
        });
    }

    // 點擊選單連結後自動關閉選單
    navLinksItems.forEach(item => {
        item.addEventListener('click', () => {
            menuToggle.classList.remove('active');
            navLinks.classList.remove('active');
        });
    });

    // Admin Panel Logic
    const adminPanel = document.getElementById('adminPanel');
    const adminTrigger = document.getElementById('adminTrigger');
    const closeAdmin = document.getElementById('closeAdmin');
    const adminItemsList = document.getElementById('admin-items-list');
    const saveAdmin = document.getElementById('saveAdmin');

    // 初始進度數據
    const defaultProgressItems = [
        { id: 1, name: '募款進度', status: '已達標', progress: 100 },
        { id: 2, name: '晚宴籌劃', status: '已訂位(20桌及舞台)', progress: 70 },
        { id: 3, name: '紀念品製作', status: '設計打樣中', progress: 40 },
        { id: 4, name: '休息區佈置', status: '規劃中', progress: 40 },
        { id: 5, name: '攝影及紀錄安排', status: '攝影人員已確認(義工)', progress: 60 }
    ];

    // 從 localStorage 讀取或使用預設值
    let progressItems = JSON.parse(localStorage.getItem('rugby_progress_data')) || defaultProgressItems;

    // 同步進度到首頁 UI
    function syncProgressUI() {
        const uiItems = document.querySelectorAll('.progress-item');
        progressItems.forEach((item, index) => {
            const uiItem = uiItems[index];
            if (!uiItem) return;

            const tag = uiItem.querySelector('.status-tag');
            const bar = uiItem.querySelector('.progress-bar');
            
            // 更新文字與進度條
            tag.innerText = item.status;
            bar.style.width = item.progress + '%';
            
            // 根據進度調整標籤顏色類別
            tag.className = 'status-tag';
            if (item.progress === 100) tag.classList.add('success');
            else if (item.progress > 50) tag.classList.add('warning');
            else tag.classList.add('info');
        });
    }

    function renderAdminItems() {
        adminItemsList.innerHTML = progressItems.map(item => `
            <div class="admin-item-edit" data-id="${item.id}">
                <label>${item.name}</label>
                <input type="text" value="${item.status}" class="status-input" placeholder="狀態文字" style="margin-bottom: 5px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="range" min="0" max="100" value="${item.progress}" class="progress-slider">
                    <span class="progress-val">${item.progress}%</span>
                </div>
            </div>
        `).join('');

        // 綁定 slider 數值顯示
        document.querySelectorAll('.progress-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                e.target.nextElementSibling.innerText = e.target.value + '%';
            });
        });
    }

    // 初始執行一次同步
    syncProgressUI();

    adminTrigger.addEventListener('click', () => {
        adminPanel.style.display = 'block';
        renderAdminItems();
    });

    closeAdmin.addEventListener('click', () => {
        adminPanel.style.display = 'none';
    });

    saveAdmin.addEventListener('click', () => {
        const edits = document.querySelectorAll('.admin-item-edit');
        edits.forEach((edit, index) => {
            const status = edit.querySelector('.status-input').value;
            const progress = parseInt(edit.querySelector('.progress-slider').value);
            
            // 更新記憶體中的數據
            progressItems[index].status = status;
            progressItems[index].progress = progress;
        });

        // 儲存到 localStorage
        localStorage.setItem('rugby_progress_data', JSON.stringify(progressItems));

        // 同步到 UI
        syncProgressUI();

        alert('進度已同步並儲存至瀏覽器！');
        adminPanel.style.display = 'none';
    });
});
