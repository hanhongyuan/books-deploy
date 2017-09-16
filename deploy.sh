#!/bin/bash

SWARM_ID=$(uuidgen | cut -c 1-6)
echo "======>>>>>> Starting swarm with ID $SWARM_ID ..."

./swarm-start.sh $SWARM_ID \
    && echo "======>>>>>> Swarm with ID $SWARM_ID has been started" \
    && sh -x ./swarm-deploy.sh $SWARM_ID \
    && echo "======>>>>>> Books has been deployed" \
    && node release $SWARM_ID \
    && echo "======>>>>>> Books has been released"
