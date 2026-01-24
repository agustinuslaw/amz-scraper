# Install Scoop 
Write-Output "Installing Scoop package manager"
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
Invoke-RestMethod -Uri https://get.scoop.sh | Invoke-Expression

Write-Output "Installing Bun runtime"
scoop install bun

Write-Output "Installing Make"
scoop install make

