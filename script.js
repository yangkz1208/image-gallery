// ==================== 配置 ====================
const CONFIG = {
    owner: "yangkzl28",
    repo: "image-gallery",
    token: "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",
    bgImageUrl: "assets/bg.jpg",
    topImageUrl: "assets/top-image.jpg",
    maxLoginAttempts: 5,
    lockTime: 5 * 60 * 1000,
    defaultPassword: "123456" // 初始固定密码
};

// ==================== 状态 ====================
const STATE = {
    isAdmin: false,
    isVisitor: false,
    currentFolder: "",
    selectedImages: [],
    lockedImages: [],
    loginAttempts: Number(localStorage.getItem("loginAttempts") || 0),
    lockEndTime: Number(localStorage.getItem("lockEndTime") || 0)
};

// ==================== DOM 元素 ====================
const E = {
    loginPage: document.getElementById("login-page"),
    mainPage: document.getElementById("main-page"),
    pwdInput: document.getElementById("password-input"),
    // 新增：登录按钮
    loginBtn: document.getElementById("login-btn"),
    visitor: document.getElementById("visitor-mode"),
    daily: document.querySelector(".daily-word"),
    totalImg: document.getElementById("total-images"),
    time: document.getElementById("current-time"),
    topImg: document.getElementById("top-specified-image"),
    folderDetail: document.getElementById("folder-detail"),
    folderTitle: document.getElementById("folder-title"),
    imgGrid: document.getElementById("images-grid"),
    backBtn: document.getElementById("back-btn"),
    panel: document.getElementById("manage-panel"),
    download: document.getElementById("download-selected"),
    del: document.getElementById("delete-selected"),
    selectAll: document.getElementById("select-all"),
    lock: document.getElementById("lock-selected"),
    cancel: document.getElementById("cancel-select")
};

// ==================== 初始化 ====================
init();

async function init() {
    document.querySelector(".bg-container").style.backgroundImage = `url(${CONFIG.bgImageUrl})`;
    E.topImg.src = CONFIG.topImageUrl;
    await loadDailyWord();
    updateTime();
    setInterval(updateTime, 1000);
    bind();
    checkLock();
}

// ==================== 每日一言 ====================
async function loadDailyWord() {
    try {
        const r = await ghGet("config/daily.json");
        const d = r ? JSON.parse(atob(r.content)) : {t:"生活明朗，万物可爱"};
        E.daily.textContent = d.t;
        E.daily.onclick = async () => {
            const t = prompt("新一言", d.t);
            if(t) await ghPut("config/daily.json", btoa(JSON.stringify({t})), "base64");
            E.daily.textContent = t;
        };
    } catch(e) {
        E.daily.textContent = "生活明朗，万物可爱";
    }
}

// ==================== 时间 ====================
function updateTime() {
    E.time.textContent = new Date().toLocaleString("zh-CN", {hour12:false});
}

// ==================== 事件绑定（新增登录按钮） ====================
function bind() {
    E.pwdInput.onkeydown = e => e.key === "Enter" && checkPwd();
    // 新增：点击登录按钮直接验证
    E.loginBtn.onclick = checkPwd;

    E.visitor.onclick = visitor;
    E.backBtn.onclick = back;
    E.download.onclick = downSel;
    E.del.onclick = delSel;
    E.selectAll.onclick = selAll;
    E.lock.onclick = lockSel;
    E.cancel.onclick = cancelSel;

    document.querySelectorAll(".folder-card").forEach(c => {
        c.onclick = () => openFolder(c.dataset.folder);
        c.ondragover = e => {e.preventDefault(); c.style.border="2px solid #0066cc";};
        c.ondragleave = () => c.style.border="2px solid #eee";
        c.ondrop = async e => {
            e.preventDefault();
            c.style.border="2px solid #eee";
            if(!STATE.isAdmin) return alert("仅管理员可上传");
            for(let f of e.dataTransfer.files) {
                if(f.type.startsWith("image/")) await upload(c.dataset.folder, f);
            }
            await refreshCard(c.dataset.folder);
        };
    });
}

