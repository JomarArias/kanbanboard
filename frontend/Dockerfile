# Stage 1: Build the Angular frontend
FROM node:20-slim AS builder

WORKDIR /usr/src/app

# Cache dependencies
COPY package*.json ./

# Install build tools needed for native dependencies like lmdb
RUN apt-get update && apt-get install -y python3 make g++

# Install dependencies using npm install (bypass strict lockfile sync and peer dependency conflicts)
RUN npm install --legacy-peer-deps

# Define build time arguments for Firebase
ARG FIREBASE_API_KEY
ARG FIREBASE_AUTH_DOMAIN
ARG FIREBASE_PROJECT_ID
ARG FIREBASE_STORAGE_BUCKET
ARG FIREBASE_MESSAGING_SENDER_ID
ARG FIREBASE_APP_ID
ARG FIREBASE_MEASUREMENT_ID

# Make them available as environment variables during build
ENV FIREBASE_API_KEY=$FIREBASE_API_KEY
ENV FIREBASE_AUTH_DOMAIN=$FIREBASE_AUTH_DOMAIN
ENV FIREBASE_PROJECT_ID=$FIREBASE_PROJECT_ID
ENV FIREBASE_STORAGE_BUCKET=$FIREBASE_STORAGE_BUCKET
ENV FIREBASE_MESSAGING_SENDER_ID=$FIREBASE_MESSAGING_SENDER_ID
ENV FIREBASE_APP_ID=$FIREBASE_APP_ID
ENV FIREBASE_MEASUREMENT_ID=$FIREBASE_MEASUREMENT_ID

# Copy the rest of the application code
COPY . .

# Build the Application
# Using npm run build so it creates the production bundle
RUN npm run build

# Stage 2: Serve the application with Nginx (very lightweight)
FROM nginx:alpine

# Remove default nginx website
RUN rm -rf /usr/share/nginx/html/*

# Copy the generated output from the builder stage
# Angular 19 might output to dist/frontend/browser or similar. We will copy all from dist/frontend/browser
COPY --from=builder /usr/src/app/dist/frontend/browser /usr/share/nginx/html

# If the output directory is totally custom, please adjust the above path. Usually it's dist/<project-name>/browser

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
