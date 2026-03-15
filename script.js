// ========== 核心配置（请替换为你的GitHub信息） ==========
const CONFIG = {
    githubUsername: 'yangkz1208', // 你的GitHub用户名
    repoName: 'image-gallery', // 你的图片仓库名
    token: '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', // 你的GitHub Token
    cdnPrefix: 'https://cdn.jsdelivr.net/gh/', // jsDelivr CDN前缀
    currentFolder: '' // 当前选中的文件夹（空表示根目录/文件夹列表）
};

// ========== 页面加载完成后初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    loadAllFolders(); // 初始加载文件夹列表
    bindDropAreaEvents();
    bindFileInputEvent();
    bindModalCloseEvent();
    bindBackToFoldersEvent();
});

// ========== 加载所有文件夹 ==========
async function loadAllFolders() {
    const folderGrid = document.getElementById('folderGrid');
    folderGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 bg-white/70 rounded-lg py-10"><span class="loading mr-2"></span>加载文件夹中...</div>';

    try {
        // 获取仓库根目录文件/文件夹
        const response = await fetch(`https://api.github.com/repos/${CONFIG.githubUsername}/${CONFIG.repoName}/contents/`);
        if (!response.ok) throw new Error('获取文件夹失败');
        
        const contents = await response.json();
        // 筛选出文件夹（排除文件和README等）
        const folders = contents.filter(item => item.type === 'dir');

        // 渲染文件夹网格
        if (folders.length === 0) {
            folderGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 bg-white/70 rounded-lg py-10">暂无文件夹，上传文件后将自动创建分类文件夹</div>';
            return;
        }

        folderGrid.innerHTML = '';
        folders.forEach(folder => {
            const folderCard = createFolderCard(folder);
            folderGrid.appendChild(folderCard);
        });

    } catch (error) {
        console.error('加载文件夹失败：', error);
        folderGrid.innerHTML = '<div class="col-span-full text-center text-red-500 bg-white/70 rounded-lg py-10">加载失败，请检查配置或网络</div>';
    }
}

// ========== 创建文件夹卡片 ==========
function createFolderCard(folder) {
    const card = document.createElement('div');
    card.className = 'folder-card cursor-pointer transition-all duration-300 hover:scale-105';
    card.dataset.folderName = folder.name;

    // 方形文件夹样式：中间显示文件夹名，背景中高透明
    card.innerHTML = `
        <div class="w-full aspect-square bg-white/70 rounded-lg flex flex-col items-center justify-center p-4 shadow-md hover:shadow-lg">
            <i class="fa fa-folder text-6xl text-blue-500 mb-4"></i>
            <h3 class="text-xl font-medium text-gray-800 text-center">${folder.name}</h3>
        </div>
    `;

    // 绑定文件夹点击事件：进入文件夹查看图片
    card.addEventListener('click', () => {
        CONFIG.currentFolder = folder.name;
        document.getElementById('folderGrid').classList.add('hidden');
        document.getElementById('imageGrid').classList.remove('hidden');
        document.getElementById('backToFolders').classList.remove('hidden');
        loadImagesInFolder(folder.name);
    });

    return card;
}

// ========== 加载指定文件夹中的图片 ==========
async function loadImagesInFolder(folderName) {
    const imageGrid = document.getElementById('imageGrid');
    imageGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 bg-white/70 rounded-lg py-10"><span class="loading mr-2"></span>加载图片中...</div>';

    try {
        const response = await fetch(`https://api.github.com/repos/${CONFIG.githubUsername}/${CONFIG.repoName}/contents/${folderName}`);
        if (response.status === 404) {
            imageGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 bg-white/70 rounded-lg py-10">该文件夹暂无图片</div>';
            return;
        }
        
        const files = await response.json();
        // 筛选出图片文件（包含DNG）
        const imageFiles = files.filter(file => {
            const ext = file.name.split('.').pop().toLowerCase();
            return ['jpg', 'png', 'webp', 'jpeg', 'gif', 'dng'].includes(ext);
        });

        // 构造图片数据
        const images = imageFiles.map(file => ({
            name: file.name,
            path: file.path,
            url: `${CONFIG.cdnPrefix}${CONFIG.githubUsername}/${CONFIG.repoName}/${file.path}`,
            downloadUrl: file.download_url
        }));

        // 渲染图片网格
        if (images.length === 0) {
            imageGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 bg-white/70 rounded-lg py-10">该文件夹暂无图片</div>';
            return;
        }

        imageGrid.innerHTML = '';
        images.forEach(image => {
            const card = createImageCard(image);
            imageGrid.appendChild(card);
        });

    } catch (error) {
        console.error('加载图片失败：', error);
        imageGrid.innerHTML = '<div class="col-span-full text-center text-red-500 bg-white/70 rounded-lg py-10">加载失败，请检查配置或网络</div>';
    }
}

