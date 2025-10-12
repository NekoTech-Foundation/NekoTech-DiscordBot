export function formatResponseTime(minutes: number): string {
    if (minutes === 0) return '0m'
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = minutes % 60
    if (hours === 0) return `${remainingMinutes}m`
    return `${hours}h ${remainingMinutes}m`
} 