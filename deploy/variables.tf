variable "project" {}

variable "credentials_file" {}

variable "DATASTORE" {}

variable "GCP_FIRESTORE_PROJECT_ID" {}

variable "GCP_FIRESTORE_COLLECTION" {}

variable "region" {
  default = "europe-west"
}

variable "zone" {
  default = "europe-west-c"
}