// ========== 创建图片卡片（含60%透明下载按钮） ==========
function createImageCard(image) {
    const card = document.createElement('div');
    card.className = 'image-card bg-white/80 rounded-lg overflow-hidden shadow-md transition-all duration-300 hover:scale-105';

    // 核心：下载按钮60%透明，居中显眼
    card.innerHTML = `
        <img src="${image.url}" alt="${image.name}" class="preview-img w-full h-48 object-cover cursor-pointer">
        <div class="p-3">
            <p class="text-sm text-gray-700 truncate mb-2 text-center">${image.name}</p>
            <button class="download-btn w-full py-2 bg-blue-600/60 text-white rounded-lg hover:bg-blue-700/60 transition flex items-center justify-center gap-2" 
                    data-download-url="${image.downloadUrl}" 
                    data-file-name="${image.name}">
                <i class="fa fa-download"></i>
                <span>下载文件</span>
            </button>
        </div>
    `;

    // 绑定大图预览事件（点击图片预览）
    card.querySelector('.preview-img').addEventListener('click', () => {
        showPreviewModal(image.url);
    });

    // 绑定下载按钮点击事件（阻止冒泡，避免触发预览）
    card.querySelector('.download-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        const downloadUrl = e.target.closest('.download-btn').dataset.downloadUrl;
        const fileName = e.target.closest('.download-btn').dataset.fileName;
        downloadImage(downloadUrl, fileName);
    });

    return card;
}

// ========== 绑定返回文件夹按钮事件 ==========
function bindBackToFoldersEvent() {
    const backBtn = document.getElementById('backToFolders');
    backBtn.addEventListener('click', () => {
        CONFIG.currentFolder = '';
        document.getElementById('imageGrid').classList.add('hidden');
        document.getElementById('folderGrid').classList.remove('hidden');
        backBtn.classList.add('hidden');
        loadAllFolders();
    });
}

// ========== 拖传区域事件绑定 ==========
function bindDropAreaEvents() {
    const dropArea = document.getElementById('dropArea');

    // 阻止默认拖放行为
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, preventDefaults, false);
        document.body.addEventListener(eventName, preventDefaults, false);
    });

    // 高亮拖传区域
    ['dragenter', 'dragover'].forEach(eventName => {
        dropArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropArea.addEventListener(eventName, unhighlight, false);
    });

    // 处理文件放下
    dropArea.addEventListener('drop', handleDrop, false);
}

// ========== 文件选择事件绑定 ==========
function bindFileInputEvent() {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFiles(files);
        }
    });
}

// ========== 大图预览关闭事件 ==========
function bindModalCloseEvent() {
    const closeModal = document.getElementById('closeModal');
    const previewModal = document.getElementById('previewModal');

    closeModal.addEventListener('click', () => {
        previewModal.classList.add('hidden');
    });

    // 点击弹窗外区域关闭
    previewModal.addEventListener('click', (e) => {
        if (e.target === previewModal) {
            previewModal.classList.add('hidden');
        }
    });
}

// ========== 工具函数：阻止默认行为 ==========
function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
}

