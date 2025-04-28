FROM node:18-slim

# Set working directory
WORKDIR /app

# Install dependencies required for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    xdg-utils \
    xvfb \
    dnsutils \
    iputils-ping \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Install Playwright browser
RUN npx playwright install chromium --with-deps

# Copy project files
COPY . .

# Create the screenshots directory
RUN mkdir -p screenshots

# Set environment variables
ENV NODE_ENV=production
ENV PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/google-chrome
ENV PLAYWRIGHT_TIMEOUT=120000
ENV NAVIGATION_TIMEOUT=120000
ENV STABILIZATION_TIME=20000

# Проверка соединения с bubblemaps.io
RUN echo "Checking connectivity to app.bubblemaps.io" && \
    curl -s -o /dev/null -w "%{http_code}\n" https://app.bubblemaps.io || echo "Connection check completed"

# Add a healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

# Start the bot
CMD ["node", "src/index.js"] 