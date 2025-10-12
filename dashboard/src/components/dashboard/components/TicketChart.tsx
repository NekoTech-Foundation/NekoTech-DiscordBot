import React from 'react';
import { Line } from 'react-chartjs-2';
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
} from 'chart.js';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
);

export type ChartDataPeriods = '1 Day' | '1 Week' | '1 Month' | '3 Months' | '1 Year';

interface Dataset {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
    tension?: number;
    pointRadius?: number;
    pointHoverRadius?: number;
    borderWidth?: number;
}

interface TicketChartProps {
    data: Dataset[];
    labels: string[];
    period: ChartDataPeriods;
    hideControls?: boolean;
    chartColor?: 'indigo' | 'yellow';
}

export default function TicketChart({ data, labels, period, hideControls = false, chartColor = 'indigo' }: TicketChartProps) {
    const options = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index' as const,
            intersect: false,
        },
        plugins: {
            legend: {
                display: false
            },
            tooltip: {
                mode: 'index' as const,
                intersect: false,
                backgroundColor: 'rgb(17, 24, 39)',
                titleColor: 'rgb(243, 244, 246)',
                bodyColor: 'rgb(209, 213, 219)',
                borderColor: 'rgb(75, 85, 99)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 8,
                displayColors: true,
                titleFont: {
                    size: 13,
                    weight: 600
                },
                bodyFont: {
                    size: 12,
                    weight: 500
                },
                callbacks: {
                    title: (items: any[]) => {
                        const item = items[0];
                        const date = new Date();

                        switch (period) {
                            case '1 Day':
                                return `${item.label}:00`;
                            case '1 Week': {
                                const dayIndex = labels.indexOf(item.label);
                                date.setDate(date.getDate() - (6 - dayIndex));
                                return date.toLocaleString('default', { weekday: 'long', month: 'short', day: 'numeric' });
                            }
                            case '1 Month': {
                                date.setDate(date.getDate() - (29 - labels.indexOf(item.label)));
                                return date.toLocaleString('default', { weekday: 'long', month: 'short', day: 'numeric' });
                            }
                            case '3 Months': {
                                date.setMonth(date.getMonth() - (2 - labels.indexOf(item.label)));
                                return date.toLocaleString('default', { month: 'long', year: 'numeric' });
                            }
                            case '1 Year': {
                                date.setMonth(date.getMonth() - (11 - labels.indexOf(item.label)));
                                return date.toLocaleString('default', { month: 'long', year: 'numeric' });
                            }
                            default:
                                return item.label;
                        }
                    },
                    label: (context: any) => {
                        const label = context.dataset.label || '';
                        const value = context.parsed.y;
                        if (value === 0) return undefined;
                        return `${label}: ${value}`;
                    }
                },
            },
        },
        scales: {
            x: {
                type: 'category' as const,
                grid: {
                    display: false,
                },
                border: {
                    display: false,
                },
                ticks: {
                    color: 'rgb(156, 163, 175)',
                    font: {
                        size: 11,
                        weight: 500
                    },
                    maxRotation: 0,
                    padding: 8,
                    callback(value: string | number, index: number): string {
                        if (period === '1 Month' && 
                            index !== 0 && 
                            index !== 29 && 
                            index % 5 !== 0) {
                            return '';
                        }
                        return String(value);
                    }
                },
            } as const,
            y: {
                type: 'linear' as const,
                display: true,
                position: 'left' as const,
                min: 0,
                border: {
                    display: false,
                },
                grid: {
                    color: 'rgb(55, 65, 81)',
                    drawBorder: false,
                    lineWidth: 0.5
                },
                ticks: {
                    color: 'rgb(156, 163, 175)',
                    padding: 8,
                    font: {
                        size: 11,
                        weight: 500
                    },
                    stepSize: 1,
                    callback(value: number | string): string {
                        return String(value);
                    }
                }
            } as const
        }
    };

    const enhancedData = {
        labels,
        datasets: data.map(dataset => ({
            ...dataset,
            tension: 0.4,
            pointRadius: dataset.data.some(value => value > 0) ? 4 : 0,
            pointHoverRadius: 6,
            pointHoverBorderWidth: 3,
            borderWidth: 2.5,
            fill: true,
            backgroundColor: (context: any) => {
                const ctx = context.chart.ctx;
                const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                const color = dataset.borderColor.replace('rgb', 'rgba').replace(')', '');
                gradient.addColorStop(0, `${color}, 0.2)`);
                gradient.addColorStop(1, `${color}, 0.0)`);
                return gradient;
            }
        }))
    };

    const hasData = data.some(dataset => dataset.data.some(value => value > 0));
    
    if (!hasData) {
        return (
            <div className="w-full h-full bg-gray-900/30 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <p className="text-gray-400 font-medium">No data available for this period</p>
            </div>
        );
    }

    return (
        <div className="h-full">
            <Line options={options} data={enhancedData} />
        </div>
    );
} 