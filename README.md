# README

Amazon Scraper downloads invoices to Personal Account for tax reasons. Business Account already has bulk download mechanism and don't need this.

This application is secure in that it never stores user credentials. User login and MFA is completely handled by the user manually in the browser. The browser data is persisted in a directory (as per chromium). Thus login is only necessary once (tick Keep user logged in).