# Stage 1: Build the application
FROM node

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json /app

# Install ffmpeg
RUN apt-get update -y
RUN apt-get upgrade -y
RUN apt-get install ffmpeg -y

# Install dependencies
RUN npm install

# Set upload server environment variable
# ENV VITE_UPLOAD_SERVER="http://localhost:3000/upload"

# Copy the rest of the application code
COPY . .


# Expose port 5173
EXPOSE 5173

# Define the command to run the application
CMD ["sh", "-c", "npm run dev -- --host"]