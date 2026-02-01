# Ride-Hailing Dispatch System Bug Remediation Plan

## 1. Executive Summary - Root Causes

- **Missing idempotency checks**: Dispatch workers process duplicate events without deduplication, causing declined requests to be re-sent to drivers
- **Race conditions in state transitions**: Concurrent DECLINE and DISPATCH events lack atomic transaction boundaries and optimistic locking
- **Stale cache/eventual consistency**: Location/pickup data served from outdated cache or multiple event sources without sequence ordering
- **Message broker redelivery**: Failed ACKs or consumer crashes cause message reprocessing without idempotency keys

## 2. Required Artifacts for Diagnosis

### Logs & Traces
- [ ] Last 24h of dispatch worker logs (filter: `request_id`, `driver_id`, `event_type`, `timestamp`)
- [ ] Trace IDs for specific incidents (distributed tracing: Jaeger/Zipkin)
- [ ] Message broker metrics (redelivery count, DLQ depth, processing latency)
- [ ] Push notification/WebSocket server logs (sent notifications with timestamps)

### Database Schema
```sql
-- Provide schema for:
SHOW CREATE TABLE ride_requests;
SHOW CREATE TABLE dispatch_log;
SHOW CREATE TABLE driver_notifications;
SHOW CREATE TABLE request_state_audit;
```

### Code Files
- [ ] Dispatch worker/consumer code (event handlers)
- [ ] Ride request state machine logic
- [ ] Database transaction code for status updates
- [ ] Message broker producer/consumer configuration
- [ ] WebSocket/push notification sender code
- [ ] Cache invalidation logic (Redis pub/sub if used)

### Queue/Broker Metrics
- [ ] SQS/RabbitMQ/Kafka: visibility timeout, max receive count, DLQ config
- [ ] Consumer group lag (Kafka) or in-flight message count
- [ ] ACK/NACK rates and error rates

### Sample Payloads
- [ ] Example dispatch event JSON
- [ ] Example decline event JSON
- [ ] Request/response from driver app (accept/decline API)

## 3. Step-by-Step Debugging Plan

### Step 1: Identify Duplicate Dispatches
**Command**:
```sql
-- Find requests declined but dispatched within 5 seconds after decline
SELECT 
    r.id AS request_id,
    r.status,
    r.updated_at AS declined_at,
    d.sent_at AS dispatch_sent_at,
    d.driver_id,
    TIMESTAMPDIFF(SECOND, r.updated_at, d.sent_at) AS seconds_after_decline
FROM ride_requests r
JOIN dispatch_log d ON d.request_id = r.id
WHERE r.status = 'DECLINED'
  AND d.sent_at > r.updated_at
  AND d.sent_at < DATE_ADD(r.updated_at, INTERVAL 10 SECOND)
ORDER BY r.updated_at DESC
LIMIT 100;
```
**Expected**: If rows returned > 0, confirms duplicate dispatch bug.

### Step 2: Check for Missing Idempotency Keys
**Command**:
```sql
-- Find duplicate dispatch events by payload hash
SELECT 
    request_id,
    driver_id,
    COUNT(*) as dispatch_count,
    GROUP_CONCAT(sent_at ORDER BY sent_at) as all_sent_times
FROM dispatch_log
WHERE created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)
GROUP BY request_id, driver_id
HAVING COUNT(*) > 1
ORDER BY dispatch_count DESC;
```
**Expected**: Multiple dispatches for same request+driver = missing dedup.

### Step 3: Check Message Broker Redelivery
**Command** (AWS SQS example):
```bash
aws sqs get-queue-attributes \
  --queue-url https://sqs.region.amazonaws.com/account/dispatch-queue \
  --attribute-names ApproximateNumberOfMessagesNotVisible,ApproximateNumberOfMessages
```
**Expected**: High `NotVisible` count = messages timing out and redelivering.

### Step 4: Verify Transaction Isolation
**Command**:
```sql
-- Check if status updates and dispatch cancellations are atomic
SELECT 
    r.id,
    r.status,
    r.version,
    COUNT(dq.id) as pending_dispatches
FROM ride_requests r
LEFT JOIN dispatch_queue dq ON dq.request_id = r.id AND dq.status = 'PENDING'
WHERE r.status IN ('DECLINED', 'CANCELLED')
GROUP BY r.id
HAVING pending_dispatches > 0;
```
**Expected**: Any rows = dispatch queue not cleaned up atomically.

