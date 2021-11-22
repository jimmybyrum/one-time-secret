@description('The basename of the application. Must be all lower case letters or numbers. No spaces or special characters.')
param basename string = 'ots'

@allowed([
  'test'
  'prod'
  'dev'
])
@description('The environment. Must be all lower case letters or numbers. No spaces or special characters.')
param env string

param tags object

@description('Cosmos DB account name, max length 44 characters, lowercase')
param accountName string = toLower('cosmos-${basename}-${env}')

@description('Location for the Cosmos DB account.')
var location = resourceGroup().location

@description('The name for the database')
var databaseName = 'db-ots'

var containerName = 'ots'

var accountName_var = toLower(accountName)

var locations = [
  {
    locationName: resourceGroup().location
    failoverPriority: 0
    isZoneRedundant: true
  }
]

resource dbAccount 'Microsoft.DocumentDB/databaseAccounts@2021-01-15' = {
  name: accountName_var
  kind: 'GlobalDocumentDB'
  location: location
  tags: tags
  properties: {
    consistencyPolicy: {
      defaultConsistencyLevel: 'BoundedStaleness'
      maxStalenessPrefix: 100000
      maxIntervalInSeconds: 300
    }
    locations: locations
    databaseAccountOfferType: 'Standard'
    enableAutomaticFailover: true
  }
}

resource dbAccountName 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2021-01-15' = {
  parent: dbAccount
  name: databaseName
  tags: tags
  properties: {
    resource: {
      id: databaseName
    }
  }
}

resource dbContainer 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2021-01-15' = {
  parent: dbAccountName
  name: containerName
  tags: tags
  properties: {
    resource: {
      id: containerName
      partitionKey: {
        paths: [
          '/id'
        ]
        kind: 'Hash'
      }
      indexingPolicy: {
        indexingMode: 'consistent'
        includedPaths: [
          {
            path: '/*'
          }
        ]
      }
      defaultTtl: 3600
    }
    options: {
      autoscaleSettings: {
        maxThroughput: 4000
      }
    }
  }
}
