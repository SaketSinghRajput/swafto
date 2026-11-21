#!/usr/bin/env bash
# Build the EC2 user data for the SWAFTO origin server: fill in the three site values,
# gzip it, and refuse if it is still too big for EC2.
#
# WHY GZIP RATHER THAN SLIMMING THE FILE: cloud-init.yaml is ~30 KB, and EC2 rejects
# user data over 16 KB (raw, before base64). cloud-init detects and unpacks gzip user
# data on its own, so compressing (about 11 KB) changes nothing about what runs, whereas
# slimming means moving the scripts out of the file and into a place the instance must
# then fetch them from - a download at first boot that has to be pinned and verified.
# (Found at first launch, 2026-11-18, when the raw file was rejected.)
#
# The AWS console's user-data box takes TEXT, not binary: it cannot take the output of
# this script. Launch with the CLI, which base64-encodes a fileb:// file itself:
#
#   infra/make-user-data.sh --domain api.example.com [--acme-email ops@example.com] \
#       --bucket swafto-backups-001 --out user-data.yaml.gz
#   aws ec2 run-instances ... --user-data fileb://user-data.yaml.gz
#
# Contains no secrets, by design (see the header of cloud-init.yaml).
set -euo pipefail

here=$(cd "$(dirname "$0")" && pwd)
src="$here/cloud-init.yaml"
out="user-data.yaml.gz"
limit=16384   # EC2's cap on user data, in bytes, before base64
domain=""; email=""; bucket=""; topic=""

usage() { sed -n '2,/^set -euo/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }
while [ $# -gt 0 ]; do
  case "$1" in
    --domain)     domain="$2"; shift 2 ;;
    --acme-email) email="$2"; shift 2 ;;
    --bucket)     bucket="$2"; shift 2 ;;
    --alert-topic-arn) topic="$2"; shift 2 ;;
    --out)        out="$2"; shift 2 ;;
    -h|--help)    usage 0 ;;
    *) echo "make-user-data: unknown argument $1" >&2; usage 2 ;;
  esac
done
[ -n "$domain" ] && [ -n "$bucket" ] || {
  echo "make-user-data: --domain and --bucket are required (--acme-email is optional)" >&2; exit 2; }
# Values land inside a YAML block and a sed expression: allow only what they can legally be.
for v in "$domain" "$email" "$bucket" "$topic"; do
  case "$v" in *[!A-Za-z0-9.@_:/-]*) echo "make-user-data: unexpected character in '$v'" >&2; exit 2 ;; esac
done

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
sed -e "s|^\( *SWAFTO_DOMAIN=\).*|\1${domain}|" \
    -e "s|^\( *SWAFTO_ACME_EMAIL=\).*|\1${email}|" \
    -e "s|^\( *SWAFTO_BACKUP_BUCKET=\).*|\1${bucket}|" \
    -e "s|^\( *SWAFTO_ALERT_TOPIC_ARN=\).*|\1${topic}|" "$src" > "$tmp"
# No ACME e-mail given: an empty `email` directive is a Caddy config error, so drop the line.
[ -n "$email" ] || sed -i '/^ *email {\$SWAFTO_ACME_EMAIL}$/d' "$tmp"

if grep -n 'REPLACE_ME' "$tmp" | grep -v '^[0-9]*: *#'; then
  echo "make-user-data: a REPLACE_ME is left in the output (above)" >&2; exit 1
fi
head -c 13 "$tmp" | grep -q '^#cloud-config' || { echo "make-user-data: not a #cloud-config file" >&2; exit 1; }

gzip -9nc "$tmp" > "$out"
size=$(wc -c < "$out")
if [ "$size" -gt "$limit" ]; then
  echo "make-user-data: $out is $size bytes, over EC2's $limit-byte limit" >&2
  rm -f "$out"; exit 1
fi
gzip -t "$out"
echo "make-user-data: wrote $out ($size bytes of $limit; raw $(wc -c < "$tmp"))"
