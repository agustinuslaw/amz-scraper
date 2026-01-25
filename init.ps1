Write-Output "Installing Scoop package manager"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

Write-Output "Installing fnm (Fast Node Manager) using Scoop"
scoop install fnm

Write-Output "Installing Node.js version 24 using fnm"
fnm install 24
fnm default 24
fnm use 24

Write-Output "Setting up project with pnpm, TypeScript, Playwright, and Biome"
corepack enable pnpm
pnpm init

# Pins pnpm version in package.json
corepack use pnpm@10.x 

# Creates a file so fnm auto-switches when you enter this folder
node -v > .node-version

pnpm add -D typescript @types/node tsx @biomejs/biome cross-env
pnpm add playwright
pnpm exec playwright install chromium

pnpm biome init