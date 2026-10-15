# Nine Grid Sudoku 部署指南

## 快速部署到 Netlify（推荐）

### 方法 1：拖拽部署（最简单）
1. 登录 https://app.netlify.com
2. 进入 "Sites" 页面
3. 找到 "Deploy manually" 区域
4. 把 `sudoku-replica` 文件夹拖进去
5. 等待几秒，自动生成链接

### 方法 2：连接 GitHub（自动部署）
1. 登录 Netlify → "Add new site" → "Import an existing project"
2. 选择 GitHub
3. 找到 `WilliamHE-cyber/nine-grid-sudoku` 仓库
4. 点击 "Deploy site"
5. 设置：
   - Build command: `echo "No build needed"`
   - Publish directory: `.`
6. 点击 "Deploy nine-grid-sudoku"

### 自定义域名（可选）
1. 部署完成后，进入站点设置
2. 点击 "Domain settings"
3. 点击 "Add custom domain"
4. 输入你想要的子域名，如 `nine-grid.netlify.app`
5. 按提示配置 DNS（如果是自定义域名）

## 当前文件结构
```
sudoku-replica/
├── index.html          # 主界面（含双语+Ask Anna）
├── sudoku-core.js      # 核心算法
├── netlify.toml        # Netlify 配置
├── .github/workflows/  # GitHub Actions 配置
└── DEPLOY.md           # 本说明文件
```

## 功能说明
- 6 档难度：Fast/Easy/Medium/Hard/Expert/Giant
- 中英双语切换
- Ask Anna 智能提示（犯错 3 次后触发）
- 下载引导 CTA（引导下载 Anna App）
- 4 套主题：浅色/夜间/深色/护眼
