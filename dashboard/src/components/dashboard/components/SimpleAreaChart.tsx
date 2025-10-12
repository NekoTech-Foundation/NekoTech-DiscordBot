import { useRef, useEffect, useMemo } from 'react'
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend,
    ChartOptions
} from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Filler,
    Legend
);

interface ChartDataPoint {
    time: string
    tickets: number
}

interface ModernFancyChartProps {
    data: ChartDataPoint[]
}

export default function ModernFancyChart({ data = [] }: ModernFancyChartProps) {
    const chartRef = useRef<ChartJS<'line'>>(null);

    const chartData = useMemo(() => ({
        labels: data.map(d => d.time),
        datasets: [
            {
                fill: true,
                label: 'Tickets',
                data: data.map(d => d.tickets),
                borderColor: '#3B82F6',
                backgroundColor: 'rgba(59, 130, 246, 0.5)',
                borderWidth: 2,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 8,
                pointBackgroundColor: '#3B82F6',
                pointHoverBackgroundColor: '#2563EB',
                pointHoverBorderColor: '#ffffff',
                pointHoverBorderWidth: 4,
            }
        ]
    }), [data]);

    const options = useMemo<ChartOptions<'line'>>(() => ({
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        devicePixelRatio: 1,
        elements: {
            line: {
                tension: 0.4
            },
            point: {
                radius: 0
            }
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                enabled: true,
                backgroundColor: 'rgba(17, 24, 39, 0.8)',
                titleColor: '#F3F4F6',
                bodyColor: '#F3F4F6',
                padding: 16,
                cornerRadius: 8,
                displayColors: false,
                callbacks: {
                    label: (context) => `${context.parsed.y} tickets`
                }
            }
        },
        scales: {
            x: {
                type: 'category' as const,
                display: true,
                grid: {
                    display: false,
                },
                ticks: {
                    color: '#9CA3AF',
                    maxTicksLimit: 6,
                    maxRotation: 0,
                    autoSkip: true
                }
            },
            y: {
                type: 'linear' as const,
                display: true,
                grid: {
                    color: 'rgba(107, 114, 128, 0.1)',
                },
                ticks: {
                    color: '#9CA3AF',
                    maxTicksLimit: 5,
                    callback: (value) => Math.round(Number(value))
                },
                min: 0,
            }
        }
    }), []);

    useEffect(() => {
        const chart = chartRef.current;

        function cleanupCanvas() {
            if (chart?.canvas) {
                const context = chart.canvas.getContext('2d');
                if (context) {
                    context.clearRect(0, 0, chart.canvas.width, chart.canvas.height);
                }
            }
        }

        return () => {
            if (chart) {
                cleanupCanvas();
                chart.destroy();
            }
        };
    }, []);

    if (!data || data.length === 0) {
        return (
            <div className="w-full h-[300px] bg-gradient-to-b from-gray-900 to-gray-800 rounded-xl flex items-center justify-center">
                <p className="text-gray-400">No data available</p>
            </div>
        )
    }

    return (
        <Line
            ref={chartRef}
            data={chartData}
            options={options}
            className="w-full h-[300px]"
        />
    )
} 