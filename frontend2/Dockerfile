# ------------------------------
# Stage 1: Build Angular app
# ------------------------------
FROM node:22-alpine AS build 
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build for production
# Note: In Angular 17+, the default builder outputs client-side files to dist/<project-name>/browser
# Adjust the path below if your project name is different (check angular.json for "outputPath" or run ng build locally to verify)
RUN npx ng build --configuration production

# ------------------------------
# Stage 2: Serve with Node.js using 'serve'
# ------------------------------
FROM node:22-alpine
WORKDIR /app

# Install lightweight static server
RUN npm install -g serve

# Copy the built browser files from the build stage
# Replace <project-name> with your actual project name if needed
# Common defaults: the folder name under dist/, often the same as your app folder or specified in angular.json
COPY --from=build /app/dist/frontend2/browser ./dist

# Expose port
EXPOSE 8080

# Serve the static files (single-page app mode)
CMD ["serve", "-s", "dist", "-l", "8080"]