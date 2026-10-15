# Nine Grid Sudoku 部署指南

## 快速部署到 Netlify（推荐）

### 方法 1：拖拽部署（最简单）
1. 登录 https://app.netlify.com
2. 进入 "Sites" 页面
3. 找到 "Deploy manually" 区域
4. 把 `sudoku-replica` 文件夹拖进去
5. 等待几秒，自动生成链接

### 方法 2：连接 GitHub（自动部署，推荐）
> 项目已含 `netlify.toml`，Netlify 会自动读取构建配置，无需手动填。

1. 登录 https://app.netlify.com
2. 点击 **"Add new site" → "Import an existing project"**
3. 选择 **GitHub**，首次需授权 Netlify 访问你的 GitHub 账号
4. 在仓库列表搜索并选择 **`WilliamHE-cyber/nine-grid-sudoku`**
5. Netlify 自动识别 `netlify.toml`，构建命令和发布目录已自动填好（Build command 留空即可，Publish directory 为 `.`）
6. 点击 **"Deploy nine-grid-sudoku"**
7. 构建完成后生成链接，形如 `https://<随机名>.netlify.app`

之后每次 `git push` 到 master，Netlify 会自动重新部署（CI/CD）。

### 自定义域名（可选）
1. 部署完成后，进入站点设置
2. 点击 "Domain settings"
3. 点击 "Add custom domain"
4. 输入你想要的子域名，如 `nine-grid.netlify.app`
5. 按提示配置 DNS（如果是自定义域名）

## 当前文件结构
```
sudoku-replica/
├── index.html              # 主界面（双语 + Ask Anna + PWA 注册）
├── sudoku-core.js          # 核心算法
├── manifest.webmanifest    # PWA 清单（安装到主屏幕的配置）
├── service-worker.js       # 离线缓存（版本号 ninegrid-v1，更新内容时改 v2）
├── icon-512.png / icon-192.png / apple-touch-icon.png / favicon-32.png  # 图标（源：icon.svg）
├── netlify.toml            # Netlify 配置
├── .github/workflows/      # GitHub Actions 配置
└── DEPLOY.md               # 本说明文件
```

## PWA 说明
- **安装**：Android Chrome / iOS Safari 打开线上链接 →「添加到主屏幕」→ 全屏独立 app 运行
- **离线**：首次打开后全部资源缓存，之后断网可玩（进度存在 localStorage，不受影响）
- **范围**：PWA 功能（安装 + 离线）只在 HTTPS 部署（GitHub Pages / Netlify）生效；本地 file:// 直接打开 index.html 时游戏正常，只是不安装不缓存
- **更新缓存**：改了游戏内容后，把 `service-worker.js` 里的 `ninegrid-v1` 改成 `v2` 再部署，老用户下次打开自动刷新

## 功能说明
- 6 档难度：Fast/Easy/Medium/Hard/Expert/Giant
- 中英双语切换
- Ask Anna 智能提示（犯错 3 次后触发）
- 下载引导 CTA（引导下载 Anna App）
- 4 套主题：浅色/夜间/深色/护眼
