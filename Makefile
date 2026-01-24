.PHONY: help install setup run dev format lint check clean clean-session

# Default target
help:
	@echo Available commands:
	@echo   make install        - Install dependencies
	@echo   make setup          - Initial project setup
	@echo   make run            - Run the application
	@echo   make dev            - Run in development mode (auto-reload)
	@echo   make format         - Format code
	@echo   make lint           - Lint code
	@echo   make check          - Format and lint
	@echo   make clean          - Remove downloads
	@echo   make clean-session  - Remove browser session (force re-login)

# Install dependencies
install:
	bun install
	bunx playwright install chromium

# Initial setup (run once)
setup:
	@if [ ! -f .env ]; then \
		cp .env.example .env; \
		echo Created .env file. Please edit it with your credentials.; \
	else \
		echo .env file already exists. Skipping.; \
	fi
	@make install
	@mkdir -p downloads

# Run the application
run:
	bun run src/index.ts

# Development mode with auto-reload
dev:
	bun --watch src/index.ts

# Format code
format:
	bun run format

# Lint code
lint:
	bun run lint

# Format and lint
check:
	bun run check

# Clean generated files
clean:
	rm -rf downloads/*
	@echo "✅ Cleaned downloads directory"

# Remove browser session (force re-login on next run)
clean-session:
	rm -rf browser-data/*
	@echo "✅ Cleared browser session. You'll need to log in again on next run."