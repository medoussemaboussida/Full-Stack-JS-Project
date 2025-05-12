# Use a slimmer base image (Alpine variant)
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy only package files first to leverage Docker cache
COPY package*.json ./

# Install dependencies (minimize dev dependencies in production)
RUN npm install --production --silent && \
    npm install --only=dev --silent

# Copy the rest of the application code
COPY . .

# Stage 2: Create the production image
FROM node:18-alpine

WORKDIR /app

# Copy only the necessary files from the builder stage
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/app.js ./
COPY --from=builder /app /app

# Expose the port
EXPOSE 5000

# Use a non-root user for security
USER node

# Start the application
CMD ["node", "app.js"]