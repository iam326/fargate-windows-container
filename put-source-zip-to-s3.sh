#!/bin/bash

set -euo pipefail

cd source
zip -r source.zip ./*

BUCKET_NAME="fargate-windows-container-codebuild-<ACCOUNT_ID>"
aws s3 cp source.zip "s3://${BUCKET_NAME}/source/source.zip"

rm source.zip