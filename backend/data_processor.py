import re
import ipaddress
import pandas as pd
import numpy as np
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple

STANDARD_COLUMNS = [
    "record_id",
    "timestamp",
    "src_ip",
    "dst_ip",
    "src_port",
    "dst_port",
    "protocol",
    "bytes_sent",
    "bytes_received",
    "packets",
    "duration",
    "action",
    "dns_query",
    "label"
]

COLUMN_ALIASES = {
    "record_id": ["record_id", "id", "row_id", "flow_id", "index"],
    "timestamp": ["timestamp", "time", "datetime", "date_time", "flow_start", "start_time", "ts", "flow_time"],
    "src_ip": ["src_ip", "source_ip", "sourceip", "srcip", "source", "src", "src_addr", "source_address", "id.orig_h"],
    "dst_ip": ["dst_ip", "destination_ip", "dest_ip", "destip", "dstip", "destination", "dst", "dst_addr", "dest_address", "id.resp_h"],
    "src_port": ["src_port", "source_port", "sourceport", "sport", "srcport", "id.orig_p"],
    "dst_port": ["dst_port", "destination_port", "dest_port", "destport", "dport", "dstport", "id.resp_p"],
    "protocol": ["protocol", "proto", "transport_protocol", "ip_protocol"],
    "bytes_sent": ["bytes_sent", "bytes_out", "sent_bytes", "src_bytes", "out_bytes", "bytes_orig", "orig_bytes"],
    "bytes_received": ["bytes_received", "bytes_in", "recv_bytes", "received_bytes", "dst_bytes", "in_bytes", "resp_bytes"],
    "packets": ["packets", "pkts", "total_packets", "packet_count", "flow_packets"],
    "duration": ["duration", "dur", "flow_duration", "elapsed", "length_seconds"],
    "action": ["action", "status", "outcome", "firewall_action", "flow_action", "decision"],
    "dns_query": ["dns_query", "dns_name", "query", "domain", "hostname", "dns_request", "dns"],
    "label": ["label", "threat_label", "ground_truth", "class", "category", "tag"]
}


def suggest_column_mapping(
    columns: List[str], schema_profiles: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Optional[str]]:
    """Analyzes raw CSV header columns and suggests mapping to standard NetWatch fields."""
    mapping = {}
    normalized = {col.strip().lower().replace(" ", "_").replace("-", "_"): col for col in columns}

    for profile in schema_profiles or []:
        profile_mappings = profile.get("mappings", {})
        profile_mapping = {
            field: raw_field if raw_field in columns else None
            for field, raw_field in profile_mappings.items()
        }
        if all(profile_mapping.get(field) for field in ("timestamp", "src_ip", "dst_ip")):
            return {field: profile_mapping.get(field) for field in STANDARD_COLUMNS}

    for std_col, aliases in COLUMN_ALIASES.items():
        matched = None
        for alias in aliases:
            norm_alias = alias.lower().replace(" ", "_").replace("-", "_")
            if norm_alias in normalized:
                matched = normalized[norm_alias]
                break
        mapping[std_col] = matched

    return mapping


def is_valid_ip(ip_str: Any) -> bool:
    """Validates whether a string is a valid IPv4 or IPv6 address."""
    if not ip_str or not isinstance(ip_str, str):
        return False
    try:
        ipaddress.ip_address(ip_str.strip())
        return True
    except ValueError:
        return False


