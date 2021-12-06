# one-time-secret

## Local setup
```bash
npm install
cp ./dbConfig.template.js ./dbConfig.js
# add some valid values to ./dbConfig.js
npm run start
```


# Setup managed identity

```bash
# Test
export UserObjectId=$(az ad sp list --display-name "vipps-ots-app-test" --query [].objectId -o tsv)
az cosmosdb sql role assignment create --account-name cosmos-ots-test --resource-group rg-ots-test --role-assignment-id cb8ed2d7-2371-4e3c-bd31-6cc1560e84f8 --role-definition-name "Cosmos DB Built-in Data Contributor" --scope "/" --principal-id $UserObjectId

# Prod
export UserObjectId=$(az ad sp list --display-name "vipps-ots-app-prod" --query [].objectId -o tsv)
az cosmosdb sql role assignment create --account-name cosmos-ots-prod --resource-group rg-ots-prod --role-assignment-id cb8ed2d7-2371-4e3c-bd31-6cc1560e84f8 --role-definition-name "Cosmos DB Built-in Data Contributor" --scope "/" --principal-id $UserObjectId

```

## I get a 403 when starting locally

You probably do not have the correct RBAC set on the Cosmos DB account.

Run the following to make yourself a contributor:

```bash
export UserObjectId=$(az ad signed-in-user show --query objectId --output tsv)
az cosmosdb sql role assignment create --account-name cosmos-ots-test --resource-group rg-ots-test --role-assignment-id cb8ed2d7-2371-4e3c-bd31-6cc1560e84f8 --role-definition-name "Cosmos DB Built-in Data Contributor" --scope "/" --principal-id $UserObjectId
```
