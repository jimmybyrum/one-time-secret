# Vipps One Time Secret - VOTS

VOTS allows you to share secrets securely with other team members or external parties. Once a secret has been viewed, it's gone, forever. No more sending secrets over Slack, email or shouting them out loud. For added security use the password feature and send the password and link separately to your recipient.

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
az cosmosdb sql role assignment create --account-name cosmos-ots-test --resource-group rg-ots-test --role-definition-name "Cosmos DB Built-in Data Contributor" --scope "/" --principal-id $UserObjectId
az cosmosdb sql role assignment create --account-name cosmos-ots-test --resource-group rg-ots-test --role-definition-name "Cosmos DB Built-in Data Reader" --scope "/" --principal-id $UserObjectId

# Prod
export UserObjectId=$(az ad sp list --display-name "vipps-ots-app-prod" --query [].objectId -o tsv)
az cosmosdb sql role assignment create --account-name cosmos-ots-prod --resource-group rg-ots-prod --role-definition-name "Cosmos DB Built-in Data Contributor" --scope "/" --principal-id $UserObjectId
az cosmosdb sql role assignment create --account-name cosmos-ots-test --resource-group rg-ots-test --role-definition-name "Cosmos DB Built-in Data Reader" --scope "/" --principal-id $UserObjectId

```

## I get a 403 when starting locally

You probably do not have the correct RBAC set on the Cosmos DB account.

Run the following to make yourself a contributor:

```bash
export UserObjectId=$(az ad signed-in-user show --query objectId --output tsv)
az cosmosdb sql role assignment create --account-name cosmos-ots-test --resource-group rg-ots-test --role-definition-name "Cosmos DB Built-in Data Contributor" --scope "/" --principal-id $UserObjectId
```
