# Add a New Node.js App/Subdomain to OpenLiteSpeed

Example:

```text
api.unixsee.com → 127.0.0.1:5000
```

## 1. Confirm App Port

```bash
sudo ss -ltnp | grep ':5000'
curl -i http://127.0.0.1:5000
```

## 2. Create App Folders

```bash
sudo mkdir -p /var/www/api.unixsee.com
sudo mkdir -p /usr/local/lsws/conf/vhosts/node_api
```

## 3. Create Proxy VHost Config

```bash
sudo tee /usr/local/lsws/conf/vhosts/node_api/vhconf.conf > /dev/null <<'EOF'
docRoot                   /var/www/api.unixsee.com
enableGzip                1

extprocessor node_api_app {
  type                    proxy
  address                 127.0.0.1:5000
  maxConns                100
  initTimeout             60
  retryTimeout            0
  respBuffer              0
}

context / {
  type                    proxy
  handler                 node_api_app
  addDefaultCharset       off
}
EOF
```

## 4. Backup Active VHost File

```bash
sudo cp /usr/local/lsws/conf/httpd-vhosts.conf \
/usr/local/lsws/conf/httpd-vhosts.conf.bak.$(date +%F-%H%M%S)
```

## 5. Add VHost Declaration

```bash
sudo tee -a /usr/local/lsws/conf/httpd-vhosts.conf > /dev/null <<'EOF'

virtualHost node_api {
  vhRoot                  /var/www/api.unixsee.com
  configFile              /usr/local/lsws/conf/vhosts/node_api/vhconf.conf
  allowSymbolLink         1
  enableScript            1
  restrained              1
}
EOF
```

## 6. Backup Listener File

```bash
sudo cp /usr/local/lsws/conf/listeners.conf \
/usr/local/lsws/conf/listeners.conf.bak.$(date +%F-%H%M%S)
```

## 7. Add Listener Map

```bash
sudo nano /usr/local/lsws/conf/listeners.conf
```

Add inside `listener Default`:

```apache
map                     node_api api.unixsee.com
```

Add inside `listener SSL`:

```apache
map                     node_api api.unixsee.com
```

## 8. Restart OpenLiteSpeed

```bash
sudo systemctl restart openlitespeed
sudo systemctl status openlitespeed --no-pager -l
```

## 9. Test Local Routing

```bash
curl -i -H "Host: api.unixsee.com" http://127.0.0.1:80
```

## 10. Test Public Domain

```bash
curl -I --connect-timeout 20 http://api.unixsee.com
```

## 11. Verify Active Config

```bash
sudo grep -nE "virtualHost node_api|configFile|vhRoot" /usr/local/lsws/conf/httpd-vhosts.conf
sudo grep -nE "listener|map.*node_api" /usr/local/lsws/conf/listeners.conf
sudo grep -RniE "127.0.0.1:5000|handler" /usr/local/lsws/conf/vhosts/node_api
```

## 12. Rollback Listener

```bash
LATEST=$(ls -1t /usr/local/lsws/conf/listeners.conf.bak.* | head -1)
sudo cp "$LATEST" /usr/local/lsws/conf/listeners.conf
sudo systemctl restart openlitespeed
```

## Current Pattern

```text
torobsee.unixsee.com → node_torobsee → 127.0.0.1:3000
unixsee.com          → node_unixsee  → 127.0.0.1:3001
core.unixsee.com     → node_core     → 127.0.0.1:4000
api.unixsee.com      → node_api      → 127.0.0.1:5000
```

## Important Paths

```text
Active listener:
 /usr/local/lsws/conf/listeners.conf

Active vhost declarations:
 /usr/local/lsws/conf/httpd-vhosts.conf

Active proxy configs:
 /usr/local/lsws/conf/vhosts/<vhost-name>/vhconf.conf

App folders:
 /var/www/<domain>
```
