#!/bin/bash

# Entrypoint script for PBS Collector service
# This script starts cron in the foreground and handles signals

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "Starting PBS Collector service..."

# Set up cron job with environment variables
# Create a wrapper script that preserves environment
cat > /app/cron-wrapper.sh << EOF
#!/bin/bash
# Wrapper script to preserve environment variables for cron
export PBS_SERVER_NAME="${PBS_SERVER_NAME}"
export PBS_DATA_PATH="${PBS_DATA_PATH}"
export PBSCALLER_PATH="${PBSCALLER_PATH}"
export KEYTAB_PATH="${KEYTAB_PATH}"
export KEYTAB_USER="${KEYTAB_USER}"
/app/collect-pbs-data.sh >> /var/log/pbs-collector/collect.log 2>&1
EOF

chmod +x /app/cron-wrapper.sh

# Set up cron job to run every 2 minutes to avoid conflicts
# Collection takes less then 30 seconds, so 2 minute interval gives plenty of buffer
echo "*/2 * * * * /app/cron-wrapper.sh" | crontab -

log "Cron job configured to run every 2 minutes"

# Run initial collection immediately (don't wait for first cron run)
log "Running initial PBS data collection..."
/app/collect-pbs-data.sh || log "WARNING: Initial collection failed, will retry on next cron run"

# Start cron in foreground
log "Starting cron daemon..."
exec cron -f