def validate_and_process_csv(
    df_raw: pd.DataFrame,
    column_mapping: Optional[Dict[str, Optional[str]]] = None
) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    """
    Applies column mapping, validates every record, tracks duplicates and rejection reasons,
    and returns a clean DataFrame with original record references preserved.
    """
    if column_mapping is None:
        column_mapping = suggest_column_mapping(list(df_raw.columns))

    total_records = len(df_raw)
    rejection_reasons = []
    valid_mask = [True] * total_records

    # Check duplicate rows in raw data
    duplicate_mask = df_raw.duplicated(keep="first")
    duplicate_count = int(duplicate_mask.sum())

    # Create working copy of mapped columns
    processed_data = {}

    # Record ID handling: preserve existing or create 1-based index
    mapped_rec_id_col = column_mapping.get("record_id")
    if mapped_rec_id_col and mapped_rec_id_col in df_raw.columns:
        processed_data["record_id"] = df_raw[mapped_rec_id_col].tolist()
    else:
        processed_data["record_id"] = list(range(1, total_records + 1))

    # Core required fields validation: src_ip, dst_ip, timestamp
    src_col = column_mapping.get("src_ip")
    dst_col = column_mapping.get("dst_ip")
    time_col = column_mapping.get("timestamp")

    if not src_col or src_col not in df_raw.columns:
        raise ValueError("Source IP column mapping is required")
    if not dst_col or dst_col not in df_raw.columns:
        raise ValueError("Destination IP column mapping is required")
    if not time_col or time_col not in df_raw.columns:
        raise ValueError("Timestamp column mapping is required")

    parsed_timestamps = []
    src_ips = []
    dst_ips = []
    src_ports = []
    dst_ports = []
    protocols = []
    bytes_sent_list = []
    bytes_recv_list = []
    packets_list = []
    durations = []
    actions = []
    dns_queries = []
    labels = []

    # Map remaining optional fields
    sport_col = column_mapping.get("src_port")
    dport_col = column_mapping.get("dst_port")
    proto_col = column_mapping.get("protocol")
    bsent_col = column_mapping.get("bytes_sent")
    brecv_col = column_mapping.get("bytes_received")
    pkts_col = column_mapping.get("packets")
    dur_col = column_mapping.get("duration")
    act_col = column_mapping.get("action")
    dns_col = column_mapping.get("dns_query")
    lbl_col = column_mapping.get("label")

    for idx in range(total_records):
        row_id = processed_data["record_id"][idx]
        reasons_for_row = []

        # 1. Validate Timestamp
        raw_time = df_raw.iloc[idx][time_col]
        dt = None
        if pd.isna(raw_time) or str(raw_time).strip() == "":
            reasons_for_row.append("Missing required timestamp")
        else:
            try:
                dt = pd.to_datetime(raw_time)
                if pd.isna(dt):
                    reasons_for_row.append(f"Invalid timestamp value: '{raw_time}'")
            except Exception:
                reasons_for_row.append(f"Unparseable timestamp: '{raw_time}'")

        # 2. Validate Source IP
        raw_src = df_raw.iloc[idx][src_col]
        clean_src = str(raw_src).strip() if pd.notna(raw_src) else ""
        if not clean_src:
            reasons_for_row.append("Missing required source IP")
        elif not is_valid_ip(clean_src):
            reasons_for_row.append(f"Invalid source IP format: '{clean_src}'")

        # 3. Validate Destination IP
        raw_dst = df_raw.iloc[idx][dst_col]
        clean_dst = str(raw_dst).strip() if pd.notna(raw_dst) else ""
        if not clean_dst:
            reasons_for_row.append("Missing required destination IP")
        elif not is_valid_ip(clean_dst):
            reasons_for_row.append(f"Invalid destination IP format: '{clean_dst}'")

        # 4. Validate Ports (Never treat missing as port 0!)
        c_sport = None
        if sport_col and sport_col in df_raw.columns:
            val = df_raw.iloc[idx][sport_col]
            if pd.notna(val) and str(val).strip() != "":
                try:
                    p = int(float(val))
                    if 0 <= p <= 65535:
                        c_sport = p
                    else:
                        reasons_for_row.append(f"Source port {p} outside valid range 0-65535")
                except ValueError:
                    reasons_for_row.append(f"Malformed source port: '{val}'")

        c_dport = None
        if dport_col and dport_col in df_raw.columns:
            val = df_raw.iloc[idx][dport_col]
            if pd.notna(val) and str(val).strip() != "":
                try:
                    p = int(float(val))
                    if 0 <= p <= 65535:
                        c_dport = p
                    else:
                        reasons_for_row.append(f"Destination port {p} outside valid range 0-65535")
                except ValueError:
                    reasons_for_row.append(f"Malformed destination port: '{val}'")

        # 5. Validate Protocol
        c_proto = "TCP"
        if proto_col and proto_col in df_raw.columns:
            val = df_raw.iloc[idx][proto_col]
            if pd.notna(val) and str(val).strip() != "":
                c_proto = str(val).strip().upper()

        # 6. Validate Numerics (no negative values)
        c_bsent = 0
        if bsent_col and bsent_col in df_raw.columns:
            val = df_raw.iloc[idx][bsent_col]
            if pd.notna(val) and str(val).strip() != "":
                try:
                    num = float(val)
                    if num < 0:
                        reasons_for_row.append(f"Negative bytes_sent value: {num}")
                    else:
                        c_bsent = int(num)
                except ValueError:
                    reasons_for_row.append(f"Malformed bytes_sent: '{val}'")

        c_brecv = 0
        if brecv_col and brecv_col in df_raw.columns:
            val = df_raw.iloc[idx][brecv_col]
            if pd.notna(val) and str(val).strip() != "":
                try:
                    num = float(val)
                    if num < 0:
                        reasons_for_row.append(f"Negative bytes_received value: {num}")
                    else:
                        c_brecv = int(num)
                except ValueError:
                    reasons_for_row.append(f"Malformed bytes_received: '{val}'")

        c_pkts = 0
        if pkts_col and pkts_col in df_raw.columns:
            val = df_raw.iloc[idx][pkts_col]
            if pd.notna(val) and str(val).strip() != "":
                try:
                    num = float(val)
                    if num < 0:
                        reasons_for_row.append(f"Negative packets value: {num}")
                    else:
                        c_pkts = int(num)
                except ValueError:
                    reasons_for_row.append(f"Malformed packets count: '{val}'")

        c_dur = 0.0
        if dur_col and dur_col in df_raw.columns:
            val = df_raw.iloc[idx][dur_col]
            if pd.notna(val) and str(val).strip() != "":
                try:
                    num = float(val)
                    if num < 0:
                        reasons_for_row.append(f"Negative duration: {num}")
                    else:
                        c_dur = float(num)
                except ValueError:
                    reasons_for_row.append(f"Malformed duration: '{val}'")

        # 7. Action / Outcome
        c_act = ""
        if act_col and act_col in df_raw.columns:
            val = df_raw.iloc[idx][act_col]
            if pd.notna(val) and str(val).strip() != "":
                c_act = str(val).strip().upper()

        # 8. DNS Query
        c_dns = ""
        if dns_col and dns_col in df_raw.columns:
            val = df_raw.iloc[idx][dns_col]
            if pd.notna(val) and str(val).strip() != "":
                c_dns = str(val).strip()

        # 9. Label (if present)
        c_lbl = ""
        if lbl_col and lbl_col in df_raw.columns:
            val = df_raw.iloc[idx][lbl_col]
            if pd.notna(val):
                c_lbl = str(val).strip()

        if reasons_for_row:
            valid_mask[idx] = False
            rejection_reasons.append({
                "row_index": idx,
                "record_id": row_id,
                "reasons": reasons_for_row
            })

        parsed_timestamps.append(dt)
        src_ips.append(clean_src)
        dst_ips.append(clean_dst)
        src_ports.append(c_sport)
        dst_ports.append(c_dport)
        protocols.append(c_proto)
        bytes_sent_list.append(c_bsent)
        bytes_recv_list.append(c_brecv)
        packets_list.append(c_pkts)
        durations.append(c_dur)
        actions.append(c_act)
        dns_queries.append(c_dns)
        labels.append(c_lbl)

    clean_df = pd.DataFrame({
        "record_id": processed_data["record_id"],
        "timestamp": parsed_timestamps,
        "src_ip": src_ips,
        "dst_ip": dst_ips,
        "src_port": src_ports,
        "dst_port": dst_ports,
        "protocol": protocols,
        "bytes_sent": bytes_sent_list,
        "bytes_received": bytes_recv_list,
        "packets": packets_list,
        "duration": durations,
        "action": actions,
        "dns_query": dns_queries,
        "label": labels
    })

    valid_clean_df = clean_df[valid_mask].copy()
    if not valid_clean_df.empty:
        valid_clean_df["timestamp"] = pd.to_datetime(valid_clean_df["timestamp"])
        valid_clean_df = valid_clean_df.sort_values("timestamp").reset_index(drop=True)

    # Feature availability flags
    dns_available = bool((clean_df["dns_query"] != "").any())
    action_available = bool((clean_df["action"] != "").any())

    # Time bounds
    min_time = str(valid_clean_df["timestamp"].min()) if not valid_clean_df.empty else None
    max_time = str(valid_clean_df["timestamp"].max()) if not valid_clean_df.empty else None

    quality_summary = {
        "total_records": total_records,
        "valid_records": len(valid_clean_df),
        "rejected_records": len(rejection_reasons),
        "duplicate_records": duplicate_count,
        "dns_available": dns_available,
        "action_available": action_available,
        "min_timestamp": min_time,
        "max_timestamp": max_time,
        "rejection_reasons": rejection_reasons[:100],  # first 100 details
        "total_rejection_count": len(rejection_reasons)
    }

    return valid_clean_df, quality_summary


