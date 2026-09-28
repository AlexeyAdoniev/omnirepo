FROM mongo:7.0-jammy

SHELL ["/bin/bash", "-o", "pipefail", "-c"]

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    redis-server \
  && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
  && apt-get install -y --no-install-recommends nodejs \
  && corepack enable \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

COPY . .
RUN chmod +x docker-entrypoint.sh

ENV MONGODB_URI=mongodb://127.0.0.1:27017/omnirepo_example
ENV REDIS_URL=redis://127.0.0.1:6379

EXPOSE 27017 6379

CMD ["./docker-entrypoint.sh"]
