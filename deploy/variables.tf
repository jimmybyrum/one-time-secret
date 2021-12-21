variable "project" {}

variable "credentials_file" {}

variable "DATASTORE" {}

variable "GCP_FIRESTORE_PROJECT_ID" {}

variable "GCP_FIRESTORE_COLLECTION" {}

variable "region" {
  default = "europe-west"
}

variable "region_docker" {
  default = "europe-west3"
}

variable "region_cloud_run" {
  default = "europe-north1"
}

variable "zone" {
  default = "europe-west-c"
}
