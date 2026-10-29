#!/bin/sh
set -eu

REPO="MateusNavarro77/ethereum-wallet-cli"
BIN_DIR="${HOME}/.local/bin"
TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT HUP INT TERM

printf '\nTermiWallet installer\n'
printf 'Welcome! This will download and install TermiWallet.\n\n'

if ! command -v curl >/dev/null 2>&1; then
  printf 'Error: curl is required to install TermiWallet.\n' >&2
  exit 1
fi

OS="$(uname -s)"
ARCH="$(uname -m)"
case "$OS:$ARCH" in
  Linux:x86_64|Linux:amd64) ASSET="termiwallet-linux-x64" ;;
  Linux:aarch64|Linux:arm64) ASSET="termiwallet-linux-arm64" ;;
  Darwin:x86_64) ASSET="termiwallet-darwin-x64" ;;
  Darwin:arm64) ASSET="termiwallet-darwin-arm64" ;;
  *)
    printf 'Error: unsupported platform: %s %s\n' "$OS" "$ARCH" >&2
    exit 1
    ;;
esac

printf '[1/3] Downloading the latest %s build...\n' "$ASSET"
curl --fail --location --silent --show-error \
  "https://github.com/${REPO}/releases/latest/download/${ASSET}" \
  --output "${TEMP_DIR}/termiwallet"

printf '[2/3] Installing to %s...\n' "$BIN_DIR"
mkdir -p "$BIN_DIR"
install -m 755 "${TEMP_DIR}/termiwallet" "${BIN_DIR}/termiwallet"

printf '[3/3] Setting up your PATH...\n'
case "${SHELL:-}" in
  */zsh) SHELL_CONFIG="${HOME}/.zshrc" ;;
  */bash) SHELL_CONFIG="${HOME}/.bashrc" ;;
  *) SHELL_CONFIG="${HOME}/.profile" ;;
esac
PATH_LINE='export PATH="$HOME/.local/bin:$PATH"'
if ! printf '%s\n' "$PATH" | tr ':' '\n' | grep -Fx "$BIN_DIR" >/dev/null 2>&1; then
  touch "$SHELL_CONFIG"
  if ! grep -Fqx "$PATH_LINE" "$SHELL_CONFIG"; then
    printf '\n# TermiWallet\n%s\n' "$PATH_LINE" >> "$SHELL_CONFIG"
  fi
  printf 'Added %s to %s.\n' "$BIN_DIR" "$SHELL_CONFIG"
else
  printf '%s is already on PATH.\n' "$BIN_DIR"
fi

printf '\nTermiWallet is installed! Start it with: termiwallet\n'
if ! printf '%s\n' "$PATH" | tr ':' '\n' | grep -Fx "$BIN_DIR" >/dev/null 2>&1; then
  printf 'Open a new terminal or run: export PATH="$BIN_DIR:$PATH"\n'
fi
