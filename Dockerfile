
FROM oven/bun:latest
RUN apt-get update && rm -rf /var/lib/apt/lists/*
 
WORKDIR /app
 
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
 
COPY . .
 
EXPOSE 3000
 
CMD ["bun", "index.ts"]
 