#!/usr/bin/env bash
shopt -s extglob
SHARP_IGNORE_GLOBAL_LIBVIPS=1 npm ci --arch=x64 --platform=linux --production