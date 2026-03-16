const OWNER = "yangkz1208";
const REPO = "image-gallery";
const GITHUB_TOKEN = "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";   // 已替换
const DEFAULT_PASS = "123456";
const FIXED_EMAIL = "你的邮箱@qq.com";   // ← 改成你的邮箱

const folders = ["他人", "好图", "网图", "花草", "风景"];

function updateUI() {
  fetch('https://v1.hitokoto.cn/').then(r=>r.json()).then(d => {
    document.getElementById('dailyQuote').textContent = d.hitokoto;
    document.getElementById('quoteMain').textContent = d.hitokoto;
  });
  setInterval(() => {
    document.getElementById('time').textContent = new Date().toLocaleString('zh-CN');
  }, 1000);
}
updateUI();

function createFolders() {
  const container = document.getElementById('folders');
  container.innerHTML = '';
  folders.forEach(name => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
      <div style="height:200px; background:url('https://picsum.photos/id/${name.length*11}/400/300') center/cover; position:relative;">
        <div style="position:absolute; bottom:0; left:0; right:0; background:linear-gradient(transparent,black); padding:20px;">
          <strong style="font-size:28px;">${name}</strong>
        </div>
      </div>
      <div style="padding:12px; text-align:center; font-size:14px;">拖拽图片上传到这里</div>
    `;
    div.onclick = () => enterFolder(name);
    div.ondragover = e => { e.preventDefault(); div.style.border = '3px solid lime'; };
    div.ondrop = e => { e.preventDefault(); div.style.border = ''; uploadFiles(e.dataTransfer.files, name); };
    container.appendChild(div);
  });
}

function checkPassword() {
  if (document.getElementById('pw').value === DEFAULT_PASS || document.getElementById('pw').value === localStorage.getItem('newPass')) {
    document.getElementById('overlay').style.display = 'none';
    document.getElementById('main').classList.remove('hidden');
    createFolders();
    alert('✅ Token 已生效！全权限可用');
  } else alert('密码错误');
}

async function guestMode() {
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('main').classList.remove('hidden');
  createFolders();
  alert('访客模式已开启');
  const ip = await fetch('https://api.ipify.org?format=json').then(r=>r.json());
  const content = btoa(`访客 ${new Date()} IP:${ip.ip}\n`);
  fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/logs/guest.log`, {
    method:'PUT',
    headers:{'Authorization':`token ${GITHUB_TOKEN}`},
    body:JSON.stringify({message:"访客记录", content, branch:"main"})
  });
}

function changePassword() {
  alert(`验证码发送到 ${FIXED_EMAIL}（模拟：123456）`);
  if (prompt('输入验证码') === '123456') {
    const np = prompt('新密码');
    if (np) { localStorage.setItem('newPass', np); alert('密码已改'); location.reload(); }
  }
}

function logout() { location.reload(); }
function enterFolder(name) { alert(`进入【${name}】文件夹`); }

async function uploadFiles(files, folder) {
  for (let f of files) {
    const r = new FileReader();
    r.onload = async () => {
      const base64 = r.result.split(',')[1];
      await fetch(`https://api.github.com/repos/${OWNER}/${REPO}/contents/${folder}/${f.name}`, {
        method: 'PUT',
        headers: { 'Authorization': `token ${GITHUB_TOKEN}` },
        body: JSON.stringify({ message: `上传到 ${folder}`, content: base64, branch: "main" })
      });
      alert(`✅ ${f.name} 已上传到 ${folder}`);
    };
    r.readAsDataURL(f);
  }
}

createFolders();
document.getElementById('pw').focus();
