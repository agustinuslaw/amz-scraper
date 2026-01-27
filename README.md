# Amazon Scraper

A tool for downloading invoices from Amazon Personal Accounts for tax purposes. Business Accounts already include bulk download functionality and do not require this tool.

## Security

This application does not store user credentials. Authentication and MFA are handled manually by the user through the browser. Browser data persists in a local directory (Chromium profile), enabling persistent login sessions when "Keep me signed in" is selected.

## Prerequisites

- Node.js (version specified in `.node-version`)
- pnpm
- Version manager: fnm + corepack OR volta

## Installation

### Using Volta

```sh
volta install pnpm
```

### Using fnm + corepack

```sh
corepack enable
corepack prepare pnpm@latest --activate
```

### Setup

```sh
pnpm install
pnpm exec playwright install
```

## Usage

```sh
pnpm start
```
