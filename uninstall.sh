#!/bin/sh
set -eu

BIN_PATH="${HOME}/.local/bin/termiwallet"
VAULT_DIR="${TERMIWALLET_HOME:-${HOME}/.termiwallet}"

printf '\nTermiWallet uninstaller\n'
printf 'Thanks for using TermiWallet.\n\n'

if [ -e "$BIN_PATH" ]; then
  printf '[1/2] Removing executable...\n'
  rm -f "$BIN_PATH"
  printf 'Removed %s\n' "$BIN_PATH"
else
  printf '[1/2] No TermiWallet executable found at %s.\n' "$BIN_PATH"
fi

printf '\nWould you also like to delete the wallet data directory?\n'
printf 'Directory: %s\n' "$VAULT_DIR"
printf 'WARNING: This permanently deletes your encrypted wallet and account data.\n'
printf 'This action cannot be undone. Make sure you have a verified recovery phrase or backup.\n'
printf 'Delete wallet data? Type DELETE to confirm: '
IFS= read -r ANSWER || ANSWER=''

if [ "$ANSWER" = 'DELETE' ]; then
  if [ -e "$VAULT_DIR" ]; then
    printf '[2/2] Deleting wallet data...\n'
    rm -rf "$VAULT_DIR"
    printf 'Wallet data deleted.\n'
  else
    printf '[2/2] No wallet data directory found.\n'
  fi
else
  printf '[2/2] Wallet data preserved.\n'
fi

printf '\nTermiWallet has been uninstalled.\n'
