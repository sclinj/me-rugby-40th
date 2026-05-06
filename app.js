document.addEventListener('DOMContentLoaded', () => {
    // --- 核心變數與配置 ---
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbzBWXpjzWSt9I4zik7rnDCEbnSIH922PX-GYe8s64XkEdQynbHMJuFuyWaUoMEEbPbH/exec';
    let currentCount = 0;
    let batchData = [];
    let allAttendees = [];
    let progressItems = [];

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
                    
                    const data = {
                        name: formData.get('name'),
                        gradYear: formData.get('gradYear'),
                        attend: formData.get('attend') ? '是' : '否',
                        guests: formData.get('guests') || '0',
                        dietSelf: formData.get('dietSelf') || '葷',
                        dietGuest: formData.get('dietGuest') || '葷'
                    };

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
            allAttendees = data.attendees || [];
            
            // 處理級數統計 (相容 "84級" 或 "84" 格式)
            const batchCounts = {};
            allAttendees.forEach(a => {
                let batch = String(a.gradYear || '').replace(/[^0-9]/g, '');
                if (batch) {
                    batchCounts[batch] = (batchCounts[batch] || 0) + 1;
                }
            });
            batchData = Object.keys(batchCounts).map(b => ({ batch: b + '級', count: batchCounts[b] }));

            // 進度項目處理 (若後端為空則使用預設)
            progressItems = (data.progressItems && data.progressItems.length > 0) 
                            ? data.progressItems 
                            : getDefaultProgressItems();
            
            updateStatsUI();
            renderAttendeeList();
            renderProgressGrid();
        } catch (error) {
            console.error('統計數據讀取失敗:', error);
            progressItems = getDefaultProgressItems(); // 讀取失敗時使用預設值
            renderProgressGrid();
            const errorEls = ['hero-count', 'reg-count', 'leading-batch'];
            errorEls.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.innerText = '連線中';
            });
            const batchBarsEl = document.getElementById('batch-bars');
            if (batchBarsEl) {
                batchBarsEl.innerHTML = '<div class="info-msg">暫時無法讀取排行榜資料，請稍後再試</div>';
            }
        }
    }

    function getDefaultProgressItems() {
        // 從 LocalStorage 嘗試讀取，若無則使用初始預設值
        const saved = localStorage.getItem('rugby_progress_data');
        if (saved) return JSON.parse(saved);

        return [
            { id: 1, name: '募款進度', owner: '澎哥', icon: '💰', status: '已達標', progress: 100, desc: '感謝校友慷慨解囊，募款已突破原定目標。', updatedAt: new Date().toISOString() },
            { id: 2, name: '晚宴籌劃', owner: '澎哥', icon: '🍽️', status: '已訂位', progress: 70, desc: '已確認濃園 3F 場地，並完成舞台初步規劃。', updatedAt: new Date().toISOString() },
            { id: 3, name: '紀念衫製作', owner: '豪哥', icon: '👕', status: '打樣中', progress: 40, desc: '40 週年紀念衫設計稿已定稿，進入打樣階段。', updatedAt: new Date().toISOString() },
            { id: 4, name: '球場休息區', owner: '學成', icon: '🏟️', status: '規劃中', progress: 30, desc: '規劃帳篷租借與當日補給品清單。', updatedAt: new Date().toISOString() },
            { id: 5, name: '攝影及記錄', owner: '晃民', icon: '📸', status: '已確認', progress: 60, desc: '專業攝影團隊與空拍義工已完成分工。', updatedAt: new Date().toISOString() },
            { id: 6, name: '40周年紀念鑰匙圈', owner: '學成', icon: '🔑', status: '新增項目', progress: 10, desc: '新增紀念品項目，正進行設計方案篩選。', updatedAt: new Date().toISOString() }
        ];
    }

    function renderProgressGrid() {
        const grid = document.getElementById('progress-grid');
        if (!grid) return;

        grid.innerHTML = progressItems.map(item => {
            const isNew = isRecentlyUpdated(item.updatedAt);
            const gradientClass = getGradient(item.progress);
            
            return `
                <div class="progress-card reveal">
                    ${isNew ? '<div class="new-badge">NEW</div>' : ''}
                    <div class="progress-header">
                        <div class="progress-title-group">
                            <div class="progress-icon">${item.icon}</div>
                            <h4>${item.name}</h4>
                        </div>
                        <span class="status-tag ${getStatusClass(item.status)}">${item.status}</span>
                    </div>
                    <div class="progress-bar-outer">
                        <div class="progress-bar-inner ${gradientClass}" style="width: ${item.progress}%"></div>
                    </div>
                    <div class="progress-footer">
                        <span>目前進度</span>
                        <span class="progress-percent">${item.progress}%</span>
                    </div>
                    ${item.desc ? `<div class="update-desc">${item.desc}</div>` : ''}
                    <div class="owner-tag">${item.owner}</div>
                </div>
            `;
        }).join('');

        // 重新初始化 reveal 效果
        initReveal();
    }

    function isRecentlyUpdated(dateStr) {
        if (!dateStr) return false;
        const updateDate = new Date(dateStr);
        const now = new Date();
        const diffInHours = (now - updateDate) / (1000 * 60 * 60);
        return diffInHours < 72; // 3 天內算新更新
    }

    function getGradient(progress) {
        if (progress >= 100) return 'gradient-green';
        if (progress >= 70) return 'gradient-blue';
        if (progress >= 40) return 'gradient-gold';
        return 'gradient-red';
    }

    function getStatusClass(status) {
        if (status.includes('已達標') || status.includes('已確認') || status.includes('完成')) return 'success';
        if (status.includes('規劃') || status.includes('新增')) return 'info';
        return 'warning';
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
                <div class="batch-bar-item" data-batch="${item.batch}">
                    <div class="batch-label">${item.batch}</div>
                    <div class="batch-progress-wrap">
                        <div class="batch-progress-fill" style="width: ${(item.count / maxCount) * 100}%"></div>
                    </div>
                    <div class="batch-count">${item.count}</div>
                </div>
            `).join('');

            // 為級數排行榜加入點擊事件
            batchBarsEl.querySelectorAll('.batch-bar-item').forEach(item => {
                item.addEventListener('click', () => {
                    const batch = item.getAttribute('data-batch');
                    scrollToAttendees(batch);
                });
            });
        }
    }

    // --- 3.5 點擊統計數據捲動與過濾 ---
    function scrollToAttendees(batch = '') {
        const target = document.getElementById('attendees');
        const filterGradYear = document.getElementById('filterGradYear');
        const searchName = document.getElementById('searchName');

        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
            
            if (batch) {
                // 如果有指定級數，設定過濾器並重新渲染
                if (filterGradYear) filterGradYear.value = batch;
                if (searchName) searchName.value = ''; // 清空姓名搜尋以避免衝突
                renderAttendeeList();
            }
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

        // 如果沒有輸入關鍵字也沒有選擇級數，顯示提示訊息
        if (!searchText && !selectedBatch) {
            attendeeGrid.innerHTML = `
                <div class="info-msg search-prompt">
                    <div class="prompt-icon">🔍</div>
                    <p>請輸入姓名或選擇級數進行查詢</p>
                    <p><small>目前已有 ${currentCount} 位隊友報名</small></p>
                </div>`;
            if (noResults) noResults.classList.add('hidden');
            return;
        }

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
                const noResultsText = noResults.querySelector('.no-results-text');
                const inviteHeader = noResults.querySelector('.invite-card h4');
                const lineBtn = document.getElementById('lineInviteBtn');
                
                if (selectedBatch && !searchText) {
                    if (noResultsText) noResultsText.innerHTML = `目前還沒有 <strong>${selectedBatch}</strong> 的隊友報名`;
                    if (inviteHeader) inviteHeader.innerText = `號召 ${selectedBatch} 的老友？`;
                } else if (searchText) {
                    if (noResultsText) noResultsText.innerHTML = `找不到符合 <strong>${searchText}</strong> 的隊友`;
                    if (inviteHeader) inviteHeader.innerText = `沒看到 ${searchText} 報名？`;
                } else {
                    if (noResultsText) noResultsText.innerText = `找不到符合條件的隊友`;
                    if (inviteHeader) inviteHeader.innerText = `還沒看到老友報名？`;
                }
            }
        }
    }

    // --- 4.5 LINE 分享邏輯 ---
    function initLineSharing() {
        const siteUrl = 'https://me-rugby-40th.vercel.app/';
        
        function shareToLine(text) {
            const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(text)}`;
            window.open(lineUrl, '_blank');
        }

        const lineInviteBtn = document.getElementById('lineInviteBtn');
        const lineShareGeneral = document.getElementById('lineShareGeneral');
        const searchName = document.getElementById('searchName');
        const filterGradYear = document.getElementById('filterGradYear');

        if (lineInviteBtn) {
            lineInviteBtn.addEventListener('click', () => {
                const name = searchName ? searchName.value.trim() : '';
                const batch = filterGradYear ? filterGradYear.value : '';
                
                let message = '';
                if (name) {
                    message = `嘿 ${name}，成大機械橄欖球 40 週年慶典開始報名了！我剛在名單上沒看到你，快來報名敘舊吧！球場見！\n\n🔗 立即查看名單與報名：${siteUrl}`;
                } else if (batch) {
                    message = `【成大機械橄欖球 40 週年】各路 OB 注意！${batch} 的報名名單還沒看到你？快來看看誰已經報名了！\n\n🔗 立即查看名單：${siteUrl}`;
                } else {
                    message = `成大機械橄欖球 40 週年慶典報名中！好多老隊友都回來了，就差你了，快來看看誰報名了！\n\n🔗 立即查看名單：${siteUrl}`;
                }
                shareToLine(message);
            });
        }

        if (lineShareGeneral) {
            lineShareGeneral.addEventListener('click', () => {
                const message = `【成大機械橄欖球 40 週年】傳承榮耀，再續前緣。2026/06/27 誠摯邀請歷屆 OB 回家！立即查看出席芳名錄與報名詳情。\n\n🔗 活動網站：${siteUrl}`;
                shareToLine(message);
            });
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
        const passwordInput = document.getElementById('adminPassword');
        const selectItem = document.getElementById('adminSelectItem');
        const ownerInput = document.getElementById('adminOwnerName');
        const statusInput = document.getElementById('adminStatusText');
        const descInput = document.getElementById('adminDescText');
        const progressRange = document.getElementById('adminProgressRange');
        const progressVal = document.getElementById('progressVal');

        if (!trigger || !panel) return;

        // 當點擊管理觸發點時
        trigger.addEventListener('click', () => {
            panel.style.display = 'block';
            // 初始化下拉選單
            selectItem.innerHTML = progressItems.map(item => `
                <option value="${item.id}">${item.name}</option>
            `).join('');
            
            // 觸發一次更新顯示
            updateEditorFields();
        });

        // 下拉選單變動時更新欄位
        selectItem.addEventListener('change', updateEditorFields);

        // 滑桿變動時更新數字顯示
        progressRange.addEventListener('input', () => {
            progressVal.innerText = progressRange.value;
        });

        function updateEditorFields() {
            const selectedId = parseInt(selectItem.value);
            const item = progressItems.find(i => i.id === selectedId);
            if (item) {
                ownerInput.value = item.owner;
                statusInput.value = item.status;
                descInput.value = item.desc || '';
                progressRange.value = item.progress;
                progressVal.innerText = item.progress;
            }
        }

        if (closeBtn) closeBtn.addEventListener('click', () => panel.style.display = 'none');

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                if (passwordInput.value !== 'ME40') {
                    alert('密碼錯誤！');
                    return;
                }

                const selectedId = parseInt(selectItem.value);
                const itemIndex = progressItems.findIndex(i => i.id === selectedId);
                
                if (itemIndex > -1) {
                    const originalText = saveBtn.innerText;
                    saveBtn.innerText = '正在發布更新...';
                    saveBtn.disabled = true;

                    // 更新本地資料對象
                    progressItems[itemIndex].status = statusInput.value;
                    progressItems[itemIndex].desc = descInput.value;
                    progressItems[itemIndex].progress = parseInt(progressRange.value);
                    progressItems[itemIndex].updatedAt = new Date().toISOString();

                    try {
                        // 嘗試發送到 GAS 後台
                        const updateData = {
                            action: 'updateProgress',
                            itemId: selectedId,
                            status: progressItems[itemIndex].status,
                            desc: progressItems[itemIndex].desc,
                            progress: progressItems[itemIndex].progress,
                            updatedAt: progressItems[itemIndex].updatedAt
                        };

                        await fetch(GAS_URL, {
                            method: 'POST',
                            mode: 'no-cors',
                            body: JSON.stringify(updateData)
                        });

                        // 同步儲存至 localStorage 作為備援
                        localStorage.setItem('rugby_progress_data', JSON.stringify(progressItems));
                        
                        renderProgressGrid();
                        alert('更新成功！所有訪客將在下次重新整理後看到新進度。');
                        panel.style.display = 'none';
                        passwordInput.value = '';
                    } catch (error) {
                        console.error('更新失敗:', error);
                        alert('發布失敗，請檢查網路連線或聯繫管理員。');
                    } finally {
                        saveBtn.innerText = originalText;
                        saveBtn.disabled = false;
                    }
                }
            });
        }
    }

    // --- 7. 相片輪播邏輯 ---
    function initPhotoGallery() {
        const slides = document.querySelectorAll('.gallery-slide');
        const dots = document.querySelectorAll('.dot');
        let currentSlide = 0;
        let slideInterval;

        if (slides.length === 0) return;

        function showSlide(index) {
            slides.forEach(s => s.classList.remove('active'));
            dots.forEach(d => d.classList.remove('active'));
            
            slides[index].classList.add('active');
            dots[index].classList.add('active');
            currentSlide = index;
        }

        function nextSlide() {
            let next = (currentSlide + 1) % slides.length;
            showSlide(next);
        }

        function startAutoPlay() {
            slideInterval = setInterval(nextSlide, 5000);
        }

        function stopAutoPlay() {
            clearInterval(slideInterval);
        }

        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => {
                showSlide(i);
                stopAutoPlay();
                startAutoPlay();
            });
        });

        startAutoPlay();
    }

    // --- 7.5 外部連結安全性提醒 ---
    // --- 7.5 外部連結安全性提醒 ---
    function initExternalLinks() {
        const externalLinks = document.querySelectorAll('.external-album, #btn-google-photos');
        
        externalLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                const albumTitle = link.querySelector('h4') ? link.querySelector('h4').innerText : '雲端相簿';
                const confirmLeave = confirm(`您即將前往外部相簿：\n【${albumTitle}】\n\n此空間由 82 級培富學長提供，是否繼續？`);
                if (!confirmLeave) {
                    e.preventDefault();
                }
            });
        });
    }

    // --- 7.6 捲動顯現效果 ---
    function initReveal() {
        const observerOptions = {
            threshold: 0.15,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('active');
                }
            });
        }, observerOptions);

        document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
    }

    // --- 執行初始化 ---
    try {
        initGradYearSelects();
        initRegistrationForm();
        initUIEffects();
        initAdminPanel();
        initPhotoGallery();
        initExternalLinks();
        initReveal();
        initLineSharing();
        
        // 綁定出席名單即時搜尋事件
        const sn = document.getElementById('searchName');
        const fgy = document.getElementById('filterGradYear');
        const sbtn = document.getElementById('searchBtn');

        if (sn) sn.addEventListener('input', renderAttendeeList);
        if (fgy) fgy.addEventListener('change', renderAttendeeList);
        if (sbtn) sbtn.addEventListener('click', renderAttendeeList);

        // 獲取數據
        fetchStats();

        // 綁定 Hero 區塊統計數據點擊事件
        const statHeroCount = document.getElementById('stat-hero-count');
        const statLeadingBatch = document.getElementById('stat-leading-batch');

        if (statHeroCount) {
            statHeroCount.addEventListener('click', () => scrollToAttendees());
        }
        if (statLeadingBatch) {
            statLeadingBatch.addEventListener('click', () => {
                const batchText = document.getElementById('leading-batch').innerText;
                scrollToAttendees(batchText);
            });
        }
    } catch (e) {
        console.error('初始化過程中發生錯誤:', e);
    }
});
