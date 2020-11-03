#!/usr/bin/env bash

for example in examples/*; do ( 
    cd "$example/node_modules/@rtk-incubator/simple-query" || exit
    cd ../../..
    yarn install
    rm -r node_modules/@rtk-incubator/simple-query/dist
    ln -sv ../../../../../dist node_modules/@rtk-incubator/simple-query/dist
) done