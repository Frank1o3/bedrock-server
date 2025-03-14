#!/bin/bash

# Ensure the directory exists
if [ ! -d "/bedrock" ]; then
  echo "Directory /bedrock/app does not exist! Exiting..."
  exit 1
fi

# Change to the directory and start the server
cd /bedrock
LD_LIBRARY_PATH=. ./bedrock_server
