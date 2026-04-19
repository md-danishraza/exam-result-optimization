# Base image
FROM node:18-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
COPY package*.json ./
RUN npm install

# Bundle app source
COPY . .

# Compile TypeScript
RUN npm run build

# Expose port (Override this in docker-compose)
EXPOSE 3000

# Start the application
CMD [ "npm", "start" ]