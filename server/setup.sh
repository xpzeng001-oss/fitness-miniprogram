#!/bin/bash
# FitTracker API 一键部署脚本
# 用法: ssh root@101.226.18.58 后执行 bash /root/fitness-api/setup.sh

set -e

DIR="/root/fitness-api"
cd "$DIR"

echo "=== 1. 检查 Node.js ==="
if ! command -v node &> /dev/null; then
  echo "安装 Node.js..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
echo "Node: $(node -v), npm: $(npm -v)"

echo "=== 2. 安装依赖 ==="
npm install

echo "=== 3. 检查 .env ==="
if grep -q "your_appid_here" .env; then
  echo "!!! 请先编辑 .env 填入真实的 APP_ID 和 APP_SECRET !!!"
  echo "    vi $DIR/.env"
  exit 1
fi

echo "=== 4. 安装并启动 PM2 ==="
npm install -g pm2
pm2 delete fitness-api 2>/dev/null || true
pm2 start server.js --name fitness-api
pm2 save
pm2 startup | tail -1 | bash 2>/dev/null || true

echo "=== 5. 配置 Nginx ==="
NGINX_CONF=""
# 尝试找到 xckjsoft.cn 的配置文件
for f in /etc/nginx/sites-enabled/* /etc/nginx/conf.d/* /etc/nginx/nginx.conf; do
  if [ -f "$f" ] && grep -q "xckjsoft" "$f" 2>/dev/null; then
    NGINX_CONF="$f"
    break
  fi
done

if [ -n "$NGINX_CONF" ]; then
  if grep -q "proxy_pass.*3000" "$NGINX_CONF"; then
    echo "Nginx 已配置过 /api/ 代理，跳过"
  else
    echo "找到 Nginx 配置: $NGINX_CONF"
    echo "请手动添加以下内容到 server 块中:"
    echo ""
    echo '    location /api/ {'
    echo '        proxy_pass http://127.0.0.1:3000;'
    echo '        proxy_http_version 1.1;'
    echo '        proxy_set_header Host $host;'
    echo '        proxy_set_header X-Real-IP $remote_addr;'
    echo '        client_max_body_size 10m;'
    echo '    }'
    echo ""
    echo "然后执行: nginx -s reload"
  fi
else
  echo "未找到 xckjsoft.cn 的 Nginx 配置，请手动配置"
fi

echo ""
echo "=== 6. 验证 ==="
sleep 1
curl -s -X POST http://127.0.0.1:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{"code":"test"}' && echo ""

echo ""
echo "=== 部署完成 ==="
echo "请确认："
echo "  1. .env 中的 APP_ID 和 APP_SECRET 已填写"
echo "  2. Nginx 已配置 /api/ 反向代理并 reload"
echo "  3. mp.weixin.qq.com 已添加 https://xckjsoft.cn 到 request 合法域名"
