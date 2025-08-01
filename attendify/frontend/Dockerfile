# Step 1: Build the React app
FROM node:20-alpine AS builder

# Set working directory inside the container
WORKDIR /app

# Install dependencies
COPY package.json package-lock.json* ./
RUN npm install

# Copy the entire project
COPY . .

# Build the React app for production
RUN npm run build

# Step 2: Use nginx to serve the production build
FROM nginx:alpine

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built files from builder
COPY --from=builder /app/dist  /usr/share/nginx/html

# Optional: Add custom nginx config (uncomment below if needed)
# COPY nginx.conf /etc/nginx/nginx.conf

# Expose port 80
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
