FROM node:20-bookworm-slim as build

# Set working directory
WORKDIR /opt/ghost

ARG NODE_ENV=production
ENV NODE_ENV $NODE_ENV

ARG DOCKER_FULL=true
ENV DOCKER_FULL $DOCKER_FULL

# Install Python and build tools
RUN apt-get update && apt-get install -y \
    # git - for managing submodules
    git \
    # python + build-essential - for building binary dependencies
    python3 \
    build-essential \
    # libglib2.0-0 + libnss3 - for NX
    libglib2.0-0 \
    libnss3 \
    && rm -rf /var/lib/apt/lists/*


# Copy package.json and yarn.lock files
COPY ../../package.json ../../yarn.lock ./

# # Copy the rest of the application files
# COPY ../../ ./

# Install dependencies
RUN yarn install --verbose > /opt/ghost/yarn-install.log 2>&1 || (cat /opt/ghost/yarn-install.log && false)

# Copy the rest of the application files
# COPY ../../ ./

# Expose the port Ghost runs on
EXPOSE 2368

# Set the command to keep the container running (for debugging)
CMD ["tail", "-f", "/dev/null"]
