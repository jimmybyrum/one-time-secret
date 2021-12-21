terraform {
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "4.4.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "4.4.0"
    }
  }
}

provider "google" {
  credentials = file(var.credentials_file)
  project     = var.project
  region      = var.region
  zone        = var.zone
}

provider "google-beta" {
  credentials = file(var.credentials_file)
  project     = var.project
  region      = var.region
  zone        = var.zone
}

resource "google_app_engine_application" "app" {
  provider      = google
  project       = var.project
  location_id   = var.region
  database_type = "CLOUD_FIRESTORE"
}

resource "google_artifact_registry_repository" "main" {
  provider      = google-beta
  location      = var.region_docker
  repository_id = "one-time-secret"
  description   = "Docker repo for OTS"
  format        = "DOCKER"
}

resource "google_cloud_run_service" "webapp" {
  name     = "ots-cloud-run"
  location = var.region_cloud_run

  template {
    spec {
      containers {
        image = "${var.region_docker}-docker.pkg.dev/key-beacon-334717/one-time-secret/ots:latest"
        resources {
          limits = {
            cpu    = 1
            memory = "128Mi"
          }
        }
        env {
          name  = "DATASTORE"
          value = var.DATASTORE
        }
        env {
          name  = "GCP_FIRESTORE_PROJECT_ID"
          value = var.GCP_FIRESTORE_PROJECT_ID
        }
        env {
          name  = "GCP_FIRESTORE_COLLECTION"
          value = var.GCP_FIRESTORE_COLLECTION
        }
      }
    }
  }
  autogenerate_revision_name = true
}

resource "google_cloud_run_domain_mapping" "default" {
  location = var.region_cloud_run
  name     = "ots.jimmybyrum.com"

  metadata {
    namespace = "one-time-secret"
  }

  spec {
    route_name = google_cloud_run_service.webapp.name
  }
}


data "google_iam_policy" "noauth" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers",
    ]
  }
}

resource "google_cloud_run_service_iam_policy" "noauth" {
  location    = google_cloud_run_service.webapp.location
  project     = google_cloud_run_service.webapp.project
  service     = google_cloud_run_service.webapp.name
  policy_data = data.google_iam_policy.noauth.policy_data
}

output "url" {
  value = google_cloud_run_service.webapp.status[0].url
}
