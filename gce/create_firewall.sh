#!/bin/bash
# Script to automate GCE Firewall Rules for HackKnow

echo "🚀 Creating firewall rules for HTTP (80) and HTTPS (443)..."

# 1. Create rule for HTTP
gcloud compute firewall-rules create allow-http-hackknow     --description="Allow incoming HTTP traffic on port 80"     --direction=INGRESS     --priority=1000     --network=default     --action=ALLOW     --rules=tcp:80     --source-ranges=0.0.0.0/0

# 2. Create rule for HTTPS
gcloud compute firewall-rules create allow-https-hackknow     --description="Allow incoming HTTPS traffic on port 443"     --direction=INGRESS     --priority=1000     --network=default     --action=ALLOW     --rules=tcp:443     --source-ranges=0.0.0.0/0

echo "✅ Firewall rules created successfully."
echo "List of active firewall rules:"
gcloud compute firewall-rules list --filter="name~'hackknow'"