### Step 5: Location Data Consistency Check
**Command**:
```sql
-- Find requests with mismatched pickup coordinates
SELECT 
    r.id,
    r.pickup_lat,
    r.pickup_lng,
    r.pickup_address,
    rl.lat AS log_lat,
    rl.lng AS log_lng,
    rl.updated_at AS log_time,
    r.updated_at AS request_time
FROM ride_requests r
JOIN request_location_log rl ON rl.request_id = r.id
WHERE ABS(r.pickup_lat - rl.lat) > 0.0001  -- ~11m difference
   OR ABS(r.pickup_lng - rl.lng) > 0.0001
ORDER BY r.created_at DESC
LIMIT 50;
```
**Expected**: Rows indicate stale cache or out-of-order updates.

### Step 6: Check Event Ordering
**Command**:
```sql
-- Verify events have sequence numbers and are processed in order
SELECT 
    request_id,
    event_type,
    sequence_number,
    created_at,
    processed_at
FROM event_log
WHERE request_id = '<specific_request_id>'
ORDER BY sequence_number;
```
**Expected**: Gaps or out-of-order processing = ordering issue.

## 4. Concrete Fixes

### Fix 1: Atomic Decline + Dispatch Cancellation

**Database Schema Addition**:
```sql
-- Add version column for optimistic locking
ALTER TABLE ride_requests 
ADD COLUMN version INT NOT NULL DEFAULT 0,
ADD INDEX idx_status_version (status, version);

-- Add idempotency key to dispatch log
ALTER TABLE dispatch_log
ADD COLUMN idempotency_key VARCHAR(64) UNIQUE,
ADD INDEX idx_idempotency (idempotency_key);
```

**Code Fix** (Pseudocode):
```python
def decline_request(request_id, driver_id, reason):
    """Atomically decline request and cancel pending dispatches"""
    with db.transaction():
        # Lock row and get current state
        request = db.execute(
            "SELECT id, status, version FROM ride_requests WHERE id = %s FOR UPDATE",
            (request_id,)
        ).fetchone()
        
        if request['status'] not in ['PENDING', 'SEARCHING']:
            # Already processed, idempotent return
            return {'success': True, 'already_processed': True}
        
        # Update status with version bump
        db.execute("""
            UPDATE ride_requests 
            SET status = 'DECLINED',
                declined_by = %s,
                decline_reason = %s,
                version = version + 1,
                updated_at = NOW()
            WHERE id = %s AND version = %s
        """, (driver_id, reason, request_id, request['version']))
        
        if db.rowcount == 0:
            # Version mismatch = concurrent update
            raise ConcurrentModificationError()
        
        # Cancel all pending dispatches atomically
        db.execute("""
            DELETE FROM dispatch_queue 
            WHERE request_id = %s AND status = 'PENDING'
        """, (request_id,))
        
        # Publish decline event with new version
        publish_event('request.declined', {
            'request_id': request_id,
            'version': request['version'] + 1,
            'timestamp': time.time()
        })
        
    # Invalidate cache outside transaction
    cache.delete(f"request:{request_id}")
    cache.publish('request:invalidate', request_id)
    
    return {'success': True}
```

### Fix 2: Idempotent Dispatch Worker

**Code Fix**:
```python
import hashlib
import redis

redis_client = redis.Redis()

def process_dispatch_event(event):
    """Idempotent dispatch event processor"""
    # Generate idempotency key
    idem_key = f"dispatch:{event['request_id']}:{event['driver_id']}:{event['sequence']}"
    
    # Check if already processed (Redis SET NX with TTL)
    if not redis_client.set(idem_key, '1', nx=True, ex=3600):
        logger.info(f"Duplicate event {idem_key}, skipping")
        return ack_message(event)
    
    try:
        # Acquire distributed lock
        lock = redis_client.lock(f"lock:request:{event['request_id']}", timeout=10)
        if not lock.acquire(blocking=True, blocking_timeout=5):
            raise LockTimeout()
        
        try:
            # Verify request is still in dispatchable state
            request = db.execute("""
                SELECT id, status, version 
                FROM ride_requests 
                WHERE id = %s AND status IN ('PENDING', 'SEARCHING')
            """, (event['request_id'],)).fetchone()
            
            if not request:
                logger.warning(f"Request {event['request_id']} not dispatchable, skipping")
                return ack_message(event)
            
            # Check version to ensure we're not processing stale event
            if event.get('version') and event['version'] < request['version']:
                logger.warning(f"Stale event version {event['version']} < {request['version']}")
                return ack_message(event)
            
            # Insert dispatch log with idempotency key
            db.execute("""
                INSERT INTO dispatch_log 
                (request_id, driver_id, sent_at, idempotency_key)
                VALUES (%s, %s, NOW(), %s)
                ON DUPLICATE KEY UPDATE sent_at = sent_at  -- No-op if exists
            """, (event['request_id'], event['driver_id'], idem_key))
            
            # Send push notification
            send_push_notification(event['driver_id'], {
                'type': 'NEW_RIDE_REQUEST',
                'request_id': event['request_id'],
                'version': request['version']
            })
            
        finally:
            lock.release()
        
        return ack_message(event)
        
    except Exception as e:
        logger.error(f"Dispatch failed: {e}")
        # NACK message for retry (will be reprocessed with same idempotency key)
        return nack_message(event)
```

