from flask import Flask, jsonify
from flask_cors import CORS
import psutil
import shutil
import platform

app = Flask(__name__)
CORS(app)


def get_temperature():
    """Get system temperature information."""
    temps = {}
    try:
        if hasattr(psutil, "sensors_temperatures"):
            temps = psutil.sensors_temperatures()
            if temps:
                # Return the first temperature reading found
                for name, entries in temps.items():
                    if entries:
                        return {
                            "name": name,
                            "current": entries[0].current,
                            "high": entries[0].high,
                            "critical": entries[0].critical
                        }
        # Fallback: try reading from /sys/class/thermal
        import os
        thermal_path = "/sys/class/thermal"
        if os.path.exists(thermal_path):
            thermal_zones = [d for d in os.listdir(thermal_path) if d.startswith("thermal_zone")]
            for zone in thermal_zones:
                temp_file = os.path.join(thermal_path, zone, "temp")
                if os.path.exists(temp_file):
                    with open(temp_file, "r") as f:
                        temp_millidegrees = int(f.read().strip())
                        return {
                            "name": zone,
                            "current": temp_millidegrees / 1000,
                            "high": None,
                            "critical": None
                        }
    except Exception as e:
        print(f"Error reading temperature: {e}")
        return {"name": "N/A", "current": None, "high": None, "critical": None}
    return {"name": "N/A", "current": None, "high": None, "critical": None}


@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    """Get all system metrics."""
    # CPU metrics
    cpu_percent = psutil.cpu_percent(interval=0.1)
    cpu_count = psutil.cpu_count()
    cpu_freq = psutil.cpu_freq()

    # Memory metrics
    memory = psutil.virtual_memory()
    swap = psutil.swap_memory()

    # Disk metrics
    disk = psutil.disk_usage('/')
    disk_io = psutil.disk_io_counters()

    # Temperature
    temp = get_temperature()

    # Network metrics
    net_io = psutil.net_io_counters()

    # Boot time
    boot_time = psutil.boot_time()

    # Process information (top processes by CPU and memory)
    processes = []
    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
        try:
            processes.append(proc.info)
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            pass

    # Sort by CPU and get top 10
    top_cpu = sorted(processes, key=lambda x: x['cpu_percent'] or 0, reverse=True)[:10]
    top_memory = sorted(processes, key=lambda x: x['memory_percent'] or 0, reverse=True)[:10]

    # System info
    system_info = {
        "platform": platform.system(),
        "release": platform.release(),
        "version": platform.version(),
        "machine": platform.machine(),
        "hostname": platform.node()
    }

    return jsonify({
        "system": system_info,
        "cpu": {
            "percent": cpu_percent,
            "count": cpu_count,
            "freq": {
                "current": cpu_freq.current if cpu_freq else None,
                "min": cpu_freq.min if cpu_freq else None,
                "max": cpu_freq.max if cpu_freq else None
            }
        },
        "memory": {
            "total": memory.total,
            "available": memory.available,
            "used": memory.used,
            "free": memory.free,
            "percent": memory.percent
        },
        "swap": {
            "total": swap.total,
            "used": swap.used,
            "free": swap.free,
            "percent": swap.percent
        },
        "disk": {
            "total": disk.total,
            "used": disk.used,
            "free": disk.free,
            "percent": disk.percent
        },
        "temperature": temp,
        "network": {
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv
        },
        "processes": {
            "total": len(processes),
            "top_cpu": top_cpu,
            "top_memory": top_memory
        },
        "uptime": boot_time
    })


@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({"status": "ok"})


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
