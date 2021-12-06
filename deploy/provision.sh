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
    managed_identity="vipps-ots-app-prod"
else
    environment_tag="test"
    managed_identity="vipps-ots-app-test"
fi

last_review_tag=$(date '+%Y-%m-%d')
git_commit=$(git rev-parse --short HEAD)

tags="owner=$owner_team confidentiality="internal" environment=$environment_tag personal-data="no" repo=https://github.com/vippsas/one-time-secret/ last-review=$last_review_tag"
arm_tags=$(cat <<-END
{"owner": "team-devex", "confidentiality": "internal", "environment": "$environment_tag", "personal-data": "no", "repo": 'https://github.com/vippsas/one-time-secret/', "last-review": "$last_review_tag"}
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

UserObjectId=$(az ad sp list --display-name $managed_identity --query [].objectId -o tsv)
az cosmosdb sql role assignment create --account-name cosmos-ots-test --resource-group rg-ots-test --role-assignment-id cb8ed2d7-2371-4e3c-bd31-6cc1560e84f8 --role-definition-name "Cosmos DB Built-in Data Reader" --scope "/" --principal-id $UserObjectId
