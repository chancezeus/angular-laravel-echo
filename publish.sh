#!/usr/bin/env bash
set -e

npm run release
git push
git push --tags
npm publish dist
