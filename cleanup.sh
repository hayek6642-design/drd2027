#!/bin/bash
cd /workspaces/drd2027
git clean -fd
git reset --hard HEAD
node server.js
