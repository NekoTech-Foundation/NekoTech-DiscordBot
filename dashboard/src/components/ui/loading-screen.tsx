import { motion } from 'framer-motion'

export function LoadingScreen() {
    return (
        <div className="fixed inset-0 bg-black flex items-center justify-center">
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="text-center"
            >
                <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mb-4" />
                <h2 className="text-xl font-semibold text-gray-200">Loading...</h2>
            </motion.div>
        </div>
    )
} 