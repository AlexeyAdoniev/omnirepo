#!/usr/bin/env bash
set -euo pipefail

mkdir -p /data/db /var/log/mongodb

mongod --bind_ip_all --dbpath /data/db --logpath /var/log/mongodb/mongod.log --fork
redis-server --daemonize yes --protected-mode no

until mongosh --quiet --eval 'db.runCommand({ping: 1}).ok' >/dev/null; do
  sleep 1
done

until redis-cli ping >/dev/null; do
  sleep 1
done

yarn build
yarn tsc -p tsconfig.examples.json
node dist-examples/examples/1/1.js
