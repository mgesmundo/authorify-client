#!/bin/bash
echo 'browserify...' && \
browserify ./index.js -o build/authorify.bundle.js && \
cd build && \
echo 'bundle...' && \
cat forge.bundle.js jsface.bundle.js authorify.bundle.js > authorify.js && \
echo 'done'