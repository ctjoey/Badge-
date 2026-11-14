#!/usr/bin/env bash
# Rebuilds a clean PEM from an App Store Connect .p8 secret, however it was pasted:
# with or without the BEGIN/END lines, joined onto one line, indented, with CRLF endings,
# or base64-encoded as a whole file. Reads the secret from $ASC_KEY_P8, writes PEM to $1.
# Never prints the key.
set -euo pipefail
out="$1"
raw=$(printf '%s' "${ASC_KEY_P8:-}" | tr -d '\r')
if [ -z "$raw" ]; then echo "::error::ASC_KEY_P8 is empty"; exit 1; fi

# Whole file base64-encoded? Decode it first.
if ! printf '%s' "$raw" | grep -q "PRIVATE KEY"; then
  decoded=$(printf '%s' "$raw" | tr -d ' \n\t' | base64 --decode 2>/dev/null | tr -d '\0' || true)
  if printf '%s' "$decoded" | grep -q "BEGIN PRIVATE KEY"; then raw="$decoded"; fi
fi

body=$(printf '%s' "$raw" \
  | sed -e 's/-----BEGIN[A-Z ]*PRIVATE KEY-----//g' -e 's/-----END[A-Z ]*PRIVATE KEY-----//g' \
  | tr -d ' \n\t')
if ! printf '%s' "$body" | grep -Eq '^[A-Za-z0-9+/]+={0,2}$'; then
  echo "::error::ASC_KEY_P8 contains characters that are not part of a .p8 key. Re-paste the file's full contents (open it in a plain text editor)."
  exit 1
fi
{ echo "-----BEGIN PRIVATE KEY-----"; printf '%s\n' "$body" | fold -w 64; echo "-----END PRIVATE KEY-----"; } > "$out"

if ! openssl pkey -in "$out" -noout 2>/dev/null; then
  echo "::error::ASC_KEY_P8 is not a valid private key (it decodes, but isn't an EC key). Make sure you pasted the AuthKey_XXXX.p8 file for the key whose ID is in ASC_KEY_ID."
  exit 1
fi
echo "App Store Connect key OK ($(wc -l < "$out" | tr -d ' ') lines)."
