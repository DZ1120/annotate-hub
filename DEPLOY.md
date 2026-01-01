# 部署指南

## 🎉 项目已改造为纯前端应用！

项目现在可以部署到任何静态网站托管平台，**无需任何服务器**，就像 GitHub Pages 一样！

## ✨ 主要改动

1. ✅ **添加了 localStorage 持久化** - 所有数据自动保存到浏览器本地
2. ✅ **纯前端构建** - 移除了后端依赖
3. ✅ **部署配置** - 已配置好 Vercel、Netlify、GitHub Pages

## 🚀 快速部署（3 种方式）

### 方式 1：Vercel（最简单，推荐）

**步骤：**

1. 访问 [vercel.com](https://vercel.com) 并登录（可以用 GitHub 账号）
2. 点击 "Add New Project"
3. 导入你的 GitHub 仓库
4. 点击 "Deploy"
5. 完成！几分钟后你的网站就会上线

**或者使用命令行：**

```bash
npm install -g vercel
vercel
```

### 方式 2：Netlify

**步骤：**

1. 访问 [netlify.com](https://www.netlify.com) 并登录
2. 点击 "Add new site" → "Import an existing project"
3. 连接 GitHub 仓库
4. 构建设置（通常会自动检测）：
   - Build command: `npm run build:static`
   - Publish directory: `dist/public`
5. 点击 "Deploy site"

### 方式 3：GitHub Pages

**步骤：**

1. 将代码推送到 GitHub：
   ```bash
   git add .
   git commit -m "准备部署"
   git push origin main
   ```

2. 在 GitHub 仓库中：
   - 进入 Settings → Pages
   - Source 选择 "GitHub Actions"
   - 工作流会自动运行

3. 访问：`https://你的用户名.github.io/仓库名`

## 📦 本地测试

在部署前，可以先本地测试：

```bash
# 构建静态版本
npm run build:static

# 预览构建结果
npm run preview:static
```

然后访问 `http://localhost:4173` 查看效果。

## 💾 数据存储说明

- **存储位置**：浏览器 localStorage
- **自动保存**：所有操作自动保存
- **数据范围**：每个浏览器独立存储
- **导出功能**：可以通过"导出"按钮保存为 HTML 文件

## 🔧 技术细节

### 构建输出

构建后的文件在 `dist/public` 目录：
- `index.html` - 主页面
- `assets/` - JS 和 CSS 文件

### 部署配置

项目包含以下配置文件：

- `vercel.json` - Vercel 配置
- `netlify.toml` - Netlify 配置  
- `.github/workflows/deploy.yml` - GitHub Pages 配置

这些文件已经配置好，直接使用即可！

## ❓ 常见问题

### Q: 部署后数据会丢失吗？

A: 不会。数据保存在浏览器的 localStorage 中，只要不清理浏览器数据，数据就会一直存在。

### Q: 可以多设备同步吗？

A: 当前版本不支持。每个浏览器独立存储数据。如需同步，可以使用"导出/导入"功能。

### Q: 需要数据库吗？

A: 不需要！这是纯前端应用，所有数据存储在浏览器本地。

### Q: 部署是免费的吗？

A: 是的！Vercel、Netlify、GitHub Pages 都提供免费套餐，足够个人使用。

## 🎯 下一步

部署完成后，你的应用就可以：
- ✅ 24/7 在线运行
- ✅ 无需任何服务器
- ✅ 全球访问
- ✅ 完全免费

享受你的在线图像标注工具吧！🎉


