import React from 'react'
import { motion } from 'framer-motion'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { useSearchParams } from 'react-router-dom'
import { auth } from '../../lib/auth/auth'

const ERROR_MESSAGES = {
    insufficient_permissions: 'You don\'t have permission to access the dashboard. Please contact an administrator.',
    discord_error: 'There was an error with Discord authentication. Please try again.',
    no_code: 'No authentication code received. Please try again.',
    callback_error: 'There was an error during login. Please try again.',
    unknown_error: 'You don\'t have the required roles to access this dashboard. Please contact an administrator.',
    not_allowed: 'Access denied. You need specific roles to use this dashboard. Please contact an administrator.'
};

export default function SignInPage() {
    const [searchParams] = useSearchParams()
    const error = searchParams.get('error')

    const handleDiscordSignIn = () => {
        const returnUrl = searchParams.get('returnUrl')
        auth.login(returnUrl || undefined)
    }

    return (
        <div className="flex items-center justify-center h-screen bg-gradient-to-br from-background via-secondary to-secondary/80 text-foreground">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-md w-full bg-card/50 backdrop-blur-xl rounded-2xl p-8 shadow-lg border border-border"
            >
                <div>
                    <h2 className="text-3xl text-center font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/70">
                        Sign in to Dashboard
                    </h2>
                    <p className="mt-2 text-sm text-center text-muted-foreground">
                        Use your Discord account to access the dashboard
                    </p>
                    {error && ERROR_MESSAGES[error as keyof typeof ERROR_MESSAGES] && (
                        <div className="mt-4 p-4 bg-destructive/10 border border-destructive/20 rounded-2xl">
                            <p className="text-center text-sm text-destructive">
                                {ERROR_MESSAGES[error as keyof typeof ERROR_MESSAGES]}
                            </p>
                        </div>
                    )}
                </div>
                <div className="mt-8">
                    <button
                        onClick={handleDiscordSignIn}
                        className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-2xl text-white bg-[#5865F2] hover:bg-[#4752C4] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#5865F2] transition-colors duration-200"
                    >
                        <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                            <FontAwesomeIcon icon={faDiscord} className="h-5 w-5" />
                        </span>
                        Sign in with Discord
                    </button>
                </div>
            </motion.div>
        </div>
    )
} 