def validate_temporal_separation(
    learning_start: str,
    learning_end: str,
    eval_start: str,
    eval_end: str
) -> Tuple[bool, str]:
    """
    Validates that learning and evaluation periods do not overlap.
    Enforces strict temporal separation to prevent data leakage.
    """
    try:
        l_start = pd.to_datetime(learning_start)
        l_end = pd.to_datetime(learning_end)
        e_start = pd.to_datetime(eval_start)
        e_end = pd.to_datetime(eval_end)
    except Exception as e:
        return False, f"Invalid datetime format provided: {str(e)}"

    if l_start >= l_end:
        return False, "Learning start time must precede learning end time"
    if e_start >= e_end:
        return False, "Evaluation start time must precede evaluation end time"

    # Check for overlap: Overlap exists if max(l_start, e_start) < min(l_end, e_end)
    if max(l_start, e_start) < min(l_end, e_end):
        return False, (
            "Temporal Overlap Detected: Learning period and Evaluation period overlap. "
            "To prevent data leakage, evaluation records must never be used to build their own baseline."
        )

    return True, "Temporal separation valid"


def build_host_baseline(
    df: pd.DataFrame,
    learning_start: str,
    learning_end: str,
    min_records: int = 10
) -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Builds statistical baselines for hosts from records within the learning period.
    """
    if df.empty:
        return None, "Dataset is empty"

    l_start = pd.to_datetime(learning_start)
    l_end = pd.to_datetime(learning_end)

    learning_df = df[(df["timestamp"] >= l_start) & (df["timestamp"] <= l_end)].copy()

    if len(learning_df) < min_records:
        return None, (
            f"Insufficient baseline records: Found {len(learning_df)} records in learning period, "
            f"minimum required is {min_records}."
        )

    # Calculate per-host metrics
    host_baselines = {}
    unique_src_hosts = learning_df["src_ip"].unique()

    for host in unique_src_hosts:
        h_df = learning_df[learning_df["src_ip"] == host]
        conn_count = len(h_df)

        b_sent_mean = float(h_df["bytes_sent"].mean())
        b_sent_std = float(h_df["bytes_sent"].std()) if conn_count > 1 else 0.0
        b_sent_max = int(h_df["bytes_sent"].max())

        b_recv_mean = float(h_df["bytes_received"].mean())
        b_recv_std = float(h_df["bytes_received"].std()) if conn_count > 1 else 0.0
        b_recv_max = int(h_df["bytes_received"].max())

        dest_set = list(h_df["dst_ip"].unique())
        dest_count = len(dest_set)

        # Non-null destination ports
        valid_dports = h_df["dst_port"].dropna().astype(int).tolist()
        frequent_dports = list(set(valid_dports))

        # Communication pairs
        comm_partners = list(set(zip(h_df["src_ip"], h_df["dst_ip"])))
        comm_partners_str = [f"{s}->{d}" for s, d in comm_partners]

        # DNS activity
        dns_queries = h_df[h_df["dns_query"] != ""]["dns_query"].tolist()
        dns_count = len(dns_queries)

        # Blocked / failed rates
        failed_actions = ["DENY", "DROP", "REJECT", "BLOCKED", "FAILED", "RESET"]
        failed_count = int(h_df["action"].isin(failed_actions).sum())
        failed_rate = float(failed_count / conn_count) if conn_count > 0 else 0.0

        host_baselines[host] = {
            "conn_count": conn_count,
            "bytes_sent_mean": b_sent_mean,
            "bytes_sent_std": b_sent_std,
            "bytes_sent_max": b_sent_max,
            "bytes_recv_mean": b_recv_mean,
            "bytes_recv_std": b_recv_std,
            "bytes_recv_max": b_recv_max,
            "distinct_destinations": dest_set,
            "distinct_dest_count": dest_count,
            "frequent_ports": frequent_dports,
            "communication_partners": comm_partners_str,
            "dns_query_count": dns_count,
            "dns_queries": list(set(dns_queries)),
            "failed_count": failed_count,
            "failed_rate": failed_rate
        }

    all_observed_pairs = set(zip(learning_df["src_ip"], learning_df["dst_ip"]))
    all_observed_pairs_str = {f"{s}->{d}" for s, d in all_observed_pairs}

    baseline_result = {
        "learning_start": learning_start,
        "learning_end": learning_end,
        "learning_records_count": len(learning_df),
        "hosts_profiled_count": len(host_baselines),
        "host_baselines": host_baselines,
        "all_observed_pairs": list(all_observed_pairs_str),
        "created_at": datetime.now().isoformat()
    }

    return baseline_result, None
