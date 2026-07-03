```
proxy-off

unset UPTIME_PROBE_PROXY_URL
unset UPTIME_PROBE_SKIP_DNS_PREFLIGHT
unset NODE_USE_ENV_PROXY
unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY all_proxy

pm2 restart unixsee-api --update-env
```
