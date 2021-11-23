#!/bin/bash

set -euo pipefail

if [ -z "${1+x}" ]; then
  echo ""
  echo "You need to pass in the env and team. For example:"
  echo "./provision.sh (test|prod) team-devex"
  echo ""
  exit 1
fi

if [[ ! "$PWD" == */deploy ]]; then
  echo "Please run from deploy folder."
  exit 1
fi

env=$1
owner_team=$2
basename=ots
name=${basename}-${env}
rg=rg-${name}
loc=westeurope # Change default location

if [[ ${env} = "prod" ]]; then
    environment_tag="prod"
else
    environment_tag="test"
fi

last_review_tag=$(date '+%Y-%m-%d')
git_commit=$(git rev-parse --short HEAD)

tags="owner=$owner_team confidentiality="internal" environment=$environment_tag personal-data="no" repo=https://github.com/jimmybyrum/one-time-secret/ last-review=$last_review_tag"
arm_tags=$(cat <<-END
{"owner": "team-devex", "confidentiality": "internal", "environment": "$environment_tag", "personal-data": "no", "repo": 'https://github.com/jimmybyrum/one-time-secret/', "last-review": "$last_review_tag"}
END
)

az group create -l $loc -n $rg --tags $tags

parameters=$(cat <<-END
    {"basename": {"value": "$basename"},
     "env": {"value": "$env"},
     "tags": {"value": $arm_tags}}
END
)

az deployment group create -g $rg --template-file ots.bicep --mode Incremental --parameters "$parameters" --name $name