// ========== 工具函数：高亮拖传区域 ==========
function highlight() {
    const dropArea = document.getElementById('dropArea');
    dropArea.classList.add('bg-blue-100/80');
    dropArea.classList.add('border-blue-600');
}

// ========== 工具函数：取消高亮 ==========
function unhighlight() {
    const dropArea = document.getElementById('dropArea');
    dropArea.classList.remove('bg-blue-100/80');
    dropArea.classList.remove('border-blue-600');
}

// ========== 工具函数：处理拖放文件 ==========
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// ========== 工具函数：处理上传文件（无大小限制、支持DNG/文件夹） ==========
async function handleFiles(files) {
    const dropArea = document.getElementById('dropArea');
    // 使用当前选中的文件夹，若无则默认使用"默认分类"
    const targetFolder = CONFIG.currentFolder || '默认分类';

    // 遍历文件并上传
    for (const file of files) {
        // 跳过文件夹目录项（webkitdirectory会生成虚拟目录文件）
        if (file.webkitRelativePath.includes('/') && file.size === 0) continue;
        
        // 验证文件类型（支持图片/DNG）
        const ext = file.name.split('.').pop().toLowerCase();
        if (!['jpg', 'png', 'webp', 'jpeg', 'gif', 'dng'].includes(ext)) {
            alert(`「${file.name}」不是支持的图片格式（JPG/PNG/WebP/DNG），跳过`);
            continue;
        }

        // 显示上传中状态
        dropArea.innerHTML = `<span class="loading mr-2"></span> 正在上传：${file.name}...`;

        try {
            // 获取文件相对路径（处理文件夹上传）
            let filePath = targetFolder;
            if (file.webkitRelativePath) {
                // 从相对路径中提取子文件夹结构
                const relativePath = file.webkitRelativePath.split('/');
                if (relativePath.length > 1) {
                    filePath += '/' + relativePath.slice(0, -1).join('/');
                }
            }
            filePath += '/' + file.name;

            // 将文件转为Base64
            const base64 = await fileToBase64(file);
            // 上传到GitHub仓库
            await uploadToGitHub(base64, file.name, filePath);

        } catch (error) {
            console.error('上传失败：', error);
            alert(`「${file.name}」上传失败：${error.message}`);
        }
    }

    // 恢复拖传区域提示
    dropArea.innerHTML = `
        <i class="fa fa-cloud-upload text-5xl text-blue-500 mb-4"></i>
        <p class="text-xl text-gray-700">拖入图片/文件夹到此处上传，或点击上方「上传文件/文件夹」按钮</p>
        <p class="text-sm text-gray-500 mt-2">支持JPG/PNG/WebP/DNG等图片格式，无大小/数量限制</p>
    `;

    // 清空文件选择框
    document.getElementById('fileInput').value = '';
    
    // 重新加载数据（如果在文件夹内则刷新图片，否则刷新文件夹）
    if (CONFIG.currentFolder) {
        loadImagesInFolder(CONFIG.currentFolder);
    } else {
        loadAllFolders();
    }
}

// ========== 工具函数：文件转Base64 ==========
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]); // 去掉Base64前缀
        reader.onerror = error => reject(error);
    });
}

// ========== 工具函数：上传到GitHub ==========
async function uploadToGitHub(base64Content, fileName, filePath) {
    const apiUrl = `https://api.github.com/repos/${CONFIG.githubUsername}/${CONFIG.repoName}/contents/${filePath}`;

    const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${CONFIG.token}`,
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            message: `Upload file: ${fileName} to ${filePath}`,
            content: base64Content,
            branch: 'main' // 仓库主分支
        })
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || '上传失败，请检查Token权限或仓库名称');
    }

    return response.json();
}

// ========== 工具函数：下载图片 ==========
function downloadImage(downloadUrl, fileName) {
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// ========== 工具函数：显示大图预览 ==========
function showPreviewModal(url) {
    const previewModal = document.getElementById('previewModal');
    const previewImage = document.getElementById('previewImage');
    previewImage.src = url;
    previewModal.classList.remove('hidden');
}