### Fix 3: Location Update with Sequence Ordering

**Database Schema**:
```sql
ALTER TABLE ride_requests
ADD COLUMN location_sequence BIGINT NOT NULL DEFAULT 0,
ADD COLUMN location_updated_at TIMESTAMP NULL,
ADD INDEX idx_location_seq (id, location_sequence);
```

**Code Fix**:
```python
def update_pickup_location(request_id, lat, lng, address, sequence_number):
    """Update location only if sequence is newer"""
    with db.transaction():
        current = db.execute("""
            SELECT location_sequence, pickup_lat, pickup_lng
            FROM ride_requests
            WHERE id = %s
            FOR UPDATE
        """, (request_id,)).fetchone()
        
        if sequence_number <= current['location_sequence']:
            logger.info(f"Ignoring stale location update seq={sequence_number}")
            return {'success': True, 'ignored': True}
        
        # Normalize coordinates (round to 6 decimals = ~0.11m precision)
        lat_normalized = round(float(lat), 6)
        lng_normalized = round(float(lng), 6)
        
        db.execute("""
            UPDATE ride_requests
            SET pickup_lat = %s,
                pickup_lng = %s,
                pickup_address = %s,
                location_sequence = %s,
                location_updated_at = NOW()
            WHERE id = %s
        """, (lat_normalized, lng_normalized, address, sequence_number, request_id))
        
        # Log location change for audit
        db.execute("""
            INSERT INTO request_location_log
            (request_id, lat, lng, address, sequence, updated_at)
            VALUES (%s, %s, %s, %s, %s, NOW())
        """, (request_id, lat_normalized, lng_normalized, address, sequence_number))
    
    # Invalidate cache
    cache.delete(f"request:{request_id}")
    
    return {'success': True}
```

### Fix 4: Message Broker Configuration

**AWS SQS Settings**:
```json
{
  "QueueName": "dispatch-queue",
  "Attributes": {
    "VisibilityTimeout": "30",
    "MessageRetentionPeriod": "345600",
    "ReceiveMessageWaitTimeSeconds": "20",
    "RedrivePolicy": {
      "deadLetterTargetArn": "arn:aws:sqs:region:account:dispatch-dlq",
      "maxReceiveCount": "3"
    }
  }
}
```

**Consumer ACK Pattern**:
```python
def consume_messages():
    while True:
        messages = sqs.receive_message(
            QueueUrl=queue_url,
            MaxNumberOfMessages=10,
            WaitTimeSeconds=20
        )
        
        for msg in messages.get('Messages', []):
            try:
                event = json.loads(msg['Body'])
                process_dispatch_event(event)
                
                # ACK only after successful processing
                sqs.delete_message(
                    QueueUrl=queue_url,
                    ReceiptHandle=msg['ReceiptHandle']
                )
            except Exception as e:
                logger.error(f"Processing failed: {e}")
                # Don't delete = message will reappear after visibility timeout
                # After maxReceiveCount, goes to DLQ
```

### Fix 5: WebSocket/Push Notification Deduplication

**Server-Side**:
```python
def send_ride_notification(driver_id, request_id, version):
    """Send notification with dedup on client side"""
    notification_id = f"{request_id}:{version}"
    
    # Check if notification already sent recently
    sent_key = f"notif_sent:{notification_id}:{driver_id}"
    if cache.exists(sent_key):
        logger.info(f"Notification {notification_id} already sent to {driver_id}")
        return
    
    payload = {
        'notification_id': notification_id,
        'type': 'NEW_RIDE_REQUEST',
        'request_id': request_id,
        'version': version,
        'timestamp': int(time.time() * 1000)
    }
    
    # Send via WebSocket or push
    websocket_send(driver_id, payload)
    
    # Mark as sent (TTL 5 minutes)
    cache.setex(sent_key, 300, '1')
```

