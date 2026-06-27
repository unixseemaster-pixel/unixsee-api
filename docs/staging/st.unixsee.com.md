# st.unixsee.com OpenLiteSpeed Setup Note

## Domain

```text
st.unixsee.com
```

## Purpose

`st.unixsee.com` is configured as a staging/private Node.js app domain behind OpenLiteSpeed.

The domain is protected with simple browser username/password authentication using OpenLiteSpeed Basic Auth.

## Current OpenLiteSpeed Mapping

```text
st.unixsee.com → node_staging
```

## Active VHost

```text
node_staging
```

## Active VHost Config File

```text
/usr/local/lsws/conf/vhosts/node_staging/vhconf.conf
```

## App Directory

```text
/var/www/st.unixsee.com
```

## OpenLiteSpeed Important Files

```text
Listener maps:
 /usr/local/lsws/conf/listeners.conf

VHost declarations:
 /usr/local/lsws/conf/httpd-vhosts.conf

Active vhost proxy/auth config:
 /usr/local/lsws/conf/vhosts/node_staging/vhconf.conf
```

## Authentication

Basic Auth has been enabled for `st.unixsee.com`.

Login credentials:

```text
Username: unixsee
Password: 12345679
```

The password is used by the browser as normal login input.
Inside the OpenLiteSpeed auth file, the password is stored in encrypted/hashed format, not as plain text.

## Auth File Location

```text
/usr/local/lsws/conf/vhosts/node_staging/htpasswd
```

## Expected Behavior

When opening:

```text
https://st.unixsee.com
```

the browser should ask for username and password.

Without credentials, the server should return:

```text
401 Unauthorized
```

With correct credentials, the request should be passed to the Node.js app.

## Useful Verification Commands

Check listener map:

```bash
sudo grep -nE "st\.unixsee\.com|node_staging" /usr/local/lsws/conf/listeners.conf
```

Check vhost declaration:

```bash
sudo grep -nE "virtualHost node_staging|configFile|vhRoot" /usr/local/lsws/conf/httpd-vhosts.conf
```

Check vhost config:

```bash
sudo grep -nE "realm|authName|required|htpasswd|context /|handler" /usr/local/lsws/conf/vhosts/node_staging/vhconf.conf
```

Test without login:

```bash
curl -i -H "Host: st.unixsee.com" http://127.0.0.1:80 --max-time 10 | sed -n '1,40p'
```

Expected:

```text
HTTP/1.1 401 Unauthorized
```

Test with login:

```bash
curl -i -u 'unixsee:12345679' -H "Host: st.unixsee.com" http://127.0.0.1:80 --max-time 10 | sed -n '1,60p'
```

Expected result:

```text
HTTP/1.1 200 OK
```

or a valid app redirect such as:

```text
HTTP/1.1 307 Temporary Redirect
```

## Restart Command

After changing OpenLiteSpeed config:

```bash
sudo systemctl restart openlitespeed
sudo systemctl status openlitespeed --no-pager -l
```

## Summary

`st.unixsee.com` is now connected to the `node_staging` OpenLiteSpeed vhost and protected with Basic Auth.

Final access:

```text
URL: https://st.unixsee.com
Username: unixsee
Password: 12345679
```
