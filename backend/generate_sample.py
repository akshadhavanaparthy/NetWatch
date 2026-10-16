"""
Generates data/sample_network_flows.csv for NetWatch.
Includes baseline traffic (Day 1) and evaluation traffic (Day 2) with 7 distinct anomaly scenarios
and an approved backup activity.
"""
import os
import random
from datetime import datetime, timedelta

def generate_sample_flows():
    os.makedirs("data", exist_ok=True)
    records = []
    rec_id = 1

    # Helpers
    def add_flow(dt, src, dst, sport, dport, proto, b_sent, b_recv, pkts, dur, action, dns, label):
        nonlocal rec_id
        records.append({
            "record_id": rec_id,
            "timestamp": dt.strftime("%Y-%m-%d %H:%M:%S"),
            "src_ip": src,
            "dst_ip": dst,
            "src_port": sport,
            "dst_port": dport,
            "protocol": proto,
            "bytes_sent": b_sent,
            "bytes_received": b_recv,
            "packets": pkts,
            "duration": round(dur, 2),
            "action": action,
            "dns_query": dns if dns else "",
            "label": label
        })
        rec_id += 1

    random.seed(42)

    # =========================================================================
    # 1. BASELINE PERIOD: Day 1 (2026-03-01 08:00:00 to 18:00:00)
    # Normal office operations: Web, DNS, Email, Internal Shares
    # =========================================================================
    day1_start = datetime(2026, 3, 1, 8, 0, 0)
    
    # Normal workstations and servers
    workstations = [f"192.168.1.{i}" for i in [10, 11, 12, 14, 15, 20, 25, 45, 72, 88, 99, 110, 120, 150]]
    web_servers = ["93.184.216.34", "151.101.1.69", "104.244.42.1", "172.217.16.206"]
    dns_server = "192.168.1.2"
    file_server = "192.168.1.4"
    mail_server = "192.168.1.6"

    # Baseline flows for all workstations
    curr_time = day1_start
    while curr_time < datetime(2026, 3, 1, 17, 30, 0):
        for ws in workstations:
            # Chance of traffic
            if random.random() < 0.35:
                # DNS query first
                sport = random.randint(49152, 65530)
                domain = random.choice(["portal.office.com", "github.com", "api.github.com", "docs.python.org", "internal.local"])
                add_flow(curr_time, ws, dns_server, sport, 53, "UDP", 84, 168, 2, 0.05, "ALLOW", domain, "Normal Baseline DNS")
                
                # HTTP/HTTPS web traffic
                ext_web = random.choice(web_servers)
                sport2 = random.randint(49152, 65530)
                dport = random.choice([80, 443])
                b_sent = random.randint(2000, 45000)
                b_recv = random.randint(15000, 250000)
                add_flow(curr_time + timedelta(seconds=1), ws, ext_web, sport2, dport, "TCP", b_sent, b_recv, random.randint(8, 40), random.uniform(0.2, 3.5), "ALLOW", "", "Normal Baseline Web")

            # Occasional internal file share (SMB)
            if random.random() < 0.15:
                sport = random.randint(49152, 65530)
                b_sent = random.randint(5000, 80000)
                b_recv = random.randint(10000, 120000)
                add_flow(curr_time + timedelta(seconds=2), ws, file_server, sport, 445, "TCP", b_sent, b_recv, random.randint(10, 60), random.uniform(0.5, 4.0), "ALLOW", "", "Normal Baseline SMB")

        curr_time += timedelta(minutes=15)

    # Approved backup server baseline: low daytime traffic, moderate traffic
    add_flow(datetime(2026, 3, 1, 12, 0, 0), "192.168.1.99", "10.0.0.50", 52100, 445, "TCP", 250000, 50000, 120, 15.0, "ALLOW", "", "Normal Baseline Backup Heartbeat")

    # =========================================================================
    # 2. EVALUATION PERIOD: Day 2 (2026-03-02 08:00:00 to 18:00:00)
    # Contains background normal traffic + 7 anomalous patterns + approved backup
    # =========================================================================
    day2_start = datetime(2026, 3, 2, 8, 0, 0)
    curr_time = day2_start

    # Normal background flows during Day 2
    for hour in range(8, 17):
        base_h = datetime(2026, 3, 2, hour, 15, 0)
        for ws in ["192.168.1.10", "192.168.1.11", "192.168.1.12", "192.168.1.20"]:
            sport = random.randint(49152, 65530)
            add_flow(base_h, ws, dns_server, sport, 53, "UDP", 80, 160, 2, 0.04, "ALLOW", "api.github.com", "Normal Traffic")
            add_flow(base_h + timedelta(seconds=1), ws, "151.101.1.69", sport+1, 443, "TCP", 12000, 85000, 25, 1.2, "ALLOW", "", "Normal Traffic")

    # -------------------------------------------------------------------------
    # Scenario A: Unusual Data Transfer (Data Exfiltration)
    # Host 192.168.1.45 normally transfers < 100 KB. Suddenly sends 145 MB to 203.0.113.88
    # -------------------------------------------------------------------------
    t_exfil = datetime(2026, 3, 2, 9, 30, 0)
    add_flow(t_exfil, "192.168.1.45", "203.0.113.88", 54312, 443, "TCP", 145000000, 25000, 95000, 245.5, "ALLOW", "", "Anomaly: Unusual Data Transfer")
    add_flow(t_exfil + timedelta(minutes=5), "192.168.1.45", "203.0.113.88", 54314, 443, "TCP", 85000000, 18000, 56000, 140.2, "ALLOW", "", "Anomaly: Unusual Data Transfer")

    # -------------------------------------------------------------------------
    # Scenario B: Port Probing (Port Scan)
    # Host 192.168.1.110 scans 22 distinct destination ports on 192.168.1.10 within 90 seconds
    # -------------------------------------------------------------------------
    t_probe = datetime(2026, 3, 2, 10, 15, 0)
    target_ports = [21, 22, 23, 25, 53, 80, 110, 135, 139, 143, 443, 445, 993, 1433, 1521, 3306, 3389, 5432, 5900, 8080, 8443, 9000]
    for idx, p in enumerate(target_ports):
        add_flow(t_probe + timedelta(seconds=idx * 3), "192.168.1.110", "192.168.1.10", 61000 + idx, p, "TCP", 64, 0, 1, 0.01, "DENY", "", "Anomaly: Port Probing")

    # -------------------------------------------------------------------------
    # Scenario C: Destination Diversity (Network Sweeping / Worm Spreading)
    # Host 192.168.1.72 contacts 16 distinct destinations in 2 minutes
    # -------------------------------------------------------------------------
    t_sweep = datetime(2026, 3, 2, 11, 5, 0)
    for idx in range(1, 17):
        target_ip = f"10.0.1.{idx}"
        add_flow(t_sweep + timedelta(seconds=idx * 5), "192.168.1.72", target_ip, 50120 + idx, 445, "TCP", 128, 0, 2, 0.02, "DENY", "", "Anomaly: Destination Diversity")

    # -------------------------------------------------------------------------
    # Scenario D: Periodic Connections (C2 Beaconing)
    # Host 192.168.1.150 connects to 198.51.100.22:8443 every ~60 seconds with strict regularity
    # -------------------------------------------------------------------------
    t_beacon = datetime(2026, 3, 2, 13, 0, 0)
    for step in range(8):
        jitter = random.choice([-1, 0, 1])
        t_flow = t_beacon + timedelta(seconds=step * 60 + jitter)
        add_flow(t_flow, "192.168.1.150", "198.51.100.22", 52400 + step, 8443, "TCP", 350, 420, 4, 0.45, "ALLOW", "", "Anomaly: Periodic Connections")

    # -------------------------------------------------------------------------
    # Scenario E: Unexpected Host Communication
    # Host 192.168.1.15 (standard workstation) connects to 192.168.1.5 (Secure Domain Controller) on port 3389
    # Never observed communicating in baseline
    # -------------------------------------------------------------------------
    t_unexp = datetime(2026, 3, 2, 14, 22, 0)
    add_flow(t_unexp, "192.168.1.15", "192.168.1.5", 55210, 3389, "TCP", 4500, 12000, 18, 12.4, "ALLOW", "", "Anomaly: Unexpected Host Communication")
    add_flow(t_unexp + timedelta(minutes=4), "192.168.1.15", "192.168.1.5", 55212, 3389, "TCP", 8200, 24000, 32, 28.1, "ALLOW", "", "Anomaly: Unexpected Host Communication")

    # -------------------------------------------------------------------------
    # Scenario F: DNS Behaviour Analysis (High Volume & DGA Tunneling)
    # Host 192.168.1.88 makes 18 rapid queries for pseudo-random domains
    # -------------------------------------------------------------------------
    t_dns = datetime(2026, 3, 2, 15, 10, 0)
    dga_subdomains = [
        "xq89f72b.evil-tunnel.cc", "z87a12b.evil-tunnel.cc", "m4k991z.evil-tunnel.cc",
        "p02la44.evil-tunnel.cc", "k9201ma.evil-tunnel.cc", "w1092aa.evil-tunnel.cc",
        "b782ka9.evil-tunnel.cc", "o029fka.evil-tunnel.cc", "r921kla.evil-tunnel.cc",
        "h92ka01.evil-tunnel.cc", "q28k1la.evil-tunnel.cc", "l2019al.evil-tunnel.cc",
        "x9281ja.evil-tunnel.cc", "y82910a.evil-tunnel.cc", "v8192ka.evil-tunnel.cc",
        "t8291ka.evil-tunnel.cc", "c8219ka.evil-tunnel.cc", "e7281ka.evil-tunnel.cc"
    ]
    for idx, dga in enumerate(dga_subdomains):
        add_flow(t_dns + timedelta(seconds=idx * 2), "192.168.1.88", dns_server, 58000 + idx, 53, "UDP", 112, 140, 2, 0.03, "ALLOW", dga, "Anomaly: DNS Behaviour Analysis")

    # -------------------------------------------------------------------------
    # Scenario G: Blocked or Failed Connections (Brute Force / Access Violation)
    # Host 192.168.1.120 incurs 14 consecutive DENIED connections to 10.0.2.1
    # -------------------------------------------------------------------------
    t_failed = datetime(2026, 3, 2, 16, 0, 0)
    for idx in range(14):
        add_flow(t_failed + timedelta(seconds=idx * 4), "192.168.1.120", "10.0.2.1", 59000 + idx, 22, "TCP", 120, 0, 2, 0.02, "DENY", "", "Anomaly: Blocked or Failed Connections")

    # -------------------------------------------------------------------------
    # Scenario H: Approved Activity (Scheduled Nightly Backup)
    # Host 192.168.1.99 transfers 250 MB to 10.0.0.50 on port 445
    # High volume anomaly that matches approved activity rule!
    # -------------------------------------------------------------------------
    t_backup = datetime(2026, 3, 2, 17, 0, 0)
    add_flow(t_backup, "192.168.1.99", "10.0.0.50", 52200, 445, "TCP", 250000000, 150000, 180000, 420.0, "ALLOW", "", "Approved Activity: Scheduled Backup")

    # Write to CSV
    import csv
    fieldnames = ["record_id", "timestamp", "src_ip", "dst_ip", "src_port", "dst_port", "protocol", "bytes_sent", "bytes_received", "packets", "duration", "action", "dns_query", "label"]
    csv_path = os.path.join("data", "sample_network_flows.csv")
    with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(records)

    print(f"Generated {len(records)} records in {csv_path}")

if __name__ == "__main__":
    generate_sample_flows()
