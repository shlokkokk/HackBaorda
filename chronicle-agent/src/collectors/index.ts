import si from 'systeminformation';
import os from 'os';
import { logger } from '../lib/logger.js';
import { config } from '../lib/config.js';

export interface CollectedMetric {
  name: string;
  value: number;
  unit: string;
}

export interface ProcessInfo {
  pid: number;
  name: string;
  cpu_percent: number;
  mem_percent: number;
}

export interface ServiceCheck {
  name: string;
  type: string;
  port?: number;
  healthy: boolean;
  status: string;
}

export interface SystemSnapshot {
  metrics: CollectedMetric[];
  processes: ProcessInfo[];
  services: ServiceCheck[];
  platform: string;
  arch: string;
  ips: string[];
  uptime: number;
  activeCollectors: string[];
  failedCollectors: string[];
}

export async function captureSystemSnapshot(): Promise<SystemSnapshot> {
  const activeCollectors: string[] = [];
  const failedCollectors: string[] = [];
  const metrics: CollectedMetric[] = [];
  let topProcesses: ProcessInfo[] = [];
  const services: ServiceCheck[] = [];

  // 1. UPTIME & PLATFORM
  let platform = 'unknown';
  let arch = 'unknown';
  let uptime = 0;
  try {
    const osInfo = await si.osInfo();
    platform = `${osInfo.platform} (${osInfo.distro})`;
    arch = osInfo.arch;
    const timeInfo = si.time();
    uptime = timeInfo.uptime;
    activeCollectors.push('uptime');
    metrics.push({ name: 'system.uptime', value: uptime, unit: 'seconds' });
  } catch (err) {
    failedCollectors.push('uptime');
    logger.error('Failed to collect uptime statistics', err);
  }

  // 2. CPU
  if (!config.disabledCollectors.includes('cpu')) {
    try {
      const load = await si.currentLoad();
      const loadavg = os.loadavg();
      activeCollectors.push('cpu');
      metrics.push({ name: 'cpu.usage_percent', value: load.currentLoad, unit: '%' });
      metrics.push({ name: 'cpu.loadavg_1min', value: loadavg[0] || 0, unit: 'load' });
      metrics.push({ name: 'cpu.loadavg_5min', value: loadavg[1] || 0, unit: 'load' }); // System Load
    } catch (err) {
      failedCollectors.push('cpu');
      logger.error('Failed to collect CPU statistics', err);
    }
  }

  // 3. MEMORY
  if (!config.disabledCollectors.includes('memory')) {
    try {
      const mem = await si.mem();
      activeCollectors.push('memory');
      const usedPct = (mem.active / mem.total) * 100;
      metrics.push({ name: 'memory.used_percent', value: usedPct, unit: '%' });
      metrics.push({ name: 'memory.used_bytes', value: mem.active, unit: 'bytes' });
      metrics.push({ name: 'memory.total_bytes', value: mem.total, unit: 'bytes' });
    } catch (err) {
      failedCollectors.push('memory');
      logger.error('Failed to collect memory statistics', err);
    }
  }

  // 4. DISK
  if (!config.disabledCollectors.includes('disk')) {
    try {
      const disks = await si.fsSize();
      const rootDisk = disks.find(d => d.mount === '/' || d.mount === 'C:') || disks[0];
      if (rootDisk) {
        activeCollectors.push('disk');
        metrics.push({ name: 'disk.used_percent', value: rootDisk.use, unit: '%' });
      }
    } catch (err) {
      failedCollectors.push('disk');
      logger.error('Failed to collect disk statistics', err);
    }
  }

  // 5. NETWORK
  if (!config.disabledCollectors.includes('network')) {
    try {
      const netStats = await si.networkStats();
      const activeNet = netStats[0];
      if (activeNet) {
        activeCollectors.push('network');
        metrics.push({ name: 'network.rx_sec', value: activeNet.rx_sec || 0, unit: 'bytes/sec' });
        metrics.push({ name: 'network.tx_sec', value: activeNet.tx_sec || 0, unit: 'bytes/sec' });
      }
    } catch (err) {
      failedCollectors.push('network');
      logger.error('Failed to collect network statistics', err);
    }
  }

  // 6. PROCESSES
  if (!config.disabledCollectors.includes('process')) {
    try {
      const proc = await si.processes();
      activeCollectors.push('process');
      const sorted = proc.list
        .sort((a, b) => b.cpu - a.cpu)
        .slice(0, 5)
        .map(p => ({
          pid: p.pid,
          name: p.name,
          cpu_percent: p.cpu,
          mem_percent: p.mem,
        }));
      topProcesses = sorted;
    } catch (err) {
      failedCollectors.push('process');
      logger.error('Failed to collect process statistics', err);
    }
  }

  // 7. DISCOVER IP ADDRESSES
  let ips: string[] = [];
  try {
    const interfaces = await si.networkInterfaces();
    ips = (Array.isArray(interfaces) ? interfaces : [interfaces])
      .map(i => i.ip4)
      .filter(ip => ip && ip !== '127.0.0.1');
  } catch { /* ignore */ }

  // 8. DISCOVER SERVICES (Auto-discovery)
  try {
    const ports = await si.networkConnections();
    const activePorts = new Set(ports.filter(c => c.state === 'LISTEN').map(c => parseInt(c.localPort, 10)));

    const portMappings = [
      { port: 5432, name: 'postgresql', type: 'database' },
      { port: 3306, name: 'mysql', type: 'database' },
      { port: 6379, name: 'redis-cache', type: 'cache' },
      { port: 27017, name: 'mongodb', type: 'database' },
      { port: 80, name: 'http-server', type: 'web_server' },
      { port: 443, name: 'https-server', type: 'web_server' },
      { port: 3000, name: 'node-app', type: 'app' },
      { port: 3001, name: 'chronicle-api', type: 'app' },
    ];

    for (const mapping of portMappings) {
      if (activePorts.has(mapping.port)) {
        services.push({
          name: mapping.name,
          type: mapping.type,
          port: mapping.port,
          healthy: true,
          status: 'running',
        });
      }
    }

    // Auto-discover Docker containers
    if (!config.disabledCollectors.includes('docker')) {
      try {
        const containers = await si.dockerContainers(false);
        if (containers && containers.length > 0) {
          activeCollectors.push('docker');
          for (const c of containers) {
            services.push({
              name: c.name,
              type: 'container',
              healthy: c.state === 'running',
              status: c.state,
            });
          }
        }
      } catch { /* docker daemon not running, skip silently */ }
    }
  } catch (err) {
    logger.warn('Service auto-discovery failed', { err });
  }

  return {
    metrics,
    processes: topProcesses,
    services,
    platform,
    arch,
    ips,
    uptime,
    activeCollectors,
    failedCollectors,
  };
}
