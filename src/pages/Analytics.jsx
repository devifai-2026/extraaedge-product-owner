// Analytics — real-time, product-wide API activity graphs across ALL tenants
// (native Recharts, no external Grafana). Fed by /platform/request-log/metrics.
import MetricsDashboard from '../components/MetricsDashboard';

export default function Analytics() {
  return (
    <div style={{ padding: '4px 4px 24px' }}>
      <div style={{ marginBottom: 16 }}>
        <h2 style={{ margin: '0 0 4px' }}>Analytics</h2>
        <div style={{ color: '#64748b', fontSize: 13.5 }}>
          Live API activity across the entire product — every tenant, aggregated. Latency,
          throughput, error rate, status codes and the busiest endpoints.
        </div>
      </div>
      <MetricsDashboard />
    </div>
  );
}