// ==================== 密码验证 ====================
async function checkPwd() {
    if(Date.now() < STATE.lockEndTime) return alert(`锁定中，${Math.ceil((STATE.lockEndTime-Date.now())/6e4)}分钟后重试`);
    const i = E.pwdInput.value.trim();
    if(!i) return alert("请输入密码");
    try {
        const r = await ghGet("config/pwd.json");
        const real = r ? JSON.parse(atob(r.content)).pwd : CONFIG.defaultPassword;
        if(i === real) {
            localStorage.setItem("loginAttempts", 0);
            STATE.isAdmin = true;
            enterMain();
        } else {
            STATE.loginAttempts++;
            localStorage.setItem("loginAttempts", STATE.loginAttempts);
            if(STATE.loginAttempts >= CONFIG.maxLoginAttempts) {
                STATE.lockEndTime = Date.now() + CONFIG.lockTime;
                localStorage.setItem("lockEndTime", STATE.lockEndTime);
                alert("尝试过多，已锁定5分钟");
            } else {
                alert(`密码错误，剩余${CONFIG.maxLoginAttempts-STATE.loginAttempts}次`);
            }
        }
    } catch(e) {
        alert("验证失败");
    }
}

// ==================== 访客模式 ====================
async function visitor() {
    await logVisitor();
    STATE.isVisitor = true;
    enterMain();
}

async function logVisitor() {
    try {
        const ip = await (await fetch("https://api.ipify.org?format=json")).json().then(d=>d.ip);
        const t = new Date().toLocaleString();
        const line = `\n- ${t} | ${ip}`;
        let log = "# 访客日志";
        const r = await ghGet("config/log.md");
        if(r) log = atob(r.content);
        await ghPut("config/log.md", btoa(log+line), "base64");
    } catch(e){}
}

// ==================== 进入主页 ====================
async function enterMain() {
    E.loginPage.classList.remove("active");
    E.mainPage.classList.add("active");
    await loadLocked();
    await calcTotal();
    await refreshAllCards();
    if(STATE.isVisitor) {
        E.del.disabled = true;
        E.lock.disabled = true;
    }
}

// ==================== 文件夹操作 ====================
async function openFolder(f) {
    STATE.currentFolder = f;
    E.folderTitle.textContent = `# ${f}`;
    E.folderDetail.classList.add("active");
    await loadImgs(f);
}

function back() {
    E.folderDetail.classList.remove("active");
    cancelSel();
}

