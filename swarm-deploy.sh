#!/bin/bash

PREFIX=$1
MASTER_NODE=${PREFIX}-master-1

eval $(docker-machine env $MASTER_NODE)
docker stack deploy --compose-file docker-compose.yml books
