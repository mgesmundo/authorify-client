#!/bin/bash
mkdir -p build && \
npm install --save-dev . && \
cd node_modules/node-forge && \
npm install --save-dev . && \
npm run bundle && \
cp js/forge.bundle.js ../../build/ && \
cd .. && \
cp jsface/dist/jsface.js ../build/jsface.bundle.js && \
cd .. && \
source bundle.sh