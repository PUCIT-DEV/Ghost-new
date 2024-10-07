ARG NODE_VERSION=20.15.1

## Stage 0
FROM node:$NODE_VERSION-bullseye

# Set the working directory in the container
WORKDIR /home/ghost

# Copy everything over
COPY . .

# Remove everything but the package.json files
RUN find ghost \! -name "package.json" -mindepth 2 -maxdepth 2 -print | xargs rm -rf
RUN find apps \! -name "package.json" -mindepth 2 -maxdepth 2 -print | xargs rm -rf

## Stage 1
FROM node:$NODE_VERSION-bullseye
WORKDIR /home/ghost

COPY --from=0 /home/ghost .

# Install dependencies
RUN yarn install

# Copy all the rest of the application code
COPY . .

ENV NX_DAEMON=true

# Expose the port the app runs on
EXPOSE 2368

# Define the command to run the app
CMD ["yarn", "dev"]

