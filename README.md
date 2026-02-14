# System Monitor Dashboard

A beautiful Docker-based Linux system monitoring dashboard with real-time metrics for temperature, RAM, CPU, disk usage, and running processes.

![System Monitor](https://img.shields.io/badge/Linux-System%20Monitor-blue)
![Docker](https://img.shields.io/badge/Docker-Supported-blue)
![React](https://img.shields.io/badge/React-18-blue)
![Flask](https://img.shields.io/badge/Flask-3.0-green)

## Features

- Real-time system metrics monitoring
- CPU usage with core count and frequency
- Memory and swap usage
- Disk usage statistics
- Temperature readings from system sensors
- Network I/O statistics
- Top processes by CPU and memory usage
- Auto-refresh (2-second intervals)
- Beautiful modern UI with dark theme
- Fully containerized with Docker

## Quick Start

### Prerequisites

- Docker and Docker Compose installed on your Linux machine

### Installation

1. Clone or download this project:
```bash
cd system-monitor
```

2. Start the application:
```bash
docker-compose up -d --build
```

3. Open your browser and navigate to:
```
http://localhost:8080
```

## Project Structure

```
system-monitor/
├── backend/
│   ├── app.py              # Flask API server
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Backend container
├── frontend/
│   ├── src/
│   │   ├── App.jsx         # Main React component
│   │   ├── main.jsx        # Entry point
│   │   └── index.css       # Tailwind styles
│   ├── package.json        # Node dependencies
│   ├── nginx.conf          # Nginx configuration
│   └── Dockerfile          # Frontend container
├── docker-compose.yml      # Docker orchestration
└── README.md              # This file
```

## API Endpoints

### `GET /api/metrics`
Returns all system metrics including:
- System information (hostname, platform, architecture)
- CPU usage, count, and frequency
- Memory and swap usage
- Disk usage
- Temperature readings
- Network I/O statistics
- Process information (top 10 by CPU and memory)

### `GET /api/health`
Health check endpoint.

## Configuration

The frontend can be configured using environment variables:

- `VITE_API_URL`: Backend API URL (default: `http://localhost:5000`)

Create a `.env` file in the frontend directory to override defaults.

## Docker Ports

- **Frontend**: `8080` (main dashboard)
- **Backend**: `5000` (API)

## Stopping the Application

```bash
docker-compose down
```

To remove volumes as well:
```bash
docker-compose down -v
```

## Troubleshooting

### Temperature shows as N/A

Temperature readings depend on your system's hardware sensors. The application tries multiple methods:
1. `psutil.sensors_temperatures()`
2. Reading from `/sys/class/thermal/`

If no sensors are found, temperature will display as N/A.

### Permission issues with system metrics

The backend container runs with `network_mode: host` and mounts:
- `/sys/class/thermal:ro` (read-only thermal data)
- `/proc:ro` (read-only process data)

If you encounter issues, ensure Docker has permission to read these paths.

## Development

### Backend Development
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```

### Frontend Development
```bash
cd frontend
npm install
npm run dev
```

## Technologies Used

- **Backend**: Python, Flask, psutil
- **Frontend**: React, Vite, Tailwind CSS, Lucide React icons
- **Deployment**: Docker, Docker Compose, Nginx

## License

MIT