**Client-Side (Driver App)**:
```javascript
const processedNotifications = new Set();

socket.on('NEW_RIDE_REQUEST', (data) => {
    const notifId = data.notification_id;
    
    // Deduplicate on client
    if (processedNotifications.has(notifId)) {
        console.log('Duplicate notification, ignoring');
        return;
    }
    
    processedNotifications.add(notifId);
    
    // Cleanup old entries (keep last 100)
    if (processedNotifications.size > 100) {
        const first = processedNotifications.values().next().value;
        processedNotifications.delete(first);
    }
    
    // Show ride request UI
    showRideRequest(data.request_id, data.version);
});
```

## 5. Tests & Acceptance Criteria

### Unit Tests

**Test 1: Concurrent Decline**:
```python
def test_concurrent_decline_race_condition():
    """Two drivers declining same request concurrently"""
    request_id = create_test_request()
    
    # Simulate concurrent declines
    with ThreadPoolExecutor(max_workers=2) as executor:
        future1 = executor.submit(decline_request, request_id, 'driver1', 'busy')
        future2 = executor.submit(decline_request, request_id, 'driver2', 'busy')
        
        result1 = future1.result()
        result2 = future2.result()
    
    # One should succeed, one should be idempotent
    assert result1['success'] and result2['success']
    
    # Verify final state
    request = get_request(request_id)
    assert request['status'] == 'DECLINED'
    
    # No pending dispatches
    pending = get_pending_dispatches(request_id)
    assert len(pending) == 0
```

**Test 2: Idempotent Dispatch**:
```python
def test_duplicate_dispatch_event_ignored():
    """Same dispatch event processed twice should only send once"""
    request_id = create_test_request()
    event = {
        'request_id': request_id,
        'driver_id': 'driver1',
        'sequence': 1
    }
    
    # Process same event twice
    process_dispatch_event(event)
    process_dispatch_event(event)
    
    # Verify only one dispatch log entry
    logs = get_dispatch_logs(request_id, 'driver1')
    assert len(logs) == 1
```

**Test 3: Stale Location Update Ignored**:
```python
def test_out_of_order_location_updates():
    """Older location updates should be ignored"""
    request_id = create_test_request()
    
    # Update with sequence 10
    update_pickup_location(request_id, 40.7128, -74.0060, 'NYC', sequence_number=10)
    
    # Try to update with older sequence 5
    result = update_pickup_location(request_id, 34.0522, -118.2437, 'LA', sequence_number=5)
    
    assert result['ignored'] == True
    
    # Verify location is still NYC
    request = get_request(request_id)
    assert abs(request['pickup_lat'] - 40.7128) < 0.0001
```

### Integration Tests

**Test 4: End-to-End Decline Flow**:
```python
def test_decline_cancels_all_pending_dispatches():
    """Declining should prevent further dispatches"""
    request_id = create_test_request()
    
    # Queue dispatches to 3 drivers
    queue_dispatch(request_id, 'driver1')
    queue_dispatch(request_id, 'driver2')
    queue_dispatch(request_id, 'driver3')
    
    # Driver1 declines
    decline_request(request_id, 'driver1', 'busy')
    
    # Process dispatch queue (should skip all)
    process_dispatch_queue()
    
    # Verify no notifications sent to driver2 or driver3
    assert get_notifications('driver2', request_id) == []
    assert get_notifications('driver3', request_id) == []
```

### Manual Reproduction

**Steps**:
1. Create ride request via rider app
2. Observe dispatch to driver A
3. Driver A declines
4. Wait 10 seconds
5. Check driver A's app - should NOT receive same request again
6. Check database: `SELECT * FROM dispatch_log WHERE request_id = '<id>' AND driver_id = '<driver_a>'` - should show only 1 entry

### Monitoring & Alerts

**Metric 1: Duplicate Dispatch Rate**:
```sql
-- Run every 5 minutes
SELECT 
    COUNT(*) as duplicate_dispatches
FROM (
    SELECT request_id, driver_id, COUNT(*) as cnt
    FROM dispatch_log
    WHERE sent_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)
    GROUP BY request_id, driver_id
    HAVING cnt > 1
) duplicates;
```
**Alert**: If `duplicate_dispatches > 0`, page on-call.

