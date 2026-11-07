#!/usr/bin/env bash
# Exit immediately if any command fails (-e), treat unset variables as errors (-u), and propagate pipe errors (-o pipefail)
set -euo pipefail

# Create necessary directories for MongoDB database storage and log files
mkdir -p /data/db /var/log/mongodb

# Start MongoDB daemon listening on all network interfaces with database and log configuration
mongod --bind_ip_all --dbpath /data/db --logpath /var/log/mongodb/mongod.log --fork
# Start Redis server as a background daemon with protected mode disabled for Docker networking
redis-server --daemonize yes --protected-mode no

# Start Toxiproxy and route the example's Redis traffic through it.
toxiproxy-server >/var/log/toxiproxy.log 2>&1 &
TOXIPROXY_PID=$!

until curl -fsS http://127.0.0.1:8474/version >/dev/null; do
  sleep 1
done

curl -fsS -X POST http://127.0.0.1:8474/proxies \
  -H 'Content-Type: application/json' \
  -d '{"name":"redis","listen":"127.0.0.1:6380","upstream":"127.0.0.1:6379","enabled":true}' >/dev/null

# Wait for MongoDB to become ready by attempting to ping it
until mongosh --quiet --eval 'db.runCommand({ping: 1}).ok' >/dev/null; do
  sleep 1
done

# Wait for Redis to become ready by attempting to ping it
until redis-cli ping >/dev/null; do
  sleep 1
done

until redis-cli -p 6380 ping >/dev/null; do
  sleep 1
done

# Compile TypeScript source code to JavaScript
yarn build
# Compile TypeScript examples using the examples-specific configuration
yarn tsc -p tsconfig.examples.json
# Run the compiled example application
node dist-examples/examples/1/1.js

kill "$TOXIPROXY_PID" 2>/dev/null || true