// ==================== 图片加载 ====================
async function loadImgs(f) {
    E.imgGrid.innerHTML = "";
    const fs = await ghList(`folders/${f}`);
    fs.filter(x=>x.type=="file"&&/\.(jpg|jpeg|png|gif|webp)$/i.test(x.name)).forEach(file=>{
        const u = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/main/folders/${f}/${file.name}`;
        const p = `${f}/${file.name}`;
        const it = document.createElement("div");
        it.className="image-item";
        it.dataset.path=p;
        it.dataset.locked = STATE.lockedImages.includes(p);
        it.innerHTML = `<img src="${u}">`;
        it.onclick = () => {
            E.panel.classList.add("active");
            it.classList.toggle("selected");
            if(it.classList.contains("selected")) STATE.selectedImages.push(p);
            else STATE.selectedImages = STATE.selectedImages.filter(x=>x!==p);
        };
        E.imgGrid.appendChild(it);
    });
}

// ==================== 多选操作 ====================
function selAll() {
    STATE.selectedImages = [];
    document.querySelectorAll(".image-item").forEach(i=>{
        i.classList.add("selected");
        STATE.selectedImages.push(i.dataset.path);
    });
}

async function downSel() {
    if(!STATE.selectedImages.length) return alert("请选择图片");
    const z = new JSZip();
    for(let p of STATE.selectedImages) {
        const [f,n] = p.split("/");
        const u = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/main/folders/${f}/${n}`;
        const b = await (await fetch(u)).blob();
        z.file(n,b);
    }
    z.generateAsync({type:"blob"}).then(b=>saveAs(b,`图片_${Date.now()}.zip`));
}

async function delSel() {
    if(!STATE.isAdmin) return alert("无权限");
    if(!STATE.selectedImages.length) return alert("请选择图片");
    if(!confirm("确定删除？不可恢复")) return;
    for(let p of STATE.selectedImages) {
        if(STATE.lockedImages.includes(p)) {
            alert(p.split("/")[1]+"已锁定");
            continue;
        }
        await ghDel(`folders/${p}`);
        document.querySelector(`[data-path="${p}"]`).remove();
    }
    cancelSel();
    await calcTotal();
}

async function lockSel() {
    if(!STATE.isAdmin) return alert("无权限");
    if(!STATE.selectedImages.length) return alert("请选择图片");
    STATE.lockedImages = [...new Set([...STATE.lockedImages,...STATE.selectedImages])];
    await ghPut("config/locked.json", btoa(JSON.stringify({list:STATE.lockedImages})), "base64");
    STATE.selectedImages.forEach(p=>document.querySelector(`[data-path="${p}"]`).dataset.locked="true");
    cancelSel();
    alert("锁定成功");
}

function cancelSel() {
    document.querySelectorAll(".image-item").forEach(i=>i.classList.remove("selected"));
    STATE.selectedImages = [];
    E.panel.classList.remove("active");
}

// ==================== 上传 ====================
async function upload(f,file) {
    const rd = new FileReader();
    rd.readAsDataURL(file);
    rd.onload = async () => {
        const c = rd.result.split(",")[1];
        await ghPut(`folders/${f}/${file.name}`, c, "base64");
        alert("上传成功");
        await loadImgs(f);
        await calcTotal();
    };
}

// ==================== 工具函数 ====================
async function loadLocked() {
    try {
        const r = await ghGet("config/locked.json");
        STATE.lockedImages = r ? JSON.parse(atob(r.content)).list : [];
    } catch(e){STATE.lockedImages=[]}
}

async function calcTotal() {
    let n=0;
    for(let f of ["folderA","folderB","folderC","folderD","folderE"]) {
        n += (await ghList(`folders/${f}`)).length;
    }
    E.totalImg.textContent = `图片总数：${n}`;
}

async function refreshCard(f) {
    const fs = await ghList(`folders/${f}`);
    if(!fs.length) return;
    fs.sort((a,b)=>new Date(b.updated_at)-new Date(a.updated_at));
    const u = `https://raw.githubusercontent.com/${CONFIG.owner}/${CONFIG.repo}/main/folders/${f}/${fs[0].name}`;
    document.querySelector(`[data-folder="${f}"]`).style.backgroundImage = `url(${u})`;
}

async function refreshAllCards() {
    for(let f of ["folderA","folderB","folderC","folderD","folderE"]) await refreshCard(f);
}

function checkLock() {
    if(Date.now() < STATE.lockEndTime) alert(`锁定中，${Math.ceil((STATE.lockEndTime-Date.now())/6e4)}分钟后重试`);
}

// ==================== GitHub API ====================
async function ghGet(p) {
    const r = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${p}`,{
        headers:{Authorization:`token ${CONFIG.token}`}
    });
    return r.ok ? r.json() : null;
}

async function ghList(p) {
    const r = await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${p}`,{
        headers:{Authorization:`token ${CONFIG.token}`}
    });
    return r.ok ? r.json() : [];
}

async function ghPut(p,c,e="utf-8") {
    const old = await ghGet(p);
    return await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${p}`,{
        method:"PUT",
        headers:{Authorization:`token ${CONFIG.token}`,"Content-Type":"application/json"},
        body:JSON.stringify({message:`update ${p}`,content:c,encoding:e,sha:old?.sha})
    });
}

async function ghDel(p) {
    const old = await ghGet(p);
    if(!old) return;
    return await fetch(`https://api.github.com/repos/${CONFIG.owner}/${CONFIG.repo}/contents/${p}`,{
        method:"DELETE",
        headers:{Authorization:`token ${CONFIG.token}`,"Content-Type":"application/json"},
        body:JSON.stringify({message:`delete ${p}`,sha:old.sha})
    });
}