**Metric 2: Declined Requests Re-Dispatched**:
```sql
SELECT COUNT(*) as bad_dispatches
FROM ride_requests r
JOIN dispatch_log d ON d.request_id = r.id
WHERE r.status = 'DECLINED'
  AND d.sent_at > r.updated_at
  AND d.sent_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE);
```
**Alert**: If `bad_dispatches > 0`, page on-call.

**Log Pattern**:
```
ERROR: Dispatch sent for DECLINED request request_id=<id> driver_id=<id>
```
**Alert**: If pattern appears > 0 times in 5min window, alert.

**SLO**:
- 99.9% of declined requests should have 0 subsequent dispatches
- 99.5% of dispatch events should be processed exactly once

## 6. Deployment Checklist

### Pre-Deployment

- [ ] Run all unit and integration tests
- [ ] Deploy to staging environment
- [ ] Run load test with 1000 concurrent requests
- [ ] Verify DLQ is configured and monitored
- [ ] Add feature flag `ENABLE_IDEMPOTENT_DISPATCH` (default: false)

### Database Migration

```sql
-- Run during low-traffic window
BEGIN;

-- Add columns (non-blocking in MySQL 5.7+)
ALTER TABLE ride_requests 
ADD COLUMN version INT NOT NULL DEFAULT 0,
ADD COLUMN location_sequence BIGINT NOT NULL DEFAULT 0,
ADD COLUMN location_updated_at TIMESTAMP NULL;

-- Add indexes (may lock table briefly)
ALTER TABLE ride_requests
ADD INDEX idx_status_version (status, version),
ADD INDEX idx_location_seq (id, location_sequence);

ALTER TABLE dispatch_log
ADD COLUMN idempotency_key VARCHAR(64),
ADD UNIQUE INDEX idx_idempotency (idempotency_key);

COMMIT;

-- Backfill version numbers (run in batches)
UPDATE ride_requests SET version = 1 WHERE version = 0 LIMIT 10000;
```

### Deployment Steps

1. **Phase 1: Deploy with feature flag OFF** (0% traffic)
   - Deploy new code to all workers
   - Verify no errors in logs
   - Monitor error rates

2. **Phase 2: Enable for 10% of requests**
   - Set `ENABLE_IDEMPOTENT_DISPATCH = true` for 10% via feature flag
   - Monitor duplicate dispatch metrics
   - Check DLQ depth

3. **Phase 3: Ramp to 50%**
   - If metrics good, increase to 50%
   - Monitor for 2 hours

4. **Phase 4: Full rollout (100%)**
   - Enable for all traffic
   - Monitor for 24 hours

### Rollback Plan

**Immediate Rollback** (if error rate > 1%):
```bash
# Disable feature flag
curl -X POST https://feature-flags/api/flags/ENABLE_IDEMPOTENT_DISPATCH \
  -d '{"enabled": false}'

# Redeploy previous version
kubectl rollout undo deployment/dispatch-worker
```

**Database Rollback**:
```sql
-- If needed, remove new columns (non-blocking)
ALTER TABLE ride_requests 
DROP COLUMN version,
DROP COLUMN location_sequence,
DROP COLUMN location_updated_at;

ALTER TABLE dispatch_log
DROP COLUMN idempotency_key;
```

## 7. Time & Risk Estimates

| Task | Time Estimate | Risk Level | Priority |
|------|---------------|------------|----------|
| Add DB columns & indexes | 2 hours | LOW | P0 |
| Implement atomic decline | 4 hours | MEDIUM | P0 |
| Add idempotency to dispatch worker | 6 hours | MEDIUM | P0 |
| Location sequence ordering | 4 hours | LOW | P1 |
| Message broker config tuning | 2 hours | LOW | P1 |
| WebSocket dedup (server) | 3 hours | LOW | P2 |
| Client-side dedup | 2 hours | LOW | P2 |
| Unit tests | 4 hours | LOW | P0 |
| Integration tests | 6 hours | MEDIUM | P0 |
| Monitoring/alerts | 3 hours | LOW | P0 |
| Staging deployment & testing | 4 hours | LOW | P0 |
| **Total** | **40 hours** | | |

**Quick Hotfix** (4-6 hours):
- Add idempotency key check in dispatch worker
- Add Redis dedup for notifications
- Deploy with feature flag

**Full Fix** (1-2 weeks):
- All items above
- Comprehensive testing
- Gradual rollout

**Risk Assessment**:
- **HIGH RISK**: Database migration on large tables (use online DDL)
- **MEDIUM RISK**: Distributed lock contention (monitor lock timeouts)
- **LOW RISK**: Feature flag rollout (easy rollback)
