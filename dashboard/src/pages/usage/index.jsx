import React, { useState, useEffect } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faServer, faCode, faMemory, faRobot } from '@fortawesome/free-solid-svg-icons'
import './Usage.css';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

const API_URL = window.DASHBOARD_CONFIG?.API_URL;

const STORAGE_KEY = 'memory_usage_history'
const MAX_DATA_POINTS = 100

const convertToMB = (mib) => mib * 1.048576;

export default function Usage() {
    const [serverData, setServerData] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY + '_server')
        return saved ? JSON.parse(saved) : []
    })
    const [botData, setBotData] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY + '_bot')
        return saved ? JSON.parse(saved) : []
    })
    const [labels, setLabels] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY + '_labels')
        return saved ? JSON.parse(saved) : []
    })

    useEffect(() => {
        const saveTimer = setTimeout(() => {
            localStorage.setItem(STORAGE_KEY + '_server', JSON.stringify(serverData))
            localStorage.setItem(STORAGE_KEY + '_bot', JSON.stringify(botData))
            localStorage.setItem(STORAGE_KEY + '_labels', JSON.stringify(labels))
        }, 1000);

        return () => clearTimeout(saveTimer);
    }, [serverData, botData, labels])

    const createChartOptions = (title, max = 100) => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 750,
            easing: 'easeInOutQuart'
        },
        interaction: {
            mode: 'index',
            intersect: false,
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                backgroundColor: 'rgba(17, 25, 40, 0.9)',
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderWidth: 1,
                padding: 12,
                titleFont: {
                    size: 14,
                    weight: 'normal'
                },
                bodyFont: {
                    size: 13
                },
                displayColors: false,
                callbacks: {
                    label: (context) => {
                        const value = convertToMB(context.raw);
                        return `${context.dataset.label}: ${value.toFixed(2)} MB`;
                    }
                }
            }
        },
        scales: {
            y: {
                type: 'linear',
                position: 'left',
                min: 0,
                max: convertToMB(max),
                grid: {
                    color: 'rgba(255, 255, 255, 0.05)',
                    drawBorder: false,
                },
                ticks: {
                    color: 'rgba(255, 255, 255, 0.7)',
                    padding: 10,
                    stepSize: convertToMB(max) / 5,
                    callback: value => `${value.toFixed(0)} MB`
                },
                border: {
                    display: false
                }
            },
            x: {
                display: false,
                grid: {
                    display: false
                }
            }
        }
    })

    const formatMemory = (value) => {
        const num = parseFloat(value);
        const converted = convertToMB(num);
        return `${converted.toFixed(2)} MB`;
    }

    const serverChartData = {
        labels,
        datasets: [{
            label: 'Backend Server',
            data: serverData,
            borderColor: '#ec4899',
            backgroundColor: 'rgba(236, 72, 153, 0.1)',
            tension: 0,
            pointRadius: 0,
            borderWidth: 2,
            fill: true
        }]
    }

    const botChartData = {
        labels,
        datasets: [{
            label: 'Drako Bot',
            data: botData,
            borderColor: '#a855f7',
            backgroundColor: 'rgba(168, 85, 247, 0.1)',
            tension: 0,
            pointRadius: 0,
            borderWidth: 2,
            fill: true
        }]
    }

    const combinedChartData = {
        labels,
        datasets: [
            {
                label: 'Backend Server',
                data: serverData,
                borderColor: '#ec4899',
                backgroundColor: 'rgba(236, 72, 153, 0.1)',
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
                fill: true
            },
            {
                label: 'Drako Bot',
                data: botData,
                borderColor: '#a855f7',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                tension: 0.4,
                pointRadius: 0,
                borderWidth: 2,
                fill: true
            }
        ],
    }

    useEffect(() => {
        let isSubscribed = true;
        let interval;
        
        const fetchMemoryUsage = async () => {
            if (!isSubscribed) return;
            try {
                const response = await fetch(`${API_URL}/memory`);
                const data = await response.json();
                
                if (!isSubscribed) return;
                
                setServerData(prev => {
                    const newData = [...prev, data.usage.express];
                    return newData.length > MAX_DATA_POINTS ? newData.slice(-MAX_DATA_POINTS) : newData;
                });
                
                setBotData(prev => {
                    const newData = [...prev, data.usage.bot];
                    return newData.length > MAX_DATA_POINTS ? newData.slice(-MAX_DATA_POINTS) : newData;
                });
                
                setLabels(prev => {
                    const timestamp = new Date().toLocaleTimeString();
                    const newLabels = [...prev, timestamp];
                    return newLabels.length > MAX_DATA_POINTS ? newLabels.slice(-MAX_DATA_POINTS) : newLabels;
                });
            } catch (error) {
                console.error('Failed to fetch memory usage:', error);
            }
        };

        fetchMemoryUsage();
        interval = setInterval(fetchMemoryUsage, 1000);
        
        return () => {
            isSubscribed = false;
            clearInterval(interval);
        };
    }, [API_URL]);

    const getMemoryStatus = (value) => {
        if (value > 400) return 'bg-red-500/10 text-red-500'
        if (value > 300) return 'bg-yellow-500/10 text-yellow-500'
        return 'bg-green-500/10 text-green-500'
    }

    const serverMemory = serverData[serverData.length - 1]?.toFixed(2) || 0
    const botMemory = botData[botData.length - 1]?.toFixed(2) || 0
    const totalMemory = (parseFloat(serverMemory) + parseFloat(botMemory)).toFixed(2)

    return (
 
        <div className="p-6 space-y-6">          
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-xl">
                            <FontAwesomeIcon icon={faServer} className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-muted-foreground text-sm font-medium">Backend Memory</h3>
                            <p className="text-2xl font-semibold text-foreground">{formatMemory(serverMemory)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border">
                    <div className="flex items-center gap-4">
                        <div className="bg-primary/10 p-3 rounded-xl">
                            <FontAwesomeIcon icon={faRobot} className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h3 className="text-muted-foreground text-sm font-medium">Drako Bot Memory</h3>
                            <p className="text-2xl font-semibold text-foreground">{formatMemory(botMemory)}</p>
                        </div>
                    </div>
                </div>

                <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${getMemoryStatus(totalMemory)}`}>
                            <FontAwesomeIcon icon={faMemory} className="h-6 w-6" />
                        </div>
                        <div>
                            <h3 className="text-muted-foreground text-sm font-medium">Total Memory</h3>
                            <p className="text-2xl font-semibold text-foreground">{formatMemory(totalMemory)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Individual Memory Charts Row - Remove Dashboard chart */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Backend Memory Chart */}
                <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border">
                    <h2 className="text-xl font-semibold text-foreground mb-6">Backend Memory Usage</h2>
                    <div className="h-[300px]">
                        <Line options={createChartOptions('Backend Memory', 500)} data={serverChartData} />
                    </div>
                </div>

                {/* Bot Memory Chart */}
                <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border">
                    <h2 className="text-xl font-semibold text-foreground mb-6">Drako Bot Memory Usage</h2>
                    <div className="h-[300px]">
                        <Line options={createChartOptions('Drako Bot Memory', 500)} data={botChartData} />
                    </div>
                </div>
            </div>

            {/* Combined Memory Chart */}
            <div className="bg-card/50 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-6">Total Memory Usage</h2>
                <div className="h-[300px]">
                    <Line options={createChartOptions('Memory Usage Over Time', 500)} data={combinedChartData} />
                </div>
            </div>
        </div>
    )
} 