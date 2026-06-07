// ═══════════════════════════════════════════════════════════
// Analytics Routes — MTTR, trends, source breakdown
// ═══════════════════════════════════════════════════════════

import { Router } from 'express';
import { getSupabase } from '../db/client.js';
import { authMiddleware, requireOrg } from '../middleware/auth.js';

export function createAnalyticsRoutes(): Router {
  const router = Router();
  router.use(authMiddleware);
  router.use(requireOrg);

  // ─── OVERVIEW STATS ───────────────────────────────
  router.get('/overview', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const orgId = req.orgId!;

      // Total incidents
      const { count: totalIncidents } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId);

      // Open incidents
      const { count: openIncidents } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .in('status', ['open', 'investigating', 'mitigating']);

      // Resolved incidents (for MTTR)
      const { data: resolved } = await supabase
        .from('incidents')
        .select('created_at, resolved_at')
        .eq('org_id', orgId)
        .not('resolved_at', 'is', null);

      // Calculate MTTR
      let mttrMinutes = 0;
      if (resolved && resolved.length > 0) {
        const totalMins = resolved.reduce((sum, inc) => {
          const created = new Date(inc.created_at).getTime();
          const resolvedAt = new Date(inc.resolved_at).getTime();
          return sum + (resolvedAt - created) / (1000 * 60);
        }, 0);
        mttrMinutes = Math.round(totalMins / resolved.length);
      }

      // Incidents by severity
      const { data: bySeverity } = await supabase
        .from('incidents')
        .select('severity')
        .eq('org_id', orgId);

      const severityCounts: Record<string, number> = {};
      bySeverity?.forEach((inc) => {
        severityCounts[inc.severity] = (severityCounts[inc.severity] ?? 0) + 1;
      });

      // Incidents by source
      const { data: bySource } = await supabase
        .from('incidents')
        .select('source')
        .eq('org_id', orgId);

      const sourceCounts: Record<string, number> = {};
      bySource?.forEach((inc) => {
        sourceCounts[inc.source] = (sourceCounts[inc.source] ?? 0) + 1;
      });

      // SLA breaches
      const { count: slaBreaches } = await supabase
        .from('incidents')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .not('resolved_at', 'is', null)
        .not('sla_breach_at', 'is', null)
        .filter('resolved_at', 'gt', 'sla_breach_at');

      res.json({
        total_incidents: totalIncidents ?? 0,
        open_incidents: openIncidents ?? 0,
        resolved_incidents: resolved?.length ?? 0,
        mttr_minutes: mttrMinutes,
        sla_breaches: slaBreaches ?? 0,
        by_severity: severityCounts,
        by_source: sourceCounts,
      });
    } catch (err) { next(err); }
  });

  // ─── MTTR TREND (last 30 days) ────────────────────
  router.get('/mttr-trend', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const orgId = req.orgId!;
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

      const { data } = await supabase
        .from('incidents')
        .select('created_at, resolved_at')
        .eq('org_id', orgId)
        .not('resolved_at', 'is', null)
        .gte('created_at', thirtyDaysAgo)
        .order('created_at', { ascending: true });

      const trend = (data ?? []).map((inc) => {
        const created = new Date(inc.created_at);
        const resolved = new Date(inc.resolved_at);
        const mttrMins = Math.round((resolved.getTime() - created.getTime()) / (1000 * 60));
        return {
          date: created.toISOString().split('T')[0],
          mttr_minutes: mttrMins,
        };
      });

      res.json({ trend });
    } catch (err) { next(err); }
  });

  // ─── INCIDENT HEATMAP (day × hour) ────────────────
  router.get('/heatmap', async (req, res, next) => {
    try {
      const supabase = getSupabase();
      const orgId = req.orgId!;

      const { data } = await supabase
        .from('incidents')
        .select('created_at')
        .eq('org_id', orgId);

      // Build 7×24 heatmap
      const heatmap: number[][] = Array.from({ length: 7 }, () =>
        Array.from({ length: 24 }, () => 0)
      );

      data?.forEach((inc) => {
        const date = new Date(inc.created_at);
        const day = date.getDay(); // 0=Sun
        const hour = date.getHours();
        heatmap[day]![hour]!++;
      });

      res.json({ heatmap });
    } catch (err) { next(err); }
  });

  return router;
}
