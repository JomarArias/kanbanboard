# Stage 1: Build the backend
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Only copy package files to utilize Docker cache for dependencies
COPY package*.json ./

# Install all dependencies using npm install (since package-lock.json was out of sync)
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the TypeScript code
RUN npm run build

# Stage 2: Production environment
FROM node:20-alpine AS production

WORKDIR /usr/src/app

# Copy package files again
COPY package*.json ./

# Install ONLY production dependencies to keep image size small
RUN npm install --omit=dev

# Copy only the compiled code from the builder stage
COPY --from=builder /usr/src/app/build ./build
# Note: we also might need api/ if it contains runtime files, but based on tsconfig outDir is build
# We might need socket-test.js or other root files if called, but 'npm start' points to build/src/index.js

CMD ["npm", "start"]
