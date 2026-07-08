# Use a lightweight version of Node.js


# To this:
FROM node:22-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy the package.json files first to install dependencies
COPY package*.json ./

# Install the backend dependencies
RUN npm install

# Copy all the rest of your backend code into the container
COPY . .

# Expose the port your Express server runs on
EXPOSE 5000

# The command to start your backend server
CMD ["node", "server.js"]