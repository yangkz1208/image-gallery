// ========== 核心配置（必须修改为你的信息！） ==========
const CONFIG = {
    githubUsername: 'yangkz1208', // 替换为你的GitHub用户名
    repoName: 'image-gallery', // 替换为你的图片仓库名
    token: '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', // 替换为你的GitHub Token
    cdnPrefix: 'https://cdn.jsdelivr.net/gh/' // jsDelivr CDN前缀（无需修改）
};

// ========== 页面加载完成后初始化 ==========
document.addEventListener('DOMContentLoaded', () => {
    loadAllImages();
    bindDropAreaEvents();
    bindFileInputEvent();
    bindCategoryFilterEvent();
    bindModalCloseEvent();
});

// ========== 加载所有图片 ==========
async function loadAllImages() {
    const imageGrid = document.getElementById('imageGrid');
    imageGrid.innerHTML = '<div class="col-span-full text-center text-gray-500"><span class="loading mr-2"></span>加载中...</div>';

    try {
        // 1. 修改为你的中文分类文件夹名（核心！）
        const categories = ['他人', '好图', '网图', '花草', '风景'];
        let allImages = [];

        for (const category of categories) {
            const response = await fetch(`https://api.github.com/repos/${CONFIG.githubUsername}/${CONFIG.repoName}/contents/${category}`);
            if (response.status === 404) continue; // 文件夹不存在则跳过
            const files = await response.json();

            // 筛选出图片文件
            const imageFiles = files.filter(file => {
                const ext = file.name.split('.').pop().toLowerCase();
                return ['jpg', 'png', 'webp', 'jpeg', 'gif'].includes(ext);
            });

            // 构造图片数据
            const categoryImages = imageFiles.map(file => ({
                name: file.name,
                path: file.path,
                url: `${CONFIG.cdnPrefix}${CONFIG.githubUsername}/${CONFIG.repoName}/${file.path}`,
                category: category,
                downloadUrl: file.download_url
            }));

            allImages = [...allImages, ...categoryImages];
        }

        // 2. 渲染图片网格
        if (allImages.length === 0) {
            imageGrid.innerHTML = '<div class="col-span-full text-center text-gray-500 py-10">暂无图片，上传后将显示在这里</div>';
            return;
        }

        imageGrid.innerHTML = '';
        allImages.forEach(image => {
            const card = createImageCard(image);
            imageGrid.appendChild(card);
        });

    } catch (error) {
        console.error('加载图片失败：', error);
        imageGrid.innerHTML = '<div class="col-span-full text-center text-red-500 py-10">加载失败，请检查配置或网络</div>';
    }
}

// ========== 创建图片卡片 ==========
function createImageCard(image) {
    const card = document.createElement('div');
    card.className = 'image-card';
    card.dataset.category = image.category;

    // 3. 修改为中文分类的标签样式（核心！）
    const categoryTags = {
        他人: { text: '他人', bg: 'bg-blue-100', textColor: 'text-blue-600' },
        好图: { text: '好图', bg: 'bg-green-100', textColor: 'text-green-600' },
        网图: { text: '网图', bg: 'bg-yellow-100', textColor: 'text-yellow-600' },
        花草: { text: '花草', bg: 'bg-pink-100', textColor: 'text-pink-600' },
        风景: { text: '风景', bg: 'bg-purple-100', textColor: 'text-purple-600' }
    };
    const tagStyle = categoryTags[image.category];

    card.innerHTML = `
        <img src="${image.url}" alt="${image.name}" class="preview-img" data-preview-url="${image.url}">
        <div class="card-footer">
            <span class="category-tag ${tagStyle.bg} ${tagStyle.textColor}">${tagStyle.text}</span>
            <span class="download-btn" data-download-url="${image.downloadUrl}" data-file-name="${image.name}">
                <i class="fa fa-download"></i> 下载
            </span>
        </div>
    `;

    // 绑定大图预览事件
    card.querySelector('.preview-img').addEventListener('click', () => {
        showPreviewModal(image.url);
    });

    // 绑定下载事件
    card.querySelector('.download-btn').addEventListener('click', (e) => {
        const downloadUrl = e.target.closest('.download-btn').dataset.downloadUrl;
        const fileName = e.target.closest('.download-btn').dataset.fileName;
        downloadImage(downloadUrl, fileName);
    });

    return card;
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

// ========== 分类筛选事件绑定 ==========
function bindCategoryFilterEvent() {
    const categorySelect = document.getElementById('categorySelect');
    categorySelect.addEventListener('change', (e) => {
        const selectedCategory = e.target.value;
        const allCards = document.querySelectorAll('.image-card');

        allCards.forEach(card => {
            if (selectedCategory === 'all' || card.dataset.category === selectedCategory) {
                card.style.display = 'block';
            } else {
                card.style.display = 'none';
            }
        });
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
    document.getElementById('dropArea').classList.add('bg-blue-100');
    document.getElementById('dropArea').classList.add('border-blue-600');
}

// ========== 工具函数：取消高亮 ==========
function unhighlight() {
    document.getElementById('dropArea').classList.remove('bg-blue-100');
    document.getElementById('dropArea').classList.remove('border-blue-600');
}

// ========== 工具函数：处理拖放文件 ==========
function handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    handleFiles(files);
}

// ========== 工具函数：处理上传文件 ==========
async function handleFiles(files) {
    const categorySelect = document.getElementById('categorySelect');
    // 4. 修改默认上传分类为中文（核心！）
    const selectedCategory = categorySelect.value === 'all' ? '好图' : categorySelect.value;
    const dropArea = document.getElementById('dropArea');

    // 遍历文件并上传
    for (const file of files) {
        // 验证文件类型和大小
        if (!file.type.startsWith('image/')) {
            alert(`「${file.name}」不是图片文件，跳过`);
            continue;
        }
        if (file.size > 10 * 1024 * 1024) {
            alert(`「${file.name}」超过10MB，跳过`);
            continue;
        }

        // 显示上传中状态
        dropArea.innerHTML = `<span class="loading mr-2"></span> 正在上传：${file.name}...`;

        try {
            // 1. 将图片转为Base64
            const base64 = await fileToBase64(file);
            // 2. 上传到GitHub仓库
            await uploadToGitHub(base64, file.name, selectedCategory);
            // 3. 重新加载图片列表
            loadAllImages();

        } catch (error) {
            console.error('上传失败：', error);
            alert(`「${file.name}」上传失败：${error.message}`);
        }
    }

    // 恢复拖传区域提示
    dropArea.innerHTML = `
        <i class="fa fa-cloud-upload text-5xl text-blue-500 mb-4"></i>
        <p class="text-xl text-gray-700">拖入图片到此处上传，或点击上方「上传图片」按钮</p>
        <p class="text-sm text-gray-500 mt-2">支持JPG/PNG/WebP格式，单张不超过10MB</p>
    `;

    // 清空文件选择框
    document.getElementById('fileInput').value = '';
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
async function uploadToGitHub(base64Content, fileName, category) {
    const filePath = `${category}/${fileName}`;
    const apiUrl = `https://api.github.com/repos/${CONFIG.githubUsername}/${CONFIG.repoName}/contents/${filePath}`;

    const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${CONFIG.token}`,
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            message: `Upload image: ${fileName} to ${category}`,
            content: base64Content,
            branch: 'main' // 仓库主分支，默认main（旧仓库可能是master）
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
