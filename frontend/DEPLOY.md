# RPI 测评网站 Ubuntu 部署指南

本指南将指导您如何在 Ubuntu 服务器上部署 RPI 测评网站。我们将使用 **Nginx** 作为 Web 服务器，并使用 **PM2** 管理 Node.js API 服务。

## 1. 环境准备

首先，确保您的 Ubuntu 服务器已安装 Node.js (建议 v18+) 和 Nginx。

```bash
# 更新系统包
sudo apt update && sudo apt upgrade -y

# 安装 Node.js (使用 NodeSource)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 Nginx
sudo apt install -y nginx

# 安装 PM2 (用于管理后台进程)
sudo npm install -g pm2
```

## 2. 获取代码与构建

将代码上传到服务器（例如 `/var/www/rpi` 目录）。

```bash
# 进入前端目录
cd /var/www/rpi/frontend

# 安装依赖
npm install

# 编译打包
npm run build
```

## 3. 部署 API 后端服务

我们使用 `prod-server.js` 来处理卡密存储和文件导出。

```bash
# 在 frontend 目录下启动 API 服务
pm2 start prod-server.js --name "rpi-api"

# 设置 PM2 开机自启
pm2 save
pm2 startup
```

## 4. 配置 Nginx

使用我们提供的 `nginx.conf` 内容配置 Nginx。

```bash
# 备份默认配置
sudo mv /etc/nginx/sites-available/default /etc/nginx/sites-available/default.bak

# 创建新配置
sudo nano /etc/nginx/sites-available/rpi
```

将 `frontend/nginx.conf` 的内容粘贴进去，并根据需要修改 `server_name` (您的域名或服务器IP)。

```bash
# 启用配置
sudo ln -s /etc/nginx/sites-available/rpi /etc/nginx/sites-available/

# 检查配置语法
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

## 5. 权限设置

确保 Nginx 有权访问您的文件，且 API 服务有权写入 `data` 目录。

```bash
# 修改目录所属用户 (假设当前用户是 ubuntu)
sudo chown -R ubuntu:www-data /var/www/rpi

# 给 data 目录写入权限
chmod -R 775 /var/www/rpi/frontend/data
```

## 6. 验证部署

1. 访问您的服务器 IP 或域名，应能看到前端页面。
2. 进入后台管理页面，尝试生成一个卡密，检查是否成功写入 `frontend/data/keys.json`。
3. 尝试导出卡密，检查文件是否成功保存在 `frontend/data/` 目录下。

## 维护常用命令

- **查看 API 日志**: `pm2 logs rpi-api`
- **重启 API 服务**: `pm2 restart rpi-api`
- **查看 Nginx 错误日志**: `sudo tail -f /var/log/nginx/error.log`
