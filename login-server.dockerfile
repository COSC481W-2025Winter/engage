# Use the official Node.js image as the base image
FROM node

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY ./db.js .
COPY ./login-server.js .

# Expose the port the app runs on
EXPOSE 8081

# Command to run the application
CMD ["node", "login-server.js"]