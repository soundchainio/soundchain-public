# Use official Node.js image
FROM node:18

# Set working directory inside container
WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install global dependencies
RUN npm install -g ts-node

# Install dependencies with legacy peer deps
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Expose the API port
EXPOSE 4000

# Start the application
CMD ["npm", "run", "start"]
