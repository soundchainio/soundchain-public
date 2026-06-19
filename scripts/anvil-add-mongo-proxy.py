#!/usr/bin/env python3
"""Append SOCKS proxy params to the MONGODB_URI line of an env file, in place.
Idempotent + secret-safe (never prints the URI). Handles quoted/unquoted values
and existing query strings. Usage: anvil-add-mongo-proxy.py <env-file>"""
import sys
path = sys.argv[1]
PROXY = "proxyHost=127.0.0.1&proxyPort=1080"
with open(path) as f:
    lines = f.readlines()
out, changed = [], False
for ln in lines:
    if ln.startswith("MONGODB_URI=") and "proxyHost=" not in ln:
        key, _, rest = ln.partition("=")
        val = rest.rstrip("\n")
        q = ""
        if len(val) >= 2 and val[0] in "\"'" and val[-1] == val[0]:
            q, val = val[0], val[1:-1]
        val += ("&" if "?" in val else "?") + PROXY
        out.append(f"{key}={q}{val}{q}\n")
        changed = True
    else:
        out.append(ln)
if changed:
    with open(path, "w") as f:
        f.writelines(out)
    print("PATCHED")
else:
    print("ALREADY_OR_MISSING")
