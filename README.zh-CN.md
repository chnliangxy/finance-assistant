# 投资助手

投资助手是一个可自部署的资产跟踪工具，用于管理股票、基金、黄金和白银。它支持自选列表、公开市场实时数据、持仓成本记录、盈亏计算、资产配置图、中英文界面切换，以及本地 SQLite 数据持久化。

## 功能

- 资产总览：展示总资产、总成本、总盈亏和资产配置图。
- 股票自选：支持搜索、刷新、删除、加仓后加权成本计算，以及长按拖拽排序。
- 基金自选：支持净值刷新、删除、加仓后加权成本计算，以及长按拖拽排序。
- 黄金和白银页面：支持价格展示、持仓计算器，以及日/周/月/年趋势图。
- 支持英文和中文界面切换。
- 使用本地 SQLite 保存用户、持仓、自选和成本数据。
- 支持 Docker Compose 部署，并将数据持久化到 `./data`。

## 技术栈

- 前端：React、React Router、Recharts、Axios
- 后端：Node.js、Express、better-sqlite3
- 数据来源：免费公开市场接口，并带离线示例数据兜底
- 部署：Docker Compose、Nginx 前端容器

## 项目结构

```text
finance-assistant/
  backend/          Express API、服务层、SQLite 初始化
  frontend/         React 前端应用
  data/             本地 SQLite 数据目录，已被 git 忽略
  docker-compose.yml
  DEPLOYMENT.md
```

## 本地开发

安装依赖：

```bash
cd backend
npm install

cd ../frontend
npm install
```

启动后端：

```bash
cd backend
npm start
```

启动前端：

```bash
cd frontend
npm start
```

访问：

```text
http://localhost:3000
```

前端开发服务器会将 API 请求代理到：

```text
http://localhost:3001
```

## Docker 部署

```bash
docker compose up -d --build
```

访问：

```text
http://localhost:6605
```

停止：

```bash
docker compose down
```

## 数据持久化

运行数据保存在：

```text
./data/finance.db
```

数据库文件已被 git 忽略。需要备份时请单独复制：

```bash
cp ./data/finance.db ./data/finance.backup.db
```

## 安全说明

- 当前公开数据源方案不需要 API Key。
- 不要提交 `.env` 文件、本地数据库、日志或编译产物。
- `.gitignore` 已忽略 `node_modules`、前端构建目录、SQLite 数据库文件、日志和本地环境文件。

## 验证

前端生产构建：

```bash
cd frontend
npm run build
```

后端语法检查示例：

```bash
node -c backend/server.js
```

## 许可证

暂未指定许可证。
